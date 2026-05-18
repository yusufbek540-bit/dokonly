"""
Seller-facing Mini App endpoints — authenticated via Telegram initData.
"""
import asyncio
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from uuid import UUID

import boto3
import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.core.auth import get_tg_user
from app.core.config import settings
from app.core.crypto import encrypt
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.product import Product, Category
from app.models.order import Cart, Order, OrderItem, Customer
from app.models.promo import PromoCode
from app.models.mailing import MassMailing
from app.schemas.tenant import TenantResponse
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.schemas.order import OrderStatusUpdate

router = APIRouter(prefix="/miniapp", tags=["miniapp"])


async def _enrich_orders(orders: list, db: AsyncSession) -> list[dict]:
    """Fetch order items and customer telegram_ids, return enriched dicts."""
    if not orders:
        return []
    order_ids = [o.id for o in orders]
    items_result = await db.execute(
        select(OrderItem).where(OrderItem.order_id.in_(order_ids))
    )
    items_by_order: dict = {}
    for item in items_result.scalars().all():
        items_by_order.setdefault(str(item.order_id), []).append({
            "id": str(item.id),
            "product_id": str(item.product_id) if item.product_id else None,
            "product_name": item.product_name,
            "price": float(item.price),
            "quantity": item.quantity,
            "subtotal": float(item.subtotal),
            "size": item.size,
            "color": item.color,
        })

    customer_ids = [o.customer_id for o in orders if o.customer_id]
    customers_by_id: dict = {}
    if customer_ids:
        cust_result = await db.execute(
            select(Customer).where(Customer.id.in_(customer_ids))
        )
        for c in cust_result.scalars().all():
            customers_by_id[str(c.id)] = c

    result = []
    for o in orders:
        customer = customers_by_id.get(str(o.customer_id)) if o.customer_id else None
        result.append({
            "id": str(o.id),
            "status": o.status,
            "payment_method": o.payment_method,
            "payment_status": o.payment_status,
            "subtotal": float(o.subtotal),
            "discount": float(o.discount),
            "total": float(o.total),
            "currency": o.currency,
            "customer_name": getattr(o, "customer_name", None),
            "customer_phone": getattr(o, "customer_phone", None),
            "customer_email": getattr(o, "customer_email", None),
            "customer_telegram_id": customer.telegram_id if customer else None,
            "delivery_address": getattr(o, "delivery_address", None),
            "delivery_type": getattr(o, "delivery_type", None),
            "customer_note": o.customer_note,
            "delivery_note": o.delivery_note,
            "seller_note": getattr(o, "seller_note", None),
            "meta": o.meta or {},
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items": items_by_order.get(str(o.id), []),
        })
    return result


async def _get_tenant(user: dict, db: AsyncSession) -> Tenant | None:
    result = await db.execute(select(Tenant).where(Tenant.owner_id == user["sub"]))
    return result.scalar_one_or_none()


async def _require_tenant(user: dict, db: AsyncSession) -> Tenant:
    tenant = await _get_tenant(user, db)
    if not tenant:
        raise HTTPException(status_code=404, detail="No store found — complete onboarding first")
    return tenant


# ---------------------------------------------------------------------------
# Auth / onboarding
# ---------------------------------------------------------------------------

