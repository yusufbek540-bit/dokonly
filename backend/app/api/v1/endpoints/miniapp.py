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
from app.models.order import Order, OrderItem, Customer
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

        mini_app_url = f"https://dokonly-miniapp.pages.dev?shop={tenant.slug}"

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

    # Notify buyer on status change
    if order.status != old_status and order.customer_id and settings.telegram_bot_token:
        try:
            cust_result = await db.execute(
                select(Customer).where(Customer.id == order.customer_id)
            )
            customer = cust_result.scalar_one_or_none()
            if customer and customer.telegram_id:
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
                            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
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

    def _is_unlocked(achievement: dict) -> bool:
        ctype = achievement["condition_type"]
        threshold = achievement["threshold"]
        if ctype == "order_count":
            return total_orders >= threshold
        if ctype == "customer_count":
            return total_customers >= threshold
        if ctype == "product_count":
            return total_products >= threshold
        if ctype == "revenue":
            return total_revenue >= threshold
        if ctype == "storefront_theme_configured":
            return storefront_theme_configured
        if ctype == "bot_connected":
            return bot_connected
        if ctype == "delivery_configured":
            return delivery_configured
        if ctype == "payment_configured":
            return payment_configured
        if ctype == "days_since_created":
            return days_since_created >= threshold
        return False

    result = [
        {
            "id": a["id"],
            "category": a["category"],
            "icon": a["icon"],
            "name_ru": a["name_ru"],
            "desc_ru": a["desc_ru"],
            "tier": a["tier"],
            "unlocked": _is_unlocked(a),
        }
        for a in ACHIEVEMENTS
    ]
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
    promo = PromoCode(
        tenant_id=tenant.id,
        code=code,
        discount_type=body.get("discount_type", "percent"),
        discount_value=float(body.get("discount_value", 0)),
        max_uses=body.get("max_uses") or None,
        min_order_amount=float(body["min_order_amount"]) if body.get("min_order_amount") else None,
        expires_at=expires_dt,
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

    if not settings.telegram_bot_token:
        mailing.status = "failed"
        await db.commit()
        raise HTTPException(503, "Bot token not configured")

    # Send asynchronously (non-blocking fire-and-forget)
    bot_token = settings.telegram_bot_token
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
# Media upload
# ---------------------------------------------------------------------------

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    user: dict = Depends(get_tg_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload an image to Cloudflare R2 and return its public URL."""
    tenant = await _require_tenant(user, db)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

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