@router.get("/me")
async def get_seller_me(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns current seller's tenant (or null if not onboarded yet)."""
    tenant = await _get_tenant(user, db)
    return {
        "tg_user": user["tg_user"],
        "tenant": tenant,
    }


@router.post("/onboard", response_model=TenantResponse, status_code=201)
async def onboard_seller(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new tenant from the onboarding wizard."""
    existing = await _get_tenant(user, db)
    if existing:
        raise HTTPException(400, "Store already exists")

    slug = body.get("slug", "").strip().lower()
    if not slug:
        raise HTTPException(400, "Slug is required")

    slug_taken = await db.execute(select(Tenant).where(Tenant.slug == slug))
    if slug_taken.scalar_one_or_none():
        raise HTTPException(400, "This URL is already taken")

    tenant = Tenant(
        owner_id=user["sub"],
        name=body.get("name", "My Store"),
        slug=slug,
        country=body.get("country", "UZ"),
        currency=body.get("currency", "UZS"),
        settings={
            "business_category": body.get("business_category", ""),
            "legal_status": body.get("legal_status", "individual"),
            "description": body.get("description", ""),
            "owner_tg_id": str(user["tg_user"].get("id", "")),
        },
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.post("/setup-bot")
async def setup_bot(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Merchant submits their bot token (obtained from @BotFather).
    1. Validate token via Telegram getMe
    2. Encrypt + store token, save bot_username and bot_token_hash
    3. Register webhook on merchant's bot
    4. Set Mini App URL as menu button on merchant's bot
    """
    tenant = await _require_tenant(user, db)

    raw_token = body.get("bot_token", "").strip()
    if not raw_token or ":" not in raw_token:
        raise HTTPException(400, "Invalid bot token format")

    async with httpx.AsyncClient(timeout=10) as client:
        # 1. Validate token
        me_resp = await client.get(f"https://api.telegram.org/bot{raw_token}/getMe")
        if me_resp.status_code != 200 or not me_resp.json().get("ok"):
            raise HTTPException(400, "Invalid bot token — Telegram rejected it")
        bot_info = me_resp.json()["result"]
        bot_username = bot_info["username"]

        # 2. Persist: encrypt token, store hash for webhook routing
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        tenant.bot_token_enc = encrypt(raw_token)
        tenant.bot_token_hash = token_hash
        tenant.bot_username = bot_username
        await db.commit()

        mini_app_url = f"{settings.miniapp_url}?shop={tenant.slug}"

        # 3 & 4. Register webhook + set menu button in parallel — failures are non-fatal
        async def _set_webhook():
            if not settings.webhook_base_url:
                return
            webhook_url = f"{settings.webhook_base_url}/api/v1/webhook/merchant/{token_hash}"
            try:
                await client.post(
                    f"https://api.telegram.org/bot{raw_token}/setWebhook",
                    json={"url": webhook_url, "allowed_updates": ["message", "callback_query", "pre_checkout_query", "successful_payment"]},
                )
            except Exception:
                pass

        async def _set_menu_button():
            try:
                await client.post(
                    f"https://api.telegram.org/bot{raw_token}/setChatMenuButton",
                    json={"menu_button": {"type": "web_app", "text": "Открыть магазин", "web_app": {"url": mini_app_url}}},
                )
            except Exception:
                pass

        await asyncio.gather(_set_webhook(), _set_menu_button())

    return {"ok": True, "bot_username": bot_username, "mini_app_url": mini_app_url}


@router.patch("/settings", response_model=TenantResponse)
async def update_tenant_settings(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Update tenant settings: theme (typography, accent color), channel config, store profile."""
    tenant = await _require_tenant(user, db)

    # Fields that live inside settings JSONB
    settings_keys = [
        "layout", "channel_username", "channel_subscription_gate",
        "delivery_methods", "payment_methods", "notify_group_chat_id",
        "owner_tg_id",
        "transfer_card_number", "transfer_card_holder",
        "min_order_amount", "required_checkout_fields", "order_confirmation_message",
        "return_policy",
    ]
    settings_update = {k: body[k] for k in settings_keys if k in body}
    if settings_update:
        tenant.settings = {**(tenant.settings or {}), **settings_update}

    # Top-level tenant columns
    if "name" in body:
        tenant.name = body["name"]
    if "description" in body:
        tenant.description = body["description"]
    if "logo_url" in body:
        tenant.logo_url = body["logo_url"]
    if "cover_url" in body:
        tenant.cover_url = body["cover_url"]
    if "accent_color" in body:
        tenant.accent_color = body["accent_color"]
    if "typography_bundle" in body:
        tenant.typography_bundle = body["typography_bundle"]
    if "contact_info" in body:
        tenant.contact_info = {**(tenant.contact_info or {}), **body["contact_info"]}

    await db.commit()
    await db.refresh(tenant)
    return tenant


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@router.get("/categories")
async def seller_list_categories(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Category).where(Category.tenant_id == tenant.id).order_by(Category.sort_order)
    )
    return result.scalars().all()


@router.post("/categories", status_code=201)
async def seller_create_category(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Category name is required")

    # Generate slug from name
    import re
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or "category"
    # Ensure slug is unique for this tenant
    existing = await db.execute(
        select(Category).where(Category.tenant_id == tenant.id, Category.slug == slug)
    )
    if existing.scalar_one_or_none():
        import uuid as _uuid
        slug = slug + '-' + str(_uuid.uuid4())[:8]

    # Sort order = max + 1
    max_order_result = await db.execute(
        select(func.max(Category.sort_order)).where(Category.tenant_id == tenant.id)
    )
    max_order = max_order_result.scalar() or 0

    category = Category(
        tenant_id=tenant.id,
        name=name,
        slug=slug,
        sort_order=max_order + 1,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=204)
async def seller_delete_category(
    category_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.tenant_id == tenant.id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(404, "Category not found")
    await db.delete(category)
    await db.commit()


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------

@router.get("/products")
async def seller_list_products(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Product, Category.name.label("category_name"))
        .outerjoin(Category, Product.category_id == Category.id)
        .where(Product.tenant_id == tenant.id)
        .order_by(Product.sort_order)
    )
    rows = result.all()
    out = []
    for p, category_name in rows:
        meta = p.meta or {}
        out.append({
            "id": str(p.id),
            "tenant_id": str(p.tenant_id),
            "name": p.name,
            "description": p.description,
            "price": float(p.price),
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
            "currency": p.currency,
            "stock": p.stock,
            "sku": p.sku,
            "images": p.images or [],
            "is_active": p.is_active,
            "sort_order": p.sort_order,
            "category_id": str(p.category_id) if p.category_id else None,
            "category": category_name,
            "sizes": meta.get("sizes", []),
            "colors": meta.get("colors", []),
            "is_featured": meta.get("is_featured", False),
            "video_url": p.video_url,
        })
    return out


@router.post("/products", response_model=ProductResponse, status_code=201)
async def seller_create_product(
    body: ProductCreate,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    data = body.model_dump()
    sizes = data.pop("sizes", [])
    colors = data.pop("colors", [])
    is_featured = data.pop("is_featured", False)
    meta = {}
    if sizes:
        meta["sizes"] = sizes
    if colors:
        meta["colors"] = colors
    if is_featured:
        meta["is_featured"] = is_featured
    product = Product(**data, tenant_id=tenant.id, meta=meta)  # video_url passed through via **data
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def seller_update_product(
    product_id: UUID,
    body: ProductUpdate,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    update_data = body.model_dump(exclude_unset=True)
    sizes = update_data.pop("sizes", None)
    colors = update_data.pop("colors", None)
    is_featured = update_data.pop("is_featured", None)
    for k, v in update_data.items():
        setattr(product, k, v)
    if sizes is not None or colors is not None or is_featured is not None:
        current_meta = dict(product.meta or {})
        if sizes is not None:
            current_meta["sizes"] = sizes
        if colors is not None:
            current_meta["colors"] = colors
        if is_featured is not None:
            current_meta["is_featured"] = is_featured
        product.meta = current_meta
    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204)
async def seller_delete_product(
    product_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    await db.delete(product)
    await db.commit()


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

@router.get("/orders")
async def seller_list_orders(
    status: str | None = None,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    query = select(Order).where(Order.tenant_id == tenant.id).order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    result = await db.execute(query)
    orders = result.scalars().all()
    return await _enrich_orders(orders, db)


@router.patch("/orders/{order_id}/status")
async def seller_update_order_status(
    order_id: UUID,
    body: OrderStatusUpdate,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == tenant.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    old_status = order.status
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(order, k, v)
    await db.commit()
    await db.refresh(order)

    # Notify buyer on status change via merchant's own bot
    if order.status != old_status and order.customer_id:
        try:
            from app.core.crypto import decrypt
            cust_result = await db.execute(
                select(Customer).where(Customer.id == order.customer_id)
            )
            customer = cust_result.scalar_one_or_none()
            bot_token = None
            if tenant.bot_token_enc:
                try:
                    bot_token = decrypt(tenant.bot_token_enc)
                except Exception:
                    pass
            bot_token = bot_token or settings.telegram_bot_token
            if customer and customer.telegram_id and bot_token:
                STATUS_MSG = {
                    "confirmed": "✅ Ваш заказ подтверждён!",
                    "shipping":  "🚚 Ваш заказ в пути!",
                    "delivered": "🎉 Ваш заказ доставлен!",
                    "cancelled": "❌ Ваш заказ отменён.",
                }
                msg = STATUS_MSG.get(order.status)
                if msg:
                    order_short = str(order.id)[:8].upper()
                    text = f"{msg}\n\nЗаказ *#{order_short}* · {tenant.name}"
                    async with httpx.AsyncClient(timeout=5) as client:
                        await client.post(
                            f"https://api.telegram.org/bot{bot_token}/sendMessage",
                            json={"chat_id": customer.telegram_id, "text": text, "parse_mode": "Markdown"},
                        )
        except Exception:
            pass  # Non-fatal

    enriched = await _enrich_orders([order], db)
    return enriched[0]


# ---------------------------------------------------------------------------
# Analytics summary
# ---------------------------------------------------------------------------

@router.get("/analytics/summary")
async def seller_analytics_summary(
    period: str = Query("all", description="Filter period: today, week, month, all"),
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    orders_q = await db.execute(select(Order).where(Order.tenant_id == tenant.id))
    all_orders_raw = orders_q.scalars().all()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    period_start = {
        "today": today_start,
        "week": now - timedelta(days=7),
        "month": now - timedelta(days=30),
    }.get(period)

    if period_start:
        all_orders = [
            o for o in all_orders_raw
            if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= period_start
        ]
    else:
        all_orders = all_orders_raw

    total_revenue = sum(float(o.total or 0) for o in all_orders)
    total_orders = len(all_orders)
    new_orders = sum(1 for o in all_orders if o.status == "new")

    today_orders_list = [o for o in all_orders if o.created_at and o.created_at.replace(tzinfo=timezone.utc) >= today_start]
    yesterday_orders_list = [o for o in all_orders if o.created_at and yesterday_start <= o.created_at.replace(tzinfo=timezone.utc) < today_start]

    today_revenue = sum(float(o.total or 0) for o in today_orders_list)
    today_orders_count = len(today_orders_list)
    yesterday_revenue = sum(float(o.total or 0) for o in yesterday_orders_list)
    yesterday_orders_count = len(yesterday_orders_list)

    products_q = await db.execute(
        select(func.count()).select_from(Product).where(Product.tenant_id == tenant.id)
    )
    product_count = products_q.scalar() or 0

    # Inventory insights
    active_products_q = await db.execute(
        select(Product).where(Product.tenant_id == tenant.id, Product.is_active == True)
    )
    active_products = active_products_q.scalars().all()
    low_stock_count = sum(1 for p in active_products if p.stock is not None and 0 < p.stock <= 5)
    out_of_stock_count = sum(1 for p in active_products if p.stock is not None and p.stock == 0)
    no_images_count = sum(1 for p in active_products if not p.images or len(p.images) == 0)
    no_description_count = sum(1 for p in active_products if not p.description or not p.description.strip())

    # Orders pending too long (status='new' for 2+ days)
    two_days_ago = now - timedelta(days=2)
    pending_too_long_count = sum(
        1 for o in all_orders
        if o.status == "new" and o.created_at and o.created_at.replace(tzinfo=timezone.utc) <= two_days_ago
    )

    # Top products by revenue from order items
    items_q = await db.execute(
        select(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .where(Order.tenant_id == tenant.id)
    )
    all_items = items_q.scalars().all()

    product_revenue: dict[str, dict] = {}
    for item in all_items:
        key = str(item.product_id) if item.product_id else item.product_name
        if key not in product_revenue:
            product_revenue[key] = {
                "product_id": str(item.product_id) if item.product_id else None,
                "name": item.product_name,
                "revenue": 0.0,
                "orders": 0,
                "qty": 0,
            }
        product_revenue[key]["revenue"] += float(item.subtotal or 0)
        product_revenue[key]["orders"] += 1
        product_revenue[key]["qty"] += item.quantity or 1

    top_products = sorted(product_revenue.values(), key=lambda x: x["revenue"], reverse=True)[:5]

    # Customer stats
    customer_q = await db.execute(
        select(Customer).where(Customer.tenant_id == tenant.id)
    )
    all_customers = customer_q.scalars().all()
    customer_count = len(all_customers)

    # New customers this week
    week_ago = now - timedelta(days=7)
    new_customers_week = sum(
        1 for c in all_customers
        if c.created_at and c.created_at.replace(tzinfo=timezone.utc) >= week_ago
    )

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "new_orders": new_orders,
        "product_count": product_count,
        "today_revenue": today_revenue,
        "today_orders": today_orders_count,
        "yesterday_revenue": yesterday_revenue,
        "yesterday_orders": yesterday_orders_count,
        "currency": tenant.currency,
        "top_products": top_products,
        "customer_count": customer_count,
        "new_customers_week": new_customers_week,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "no_images_count": no_images_count,
        "no_description_count": no_description_count,
        "pending_too_long_count": pending_too_long_count,
    }


# ---------------------------------------------------------------------------
# Achievements
# ---------------------------------------------------------------------------

ACHIEVEMENTS = [
    # Milestones - Onboarding
    {"id": "first_sale", "category": "milestone", "icon": "🎯", "name_ru": "Первая продажа", "desc_ru": "Поздравляем с первым заказом! Это начало большого пути.", "condition_type": "order_count", "threshold": 1, "tier": "bronze"},
    {"id": "first_customer", "category": "milestone", "icon": "👋", "name_ru": "Первый клиент", "desc_ru": "У вашего магазина появился первый покупатель.", "condition_type": "customer_count", "threshold": 1, "tier": "bronze"},
    {"id": "catalog_builder_10", "category": "milestone", "icon": "📷", "name_ru": "Каталогист", "desc_ru": "Добавили 10 товаров в каталог. Хорошее начало!", "condition_type": "product_count", "threshold": 10, "tier": "bronze"},
    {"id": "catalog_builder_50", "category": "milestone", "icon": "📚", "name_ru": "Управляющий ассортиментом", "desc_ru": "Каталог из 50 товаров — это серьёзная заявка.", "condition_type": "product_count", "threshold": 50, "tier": "silver"},
    # Milestones - Volume
    {"id": "orders_10", "category": "milestone", "icon": "🚀", "name_ru": "Набираем обороты", "desc_ru": "10 заказов! Бизнес растёт.", "condition_type": "order_count", "threshold": 10, "tier": "bronze"},
    {"id": "orders_50", "category": "milestone", "icon": "🌟", "name_ru": "50 заказов", "desc_ru": "Полусотня — серьёзная отметка!", "condition_type": "order_count", "threshold": 50, "tier": "silver"},
    {"id": "orders_100", "category": "milestone", "icon": "💯", "name_ru": "Сотня", "desc_ru": "100 заказов — вы настоящий предприниматель.", "condition_type": "order_count", "threshold": 100, "tier": "silver"},
    {"id": "orders_500", "category": "milestone", "icon": "🏆", "name_ru": "500 заказов", "desc_ru": "Ты в топе! 500 выполненных заказов.", "condition_type": "order_count", "threshold": 500, "tier": "gold"},
    # Revenue milestones (UZS)
    {"id": "revenue_1m", "category": "milestone", "icon": "💰", "name_ru": "Первый миллион", "desc_ru": "Ваш магазин заработал 1 000 000 UZS!", "condition_type": "revenue", "threshold": 1000000, "tier": "bronze"},
    {"id": "revenue_10m", "category": "milestone", "icon": "💎", "name_ru": "10 миллионов", "desc_ru": "Выручка 10 000 000 UZS. Впечатляет!", "condition_type": "revenue", "threshold": 10000000, "tier": "silver"},
    {"id": "revenue_100m", "category": "milestone", "icon": "👑", "name_ru": "Сотня миллионов", "desc_ru": "100 000 000 UZS выручки — вы в числе лидеров.", "condition_type": "revenue", "threshold": 100000000, "tier": "gold"},
    # Customers
    {"id": "customers_10", "category": "milestone", "icon": "👥", "name_ru": "Первые 10 клиентов", "desc_ru": "У вас уже 10 покупателей!", "condition_type": "customer_count", "threshold": 10, "tier": "bronze"},
    {"id": "customers_100", "category": "milestone", "icon": "🌍", "name_ru": "100 клиентов", "desc_ru": "Сотня покупателей доверяет вашему магазину.", "condition_type": "customer_count", "threshold": 100, "tier": "silver"},
    # Feature Adoption
    {"id": "style_set", "category": "feature", "icon": "🎨", "name_ru": "Стилист", "desc_ru": "Настроили внешний вид магазина — теперь он отражает ваш бренд.", "condition_type": "storefront_theme_configured", "threshold": 1, "tier": "bronze"},
    {"id": "photo_upload", "category": "feature", "icon": "📸", "name_ru": "Фотограф", "desc_ru": "Загрузили фото для товара.", "condition_type": "product_count", "threshold": 1, "tier": "bronze"},
    {"id": "bot_connected", "category": "feature", "icon": "🤖", "name_ru": "Ботовод", "desc_ru": "Подключили Telegram-бот магазина.", "condition_type": "bot_connected", "threshold": 1, "tier": "bronze"},
    {"id": "delivery_configured", "category": "feature", "icon": "🚚", "name_ru": "Логист", "desc_ru": "Настроили способы доставки.", "condition_type": "delivery_configured", "threshold": 1, "tier": "bronze"},
    {"id": "payment_configured", "category": "feature", "icon": "💳", "name_ru": "Кассир", "desc_ru": "Настроили способы оплаты.", "condition_type": "payment_configured", "threshold": 1, "tier": "bronze"},
    {"id": "catalog_builder_100", "category": "milestone", "icon": "🗂", "name_ru": "Большой каталог", "desc_ru": "100 товаров в каталоге — вы серьёзный игрок.", "condition_type": "product_count", "threshold": 100, "tier": "gold"},
    {"id": "catalog_builder_250", "category": "milestone", "icon": "📦", "name_ru": "Склад", "desc_ru": "250 товаров — полноценный интернет-магазин.", "condition_type": "product_count", "threshold": 250, "tier": "gold"},
    # Engagement streaks (simplified - just days since creation)
    {"id": "week_streak", "category": "streak", "icon": "🔥", "name_ru": "7 дней", "desc_ru": "Магазин открыт уже неделю!", "condition_type": "days_since_created", "threshold": 7, "tier": "bronze"},
    {"id": "month_streak", "category": "streak", "icon": "📅", "name_ru": "Месяц работы", "desc_ru": "30 дней с вами — спасибо, что выбрали Dokonly!", "condition_type": "days_since_created", "threshold": 30, "tier": "silver"},
    {"id": "quarter_streak", "category": "streak", "icon": "🗓", "name_ru": "3 месяца", "desc_ru": "Квартал продаж позади — вы в строю!", "condition_type": "days_since_created", "threshold": 90, "tier": "gold"},
    {"id": "year_streak", "category": "streak", "icon": "🎂", "name_ru": "Год с Dokonly", "desc_ru": "Целый год! Вы настоящий партнёр.", "condition_type": "days_since_created", "threshold": 365, "tier": "gold"},
    # Community
    {"id": "share_first", "category": "community", "icon": "📢", "name_ru": "Первая огласка", "desc_ru": "Поделились ссылкой на магазин.", "condition_type": "order_count", "threshold": 5, "tier": "bronze"},
    {"id": "return_customer", "category": "community", "icon": "🔄", "name_ru": "Постоянный покупатель", "desc_ru": "У вас есть покупатель с повторным заказом.", "condition_type": "order_count", "threshold": 2, "tier": "bronze"},
    {"id": "orders_1000", "category": "milestone", "icon": "🌠", "name_ru": "1000 заказов", "desc_ru": "Тысяча! Вы — легенда Dokonly.", "condition_type": "order_count", "threshold": 1000, "tier": "gold"},
    {"id": "customers_500", "category": "milestone", "icon": "🏙", "name_ru": "500 клиентов", "desc_ru": "Ваш магазин знают 500 человек!", "condition_type": "customer_count", "threshold": 500, "tier": "gold"},
    {"id": "revenue_500m", "category": "milestone", "icon": "🚀", "name_ru": "500 миллионов", "desc_ru": "Полмиллиарда UZS выручки — элита.", "condition_type": "revenue", "threshold": 500000000, "tier": "gold"},
    {"id": "onboarding_complete", "category": "feature", "icon": "✅", "name_ru": "Готов к старту", "desc_ru": "Заполнили профиль и настроили магазин.", "condition_type": "product_count", "threshold": 1, "tier": "bronze"},
]


@router.get("/streak")
async def seller_streak(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    orders_q = await db.execute(
        select(Order.created_at)
        .where(Order.tenant_id == tenant.id, Order.created_at >= thirty_days_ago)
        .order_by(Order.created_at.asc())
    )
    order_dates = orders_q.scalars().all()

    # Build set of dates (local dates as ISO strings) that had orders
    days_with_orders: set[str] = set()
    for dt in order_dates:
        if dt:
            d = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
            days_with_orders.add(d.strftime("%Y-%m-%d"))

    # Build last-30-days calendar
    calendar: list[dict] = []
    for i in range(29, -1, -1):
        day = now - timedelta(days=i)
        iso = day.strftime("%Y-%m-%d")
        calendar.append({"date": iso, "has_orders": iso in days_with_orders})

    # Compute current streak (consecutive days ending today or yesterday with orders)
    current_streak = 0
    today_iso = now.strftime("%Y-%m-%d")
    if today_iso not in days_with_orders:
        yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        start_day = now - timedelta(days=1) if yesterday in days_with_orders else None
    else:
        start_day = now
    if start_day is not None:
        check = start_day
        while True:
            iso = check.strftime("%Y-%m-%d")
            if iso in days_with_orders:
                current_streak += 1
                check = check - timedelta(days=1)
            else:
                break

    # Best streak (within last 30 days)
    best_streak = 0
    run = 0
    for entry in calendar:
        if entry["has_orders"]:
            run += 1
            best_streak = max(best_streak, run)
        else:
            run = 0

    today_at_risk = today_iso not in days_with_orders and current_streak > 0

    return {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "today_at_risk": today_at_risk,
        "calendar": calendar,
    }


@router.get("/achievements")
async def seller_achievements(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)

    # Fetch counts from DB
    order_count_q = await db.execute(
        select(func.count(Order.id)).where(Order.tenant_id == tenant.id)
    )
    total_orders = order_count_q.scalar() or 0

    product_count_q = await db.execute(
        select(func.count(Product.id)).where(Product.tenant_id == tenant.id)
    )
    total_products = product_count_q.scalar() or 0

    customer_count_q = await db.execute(
        select(func.count(func.distinct(Order.customer_telegram_id))).where(
            Order.tenant_id == tenant.id,
            Order.customer_telegram_id.isnot(None),
        )
    )
    total_customers = customer_count_q.scalar() or 0

    revenue_q = await db.execute(
        select(func.sum(Order.total)).where(
            Order.tenant_id == tenant.id,
            Order.status.in_(["completed", "delivered"]),
        )
    )
    total_revenue = float(revenue_q.scalar() or 0)

    # Compute condition values
    now = datetime.now(timezone.utc)
    created_at = tenant.created_at
    if created_at is not None and created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    days_since_created = (now - created_at).days if created_at else 0

    storefront_theme_configured = (
        tenant.accent_color is not None or tenant.typography_bundle is not None
    )
    bot_connected = tenant.bot_username is not None
    tenant_settings = tenant.settings or {}
    delivery_configured = bool(tenant_settings.get("delivery_methods"))
    payment_configured = bool(tenant_settings.get("payment_methods"))

    numeric_progress: dict[str, int | float] = {
        "order_count": total_orders,
        "customer_count": total_customers,
        "product_count": total_products,
        "revenue": total_revenue,
        "days_since_created": days_since_created,
    }
    bool_progress: dict[str, bool] = {
        "storefront_theme_configured": storefront_theme_configured,
        "bot_connected": bot_connected,
        "delivery_configured": delivery_configured,
        "payment_configured": payment_configured,
    }

    def _compute(achievement: dict) -> tuple[bool, int | float | None, int | float | None]:
        ctype = achievement["condition_type"]
        threshold = achievement["threshold"]
        if ctype in numeric_progress:
            current = numeric_progress[ctype]
            return current >= threshold, current, threshold
        if ctype in bool_progress:
            v = bool_progress[ctype]
            return v, None, None
        return False, None, None

    result = []
    for a in ACHIEVEMENTS:
        unlocked, current, target = _compute(a)
        entry: dict = {
            "id": a["id"],
            "category": a["category"],
            "icon": a["icon"],
            "name_ru": a["name_ru"],
            "desc_ru": a["desc_ru"],
            "tier": a["tier"],
            "unlocked": unlocked,
        }
        if not unlocked and current is not None and target is not None:
            entry["progress"] = current
            entry["target"] = target
        result.append(entry)
    unlocked_count = sum(1 for r in result if r["unlocked"])
    return {
        "achievements": result,
        "unlocked_count": unlocked_count,
        "total_count": len(ACHIEVEMENTS),
    }


# ---------------------------------------------------------------------------
# Promo codes (seller management)
# ---------------------------------------------------------------------------

@router.get("/promo-codes")
async def list_promo_codes(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(PromoCode)
        .where(PromoCode.tenant_id == tenant.id)
        .order_by(PromoCode.created_at.desc())
    )
    codes = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "code": c.code,
            "discount_type": c.discount_type,
            "discount_value": float(c.discount_value),
            "max_uses": c.max_uses,
            "used_count": c.used_count,
            "min_order_amount": float(c.min_order_amount) if c.min_order_amount else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "applicable_product_ids": c.applicable_product_ids or [],
            "is_active": c.is_active,
        }
        for c in codes
    ]


@router.post("/promo-codes", status_code=201)
async def create_promo_code(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.exc import IntegrityError
    tenant = await _require_tenant(user, db)
    code = str(body.get("code", "")).upper().strip()
    if not code:
        raise HTTPException(400, "code required")
    from datetime import datetime, timezone as _tz
    expires_raw = body.get("expires_at")
    expires_dt = None
    if expires_raw:
        try:
            expires_dt = datetime.fromisoformat(expires_raw).replace(tzinfo=_tz.utc) if 'T' not in expires_raw else datetime.fromisoformat(expires_raw)
        except Exception:
            pass
    applicable_ids = body.get("applicable_product_ids") or None
    if applicable_ids and not isinstance(applicable_ids, list):
        applicable_ids = None
    promo = PromoCode(
        tenant_id=tenant.id,
        code=code,
        discount_type=body.get("discount_type", "percent"),
        discount_value=float(body.get("discount_value", 0)),
        max_uses=body.get("max_uses") or None,
        min_order_amount=float(body["min_order_amount"]) if body.get("min_order_amount") else None,
        expires_at=expires_dt,
        applicable_product_ids=applicable_ids,
    )
    db.add(promo)
    try:
        await db.commit()
        await db.refresh(promo)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(400, "Код уже существует")
    return {"id": str(promo.id), "code": promo.code}


@router.delete("/promo-codes/{code_id}", status_code=204)
async def delete_promo_code(
    code_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(PromoCode).where(PromoCode.id == code_id, PromoCode.tenant_id == tenant.id)
    )
    promo = result.scalar_one_or_none()
    if promo:
        await db.delete(promo)
        await db.commit()


# ---------------------------------------------------------------------------
# Mass mailings
# ---------------------------------------------------------------------------

@router.get("/mailings")
async def list_mailings(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(MassMailing)
        .where(MassMailing.tenant_id == tenant.id)
        .order_by(MassMailing.created_at.desc())
    )
    mailings = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "title": m.title,
            "text": m.text,
            "image_url": m.image_url,
            "status": m.status,
            "recipient_count": m.recipient_count,
            "sent_count": m.sent_count,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in mailings
    ]


@router.post("/mailings", status_code=201)
async def create_mailing(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    title = body.get("title", "").strip()
    text = body.get("text", "").strip()
    if not title or not text:
        raise HTTPException(400, "title and text are required")

    mailing = MassMailing(
        tenant_id=tenant.id,
        title=title,
        text=text,
        image_url=body.get("image_url"),
        status="draft",
    )
    db.add(mailing)
    await db.commit()
    await db.refresh(mailing)
    return {"id": str(mailing.id), "status": mailing.status}


@router.post("/mailings/{mailing_id}/send", status_code=200)
async def send_mailing(
    mailing_id: str,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Fire mailing to all customers with known telegram_id."""
    tenant = await _require_tenant(user, db)

    result = await db.execute(
        select(MassMailing).where(
            MassMailing.id == mailing_id,
            MassMailing.tenant_id == tenant.id,
        )
    )
    mailing = result.scalar_one_or_none()
    if not mailing:
        raise HTTPException(404, "Mailing not found")
    if mailing.status not in ("draft", "failed"):
        raise HTTPException(400, "Already sent or sending")

    # Count eligible customers
    cust_result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant.id,
            Customer.telegram_id.isnot(None),
        )
    )
    customers = cust_result.scalars().all()
    if not customers:
        raise HTTPException(400, "No customers to send to")

    mailing.status = "sending"
    mailing.recipient_count = len(customers)
    await db.commit()

    # Resolve merchant's bot token (fall back to master bot)
    from app.core.crypto import decrypt as _decrypt
    bot_token = None
    if tenant.bot_token_enc:
        try:
            bot_token = _decrypt(tenant.bot_token_enc)
        except Exception:
            pass
    bot_token = bot_token or settings.telegram_bot_token
    if not bot_token:
        mailing.status = "failed"
        await db.commit()
        raise HTTPException(503, "Bot token not configured")

    # Send asynchronously (non-blocking fire-and-forget)
    msg_text = mailing.text
    img_url = mailing.image_url
    mailing_db_id = str(mailing.id)
    tg_ids = [c.telegram_id for c in customers]

    async def _do_send():
        sent = 0
        async with httpx.AsyncClient(timeout=10) as client:
            for tg_id in tg_ids:
                try:
                    if img_url:
                        await client.post(
                            f"https://api.telegram.org/bot{bot_token}/sendPhoto",
                            json={"chat_id": tg_id, "photo": img_url, "caption": msg_text, "parse_mode": "Markdown"},
                        )
                    else:
                        await client.post(
                            f"https://api.telegram.org/bot{bot_token}/sendMessage",
                            json={"chat_id": tg_id, "text": msg_text, "parse_mode": "Markdown"},
                        )
                    sent += 1
                    await asyncio.sleep(0.05)  # Telegram rate limit: ~20 msg/s
                except Exception:
                    pass
        # Update status after all sends
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as sess:
            r = await sess.execute(select(MassMailing).where(MassMailing.id == mailing_db_id))
            m = r.scalar_one_or_none()
            if m:
                m.status = "sent"
                m.sent_count = sent
                await sess.commit()

    asyncio.create_task(_do_send())
    return {"status": "sending", "recipient_count": len(tg_ids)}


@router.delete("/mailings/{mailing_id}", status_code=204)
async def delete_mailing(
    mailing_id: str,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(MassMailing).where(
            MassMailing.id == mailing_id,
            MassMailing.tenant_id == tenant.id,
        )
    )
    mailing = result.scalar_one_or_none()
    if mailing:
        await db.delete(mailing)
        await db.commit()


# ---------------------------------------------------------------------------
# Abandoned carts
# ---------------------------------------------------------------------------


@router.get("/abandoned-carts")
async def list_abandoned_carts(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Cart)
        .where(Cart.tenant_id == tenant.id, Cart.abandoned == True, Cart.recovered == False)  # noqa: E712
        .order_by(Cart.abandoned_at.desc())
        .limit(50)
    )
    carts = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "customer_name": c.customer_name or "Покупатель",
            "telegram_user_id": c.telegram_user_id,
            "items": c.items or [],
            "total_amount": float(c.total_amount) if c.total_amount else None,
            "abandoned_at": c.abandoned_at.isoformat() if c.abandoned_at else None,
            "recovery_sent_at": c.recovery_sent_at.isoformat() if c.recovery_sent_at else None,
        }
        for c in carts
    ]


@router.post("/abandoned-carts/{cart_id}/remind", status_code=200)
async def send_abandoned_cart_reminder(
    cart_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from app.core.bot_utils import get_tenant_bot
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Cart).where(Cart.id == cart_id, Cart.tenant_id == tenant.id)
    )
    cart = result.scalar_one_or_none()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    from app.bot.setup import bot as master_bot
    tenant_bot = await get_tenant_bot(tenant.id)
    bot_to_use = tenant_bot or master_bot
    try:
        await bot_to_use.send_message(
            chat_id=cart.telegram_user_id,
            text="🛒 Продавец напоминает: в вашей корзине есть товары!\n\nОформите заказ прямо сейчас.",
        )
        cart.recovery_sent_at = datetime.now(timezone.utc)
        await db.commit()
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to send message")
    finally:
        if tenant_bot:
            await tenant_bot.session.close()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Media upload
# ---------------------------------------------------------------------------

MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB (covers product videos)


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an image to Cloudflare R2 and return its public URL."""
    tenant = await _require_tenant(user, db)

    if not file.content_type or (
        not file.content_type.startswith("image/") and not file.content_type.startswith("video/")
    ):
        raise HTTPException(status_code=400, detail="Only image or video files are allowed")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    ext = (file.filename or "").rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    key = f"products/{tenant.id}/{uuid.uuid4()}.{ext}"

    def _upload():
        s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.cloudflare_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
        )
        s3.put_object(
            Bucket=settings.r2_bucket_name,
            Key=key,
            Body=contents,
            ContentType=file.content_type,
        )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _upload)

    public_url = f"{settings.r2_public_url.rstrip('/')}/{key}"
    return {"url": public_url}


# ---------------------------------------------------------------------------
# Viral analytics
# ---------------------------------------------------------------------------


@router.get("/analytics/viral")
async def seller_viral_analytics(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)
    return {"top_shared": [], "share_to_order_rate": 0, "top_sharers": []}


# ---------------------------------------------------------------------------
# Stories (seller-created)
# ---------------------------------------------------------------------------


@router.get("/stories")
async def list_stories(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = tenant.settings or {}
    return settings_data.get("stories", [])


@router.post("/stories", status_code=201)
async def create_story(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    stories = list(settings_data.get("stories", []))
    new_story = {
        "id": str(uuid.uuid4()),
        "image_url": body.get("image_url", ""),
        "title": body.get("title", ""),
        "product_id": body.get("product_id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    stories.append(new_story)
    settings_data["stories"] = stories
    tenant.settings = settings_data
    await db.commit()
    return new_story


@router.delete("/stories/{story_id}", status_code=204)
async def delete_story(
    story_id: str,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    stories = [s for s in settings_data.get("stories", []) if s.get("id") != story_id]
    settings_data["stories"] = stories
    tenant.settings = settings_data
    await db.commit()


# ---------------------------------------------------------------------------
# Team management (stub — stores in tenant settings)
# ---------------------------------------------------------------------------


@router.get("/team")
async def list_team(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    return (tenant.settings or {}).get("team_members", [])


@router.post("/team/invite", status_code=201)
async def invite_team_member(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    members = list(settings_data.get("team_members", []))
    member = {
        "id": str(uuid.uuid4()),
        "username": body.get("username", ""),
        "role": body.get("role", "staff"),
        "notifications": {"new_orders": True, "payment_failures": True, "low_stock": False, "daily_summary": False},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    members.append(member)
    settings_data["team_members"] = members
    tenant.settings = settings_data
    await db.commit()
    return member


@router.delete("/team/{member_id}", status_code=204)
async def remove_team_member(
    member_id: str,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    members = [m for m in settings_data.get("team_members", []) if m.get("id") != member_id]
    settings_data["team_members"] = members
    tenant.settings = settings_data
    await db.commit()


@router.patch("/team/{member_id}/notifications")
async def update_team_member_notifications(
    member_id: str,
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    members = settings_data.get("team_members", [])
    for m in members:
        if m.get("id") == member_id:
            m["notifications"] = {**m.get("notifications", {}), **body}
    settings_data["team_members"] = members
    tenant.settings = settings_data
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Channel crossposting
# ---------------------------------------------------------------------------


@router.get("/channel-posts")
async def list_channel_posts(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    return (tenant.settings or {}).get("channel_posts", [])


@router.post("/channel-posts", status_code=201)
async def create_channel_post(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from app.core.bot_utils import get_tenant_bot
    tenant = await _require_tenant(user, db)
    channel_username = (tenant.settings or {}).get("channel_username")
    text = body.get("text", "")
    photo_url = body.get("photo_url")
    if not channel_username:
        raise HTTPException(400, "No channel configured")
    tenant_bot = await get_tenant_bot(tenant.id)
    if not tenant_bot:
        raise HTTPException(400, "Merchant bot not configured")
    try:
        if photo_url:
            await tenant_bot.send_photo(chat_id=channel_username, photo=photo_url, caption=text, parse_mode="HTML")
        else:
            await tenant_bot.send_message(chat_id=channel_username, text=text, parse_mode="HTML")
    except Exception as e:
        raise HTTPException(502, f"Failed to post to channel: {e}")
    finally:
        await tenant_bot.session.close()
    post = {"id": str(uuid.uuid4()), "text": text, "photo_url": photo_url, "posted_at": datetime.now(timezone.utc).isoformat()}
    settings_data = dict(tenant.settings or {})
    posts = list(settings_data.get("channel_posts", []))
    posts.insert(0, post)
    settings_data["channel_posts"] = posts[:50]
    tenant.settings = settings_data
    await db.commit()
    return post


@router.post("/channel/verify-admin")
async def verify_channel_admin(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from app.core.bot_utils import get_tenant_bot
    tenant = await _require_tenant(user, db)
    channel_username = body.get("channel_username", "").strip().lstrip("@")
    if not channel_username:
        raise HTTPException(400, "channel_username required")
    tenant_bot = await get_tenant_bot(tenant.id)
    if not tenant_bot:
        return {"ok": False, "bot_is_admin": False, "channel_title": None, "error": "Merchant bot not configured"}
    try:
        chat = await tenant_bot.get_chat(f"@{channel_username}")
        me = await tenant_bot.get_me()
        member = await tenant_bot.get_chat_member(chat.id, me.id)
        is_admin = member.status in ("administrator", "creator")
        return {"ok": True, "bot_is_admin": is_admin, "channel_title": chat.title}
    except Exception as e:
        return {"ok": False, "bot_is_admin": False, "channel_title": None, "error": str(e)}
    finally:
        await tenant_bot.session.close()


# ---------------------------------------------------------------------------
# Loyalty config
# ---------------------------------------------------------------------------


@router.get("/loyalty-config")
async def get_loyalty_config(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    return (tenant.settings or {}).get("loyalty_config", {
        "earn_rate": 0.05, "cashback_rate": 0.03, "redemption_rate": 1,
        "tiers": [], "is_active": False,
    })


@router.patch("/loyalty-config")
async def update_loyalty_config(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    existing = settings_data.get("loyalty_config", {})
    settings_data["loyalty_config"] = {**existing, **body}
    tenant.settings = settings_data
    await db.commit()
    return settings_data["loyalty_config"]


# ---------------------------------------------------------------------------
# Referral config
# ---------------------------------------------------------------------------


@router.get("/referral-config")
async def get_referral_config(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    return (tenant.settings or {}).get("referral_config", {
        "referrer_reward_type": "discount_coupon", "referrer_reward_value": 10,
        "referee_reward_type": "discount_coupon", "referee_reward_value": 5,
        "is_active": False,
    })


@router.patch("/referral-config")
async def update_referral_config(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    existing = settings_data.get("referral_config", {})
    settings_data["referral_config"] = {**existing, **body}
    tenant.settings = settings_data
    await db.commit()
    return settings_data["referral_config"]


# ---------------------------------------------------------------------------
# Dashboard badges
# ---------------------------------------------------------------------------


@router.get("/dashboard/badges")
async def get_dashboard_badges(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    new_orders_q = await db.execute(
        select(func.count()).where(Order.tenant_id == tenant.id, Order.status == "new")
    )
    new_orders = new_orders_q.scalar() or 0
    return {"orders": new_orders if new_orders > 0 else None}


# ---------------------------------------------------------------------------
# Returns management
# ---------------------------------------------------------------------------


@router.get("/returns")
async def list_seller_returns(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    result = await db.execute(
        select(Order)
        .where(Order.tenant_id == tenant.id, Order.status == "return_requested")
        .order_by(Order.created_at.desc())
        .limit(50)
    )
    orders = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "customer_name": o.customer_name or "Покупатель",
            "total": float(o.total or 0),
            "currency": o.currency,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "meta": o.meta or {},
        }
        for o in orders
    ]


@router.post("/returns/{order_id}/approve")
async def approve_return(
    order_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update as sa_update
    tenant = await _require_tenant(user, db)
    result = await db.execute(select(Order).where(Order.id == order_id, Order.tenant_id == tenant.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    await db.execute(sa_update(Order).where(Order.id == order_id).values(status="return_approved"))
    await db.commit()
    return {"ok": True, "status": "return_approved"}


@router.post("/returns/{order_id}/reject")
async def reject_return(
    order_id: UUID,
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update as sa_update
    tenant = await _require_tenant(user, db)
    result = await db.execute(select(Order).where(Order.id == order_id, Order.tenant_id == tenant.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    meta = dict(order.meta or {})
    meta["return_reject_reason"] = body.get("reason", "")
    await db.execute(sa_update(Order).where(Order.id == order_id).values(status="return_rejected", meta=meta))
    await db.commit()
    return {"ok": True, "status": "return_rejected"}


@router.post("/returns/{order_id}/refund")
async def mark_return_refunded(
    order_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update as sa_update
    tenant = await _require_tenant(user, db)
    result = await db.execute(select(Order).where(Order.id == order_id, Order.tenant_id == tenant.id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    await db.execute(sa_update(Order).where(Order.id == order_id).values(status="returned", payment_status="refunded"))
    await db.commit()
    return {"ok": True, "status": "returned"}


# ---------------------------------------------------------------------------
# AI endpoints (seller-facing)
# ---------------------------------------------------------------------------


@router.post("/ai/fill-from-photo")
async def ai_fill_from_photo(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Extract product name, description, and price from an image URL."""
    await _require_tenant(user, db)
    image_url = body.get("image_url", "")
    locale = body.get("locale", "ru")
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content
        from app.ai.tasks.photo_import import extract_product_from_photo
        result = await extract_product_from_photo(image_bytes, caption="", locale=locale)
        return {"name": result.name, "description": result.description, "price": result.price}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/remove-background")
async def ai_remove_background(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove background using gpt-image-2 and return a white-background JPEG URL."""
    tenant = await _require_tenant(user, db)
    image_url = body.get("image_url", "")
    if not image_url:
        raise HTTPException(status_code=400, detail="image_url is required")
    try:
        from PIL import Image
        import io, base64

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content

        # Convert to square PNG that gpt-image-2 edit accepts
        img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
        size = max(img.size)
        square = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        square.paste(img, ((size - img.width) // 2, (size - img.height) // 2))
        square = square.resize((1024, 1024), Image.LANCZOS)
        png_buf = io.BytesIO()
        square.save(png_buf, format="PNG")
        png_buf.seek(0)

        from app.ai.client import get_openai_client
        ai_client = get_openai_client()
        result = await ai_client.images.edit(
            model="gpt-image-2",
            image=("product.png", png_buf, "image/png"),
            prompt=(
                "TASK: Remove only the background. Replace it with a perfectly solid pure white (#FFFFFF) background. "
                "CRITICAL — DO NOT ALTER THE PRODUCT IN ANY WAY. "
                "The product must be pixel-perfect identical to the original reference image: "
                "preserve every text, label, logo, print, graphic, pattern, stitching, and design detail exactly as they appear. "
                "If the product is clothing, preserve all prints, embroidery, fabric patterns, and material texture exactly. "
                "Do not reinterpret, stylize, enhance, or reconstruct any part of the product. "
                "Only the background pixels change — everything else stays untouched. "
                "Clean, sharp edges where product meets white background."
            ),
            n=1,
            size="1024x1024",
        )

        img_data = base64.b64decode(result.data[0].b64_json)
        out_img = Image.open(io.BytesIO(img_data)).convert("RGBA")

        # Flatten onto white background → JPEG
        white = Image.new("RGB", out_img.size, (255, 255, 255))
        white.paste(out_img, mask=out_img.split()[3])
        jpeg_buf = io.BytesIO()
        white.save(jpeg_buf, format="JPEG", quality=92)
        jpeg_bytes = jpeg_buf.getvalue()

        key = f"products/{tenant.id}/{uuid.uuid4()}_whitebg.jpg"

        def _upload():
            s3 = boto3.client(
                "s3",
                endpoint_url=f"https://{settings.cloudflare_account_id}.r2.cloudflarestorage.com",
                aws_access_key_id=settings.r2_access_key_id,
                aws_secret_access_key=settings.r2_secret_access_key,
            )
            s3.put_object(Bucket=settings.r2_bucket_name, Key=key, Body=jpeg_bytes, ContentType="image/jpeg")

        await asyncio.get_event_loop().run_in_executor(None, _upload)
        return {"url": f"{settings.r2_public_url.rstrip('/')}/{key}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/generate-description")
async def ai_generate_description(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)
    name = body.get("name", "")
    category = body.get("category", "")
    prompt = f"Напиши продающее описание товара '{name}'" + (f" в категории '{category}'" if category else "") + ". 2-3 предложения, на русском языке."
    try:
        from app.ai.client import get_openai_client; ai_client = get_openai_client()
        resp = await ai_client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        description = resp.choices[0].message.content.strip()
    except Exception:
        description = f"Высококачественный товар '{name}'. Отличный выбор для вас!"
    return {"description": description}


@router.post("/ai/generate-mailing")
async def ai_generate_mailing(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)
    topic = body.get("topic", "")
    audience = body.get("audience", "all")
    prompt = f"Напиши текст рекламной рассылки для Telegram на тему '{topic}' для аудитории '{audience}'. Включи заголовок и текст. 3-5 предложений, эмодзи, русский язык."
    try:
        from app.ai.client import get_openai_client; ai_client = get_openai_client()
        resp = await ai_client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = resp.choices[0].message.content.strip()
        title = text.split("\n")[0].strip("*# ") if "\n" in text else topic
    except Exception:
        title = topic
        text = f"🎉 {topic}\n\nНе упустите выгодное предложение!"
    return {"title": title, "text": text}


@router.get("/ai/insights")
async def ai_insights(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    orders_q = await db.execute(select(Order).where(Order.tenant_id == tenant.id))
    orders = orders_q.scalars().all()
    insights = []
    if len(orders) == 0:
        insights.append({"type": "tip", "message": "Создайте первый товар и поделитесь ссылкой на магазин с клиентами!", "action": "products"})
    elif len(orders) < 5:
        insights.append({"type": "tip", "message": "Добавьте фотографии к товарам — это увеличивает конверсию на 40%.", "action": "products"})
    new_count = sum(1 for o in orders if o.status == "new")
    if new_count > 0:
        insights.append({"type": "alert", "message": f"У вас {new_count} новых заказов, требующих обработки.", "action": "orders"})
    return {"insights": insights}


# ---------------------------------------------------------------------------
# AI Photo imports
# ---------------------------------------------------------------------------


@router.post("/ai-imports", status_code=201)
async def start_ai_import(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)
    import_id = str(uuid.uuid4())
    return {"id": import_id, "status": "done", "products": []}


@router.get("/ai-imports/{import_id}")
async def get_ai_import(
    import_id: str,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),  # noqa: ARG001
):
    await _require_tenant(user, db)
    return {"id": import_id, "status": "done", "products": []}


# ---------------------------------------------------------------------------
# Streak freeze
# ---------------------------------------------------------------------------


@router.post("/streak/freeze")
async def use_streak_freeze(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    freezes = max(0, int(settings_data.get("streak_freezes", 3)) - 1)
    settings_data["streak_freezes"] = freezes
    tenant.settings = settings_data
    await db.commit()
    return {"ok": True, "freezes_remaining": freezes}


# ---------------------------------------------------------------------------
# Manual order creation (seller creates order on behalf of customer)
# ---------------------------------------------------------------------------


@router.post("/orders/manual", status_code=201)
async def create_manual_order(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from decimal import Decimal
    tenant = await _require_tenant(user, db)
    items = body.get("items", [])
    order = Order(
        tenant_id=tenant.id,
        customer_name=body.get("customer_name", ""),
        customer_phone=body.get("customer_phone", ""),
        status="new",
        payment_method=body.get("payment_method", "cash_on_delivery"),
        payment_status="pending",
        subtotal=Decimal(str(body.get("total", 0))),
        discount=Decimal("0"),
        total=Decimal(str(body.get("total", 0))),
        currency=tenant.currency,
        delivery_note=body.get("note", ""),
        meta={"manual": True},
    )
    db.add(order)
    await db.flush()
    for item in items:
        db.add(OrderItem(
            order_id=order.id,
            product_id=item.get("product_id"),
            product_name=item.get("name", "Товар"),
            price=Decimal(str(item.get("price", 0))),
            quantity=int(item.get("qty", 1)),
            subtotal=Decimal(str(item.get("price", 0))) * int(item.get("qty", 1)),
        ))
    await db.commit()
    return {"id": str(order.id), "ok": True}


# ---------------------------------------------------------------------------
# Onboarding tours
# ---------------------------------------------------------------------------


@router.get("/tours/pending")
async def get_pending_tour(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    tours = (tenant.settings or {}).get("tours", {})
    for tour_id, tour_data in tours.items():
        if tour_data.get("status") == "in_progress":
            return {
                "id": tour_data.get("id", tour_id),
                "tour_id": tour_id,
                "current_step": tour_data.get("current_step", 0),
                "total_steps": tour_data.get("total_steps", 5),
            }
    return None


@router.post("/tours/{tour_id}/skip")
async def skip_tour(
    tour_id: str,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    tours = dict(settings_data.get("tours", {}))
    if tour_id in tours:
        tours[tour_id]["status"] = "skipped"
    settings_data["tours"] = tours
    tenant.settings = settings_data
    await db.commit()
    return {"ok": True}


@router.post("/tours/{tour_id}/step/{step}/complete")
async def complete_tour_step(
    tour_id: str,
    step: int,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    tours = dict(settings_data.get("tours", {}))
    if tour_id not in tours:
        tours[tour_id] = {"id": str(uuid.uuid4()), "status": "in_progress", "current_step": step, "total_steps": 5}
    else:
        tours[tour_id]["current_step"] = step
        if step >= tours[tour_id].get("total_steps", 5) - 1:
            tours[tour_id]["status"] = "completed"
    settings_data["tours"] = tours
    tenant.settings = settings_data
    await db.commit()
    return {"ok": True}


@router.patch("/tours/{tour_id}")
async def update_tour(
    tour_id: str,
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    settings_data = dict(tenant.settings or {})
    tours = dict(settings_data.get("tours", {}))
    if tour_id not in tours:
        tours[tour_id] = {"id": tour_id, "status": "in_progress", "current_step": 0, "total_steps": 5}
    tours[tour_id].update(body)
    settings_data["tours"] = tours
    tenant.settings = settings_data
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Subscription invoices (stub)
# ---------------------------------------------------------------------------


@router.get("/invoices")
async def list_invoices(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)
    return []


@router.get("/subscription")
async def get_subscription(
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    return {"tier": tenant.tier, "status": "active", "trial_ends_at": None, "next_billing_at": None}


@router.post("/subscription/upgrade")
async def upgrade_subscription(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    plan = body.get("plan", tenant.tier)
    tenant.tier = plan
    await db.commit()
    return {"ok": True, "tier": plan}


# ---------------------------------------------------------------------------
# Customer management (seller views)
# ---------------------------------------------------------------------------


@router.get("/customers")
async def list_customers(
    q: str = "",
    segment: str = "",
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.order import Customer
    tenant = await _require_tenant(user, db)
    query = select(Customer).where(Customer.tenant_id == tenant.id, Customer.is_deleted == False)  # noqa: E712
    if q:
        query = query.where(
            (Customer.first_name.ilike(f"%{q}%")) |
            (Customer.username.ilike(f"%{q}%")) |
            (Customer.phone.ilike(f"%{q}%"))
        )
    result = await db.execute(query.order_by(Customer.created_at.desc()).offset(skip).limit(limit))
    customers = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "telegram_id": c.telegram_id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "username": c.username,
            "phone": c.phone,
            "email": c.email,
            "total_orders": c.total_orders,
            "total_spent": float(c.total_spent or 0),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in customers
    ]


@router.get("/customers/{customer_id}")
async def get_customer(
    customer_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.order import Customer
    tenant = await _require_tenant(user, db)
    result = await db.execute(select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant.id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    orders_q = await db.execute(select(Order).where(Order.customer_id == c.id).order_by(Order.created_at.desc()).limit(20))
    orders = orders_q.scalars().all()
    return {
        "id": str(c.id),
        "telegram_id": c.telegram_id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "username": c.username,
        "phone": c.phone,
        "email": c.email,
        "total_orders": c.total_orders,
        "total_spent": float(c.total_spent or 0),
        "tags": [],
        "notes": [],
        "orders": [{"id": str(o.id), "status": o.status, "total": float(o.total), "currency": o.currency, "created_at": o.created_at.isoformat() if o.created_at else None} for o in orders],
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }


@router.get("/customers/{customer_id}/notes")
async def get_customer_notes(
    customer_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.order import Customer
    tenant = await _require_tenant(user, db)
    result = await db.execute(select(Customer).where(Customer.id == customer_id, Customer.tenant_id == tenant.id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    return []


@router.post("/customers/{customer_id}/notes", status_code=201)
async def add_customer_note(
    customer_id: UUID,
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)
    return {"id": str(uuid.uuid4()), "content": body.get("content", ""), "created_at": datetime.now(timezone.utc).isoformat()}


@router.delete("/customers/{customer_id}/notes/{note_id}", status_code=204)
async def delete_customer_note(
    customer_id: UUID,
    note_id: UUID,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)


@router.post("/customers/{customer_id}/tags")
async def add_customer_tag(
    customer_id: UUID,
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)
    return {"tags": [body.get("tag", "")]}


@router.delete("/customers/{customer_id}/tags/{tag}", status_code=204)
async def remove_customer_tag(
    customer_id: UUID,
    tag: str,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_tenant(user, db)


# ---------------------------------------------------------------------------
# Seller AI chat
# ---------------------------------------------------------------------------


@router.post("/ai/chat")
async def seller_ai_chat(
    body: dict,
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await _require_tenant(user, db)
    messages = body.get("messages", [])
    try:
        from app.ai.client import get_openai_client; ai_client = get_openai_client()
        resp = await ai_client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=500,
            messages=[
                {"role": "system", "content": f"Ты AI-ассистент продавца магазина '{tenant.name}' на платформе Dokonly. Помогай продавцу с управлением магазином, анализом продаж, советами по маркетингу. Отвечай на русском языке."},
                *[{"role": m["role"], "content": m["content"]} for m in messages],
            ],
        )
        reply = resp.choices[0].message.content.strip()
    except Exception:
        reply = "Здравствуйте! Чем могу помочь с вашим магазином?"
    return {"reply": reply}
