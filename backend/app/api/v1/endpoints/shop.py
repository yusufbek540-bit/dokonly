import asyncio
import uuid as _uuid

import boto3
import httpx
from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import _owner_id_from_tg, _validate_init_data
from app.core.config import settings
from app.core.crypto import decrypt
from app.core.database import get_db
from app.models.order import Order, OrderItem, Customer, WishlistItem
from app.models.promo import PromoCode
from app.models.product import Product
from app.models.tenant import Tenant

router = APIRouter(prefix="/shop", tags=["shop"])


async def _notify_merchant_new_order(tenant, order, items_data: list, products_by_id: dict):
    """Send a Telegram message to the merchant when a new order arrives."""
    if not settings.telegram_bot_token:
        return

    # Get owner's Telegram ID from tenant settings
    owner_tg_id = (tenant.settings or {}).get("owner_tg_id")
    if not owner_tg_id:
        return

    def fmt(n, currency):
        if currency == "UZS":
            s = str(int(n))
            result = ""
            for i, c in enumerate(reversed(s)):
                if i > 0 and i % 3 == 0:
                    result = " " + result
                result = c + result
            return result + " сум"
        return f"{n} {currency}"

    items_lines = []
    for item in items_data:
        pid = item.get("product_id")
        product = products_by_id.get(str(pid)) if pid else None
        name = product.name if product else item.get("name", "Товар")
        qty = int(item.get("qty", 1))
        extras = ""
        if item.get("size"):
            extras += f" · {item['size']}"
        if item.get("color"):
            extras += f" · {item['color']}"
        items_lines.append(f"• {name}{extras} × {qty}")

    delivery = (
        "Самовывоз"
        if order.delivery_type == "pickup"
        else (f"Доставка: {order.delivery_address}" if order.delivery_address else "Доставка")
    )

    payment_labels = {
        "card": "Карта",
        "click": "Click",
        "payme": "Payme",
        "cash": "Наличные",
        "stars": "Stars",
    }

    customer_line = f"👤 {order.customer_name or 'Покупатель'}"
    if order.customer_phone:
        customer_line += f" · `{order.customer_phone}`"
    if order.customer_email:
        customer_line += f" · {order.customer_email}"

    msg = (
        f"🛍 *Новый заказ!*\n\n"
        + customer_line
        + f"\n\n"
        + "\n".join(items_lines)
        + f"\n\n💰 *{fmt(order.total, order.currency)}*\n"
        f"🚚 {delivery}\n"
        f"💳 {payment_labels.get(order.payment_method, order.payment_method)}"
    )

    # Send to owner DM and optionally to a configured group chat
    group_chat_id = (tenant.settings or {}).get("notify_group_chat_id")
    recipients = [owner_tg_id]
    if group_chat_id and group_chat_id != owner_tg_id:
        recipients.append(group_chat_id)

    async with httpx.AsyncClient(timeout=5) as client:
        for chat_id in recipients:
            try:
                await client.post(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                    json={"chat_id": chat_id, "text": msg, "parse_mode": "Markdown"},
                )
            except Exception:
                pass


@router.get("/{slug}")
async def get_shop(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Tenant).where(Tenant.slug == slug, Tenant.is_active == True)  # noqa: E712
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "currency": tenant.currency,
        "logo_url": tenant.logo_url,
        "cover_url": tenant.cover_url,
        "accent_color": tenant.accent_color,
        "typography_bundle": tenant.typography_bundle,
        "description": tenant.description,
        "contact_info": tenant.contact_info or {},
        "settings": tenant.settings,
        "bot_username": tenant.bot_username,
    }


@router.get("/{slug}/role")
async def get_shop_role(
    slug: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns whether the caller is 'owner' or 'buyer' for this shop.
    Called by the Mini App immediately after loading to decide which UI to show.
    """
    result = await db.execute(
        select(Tenant).where(Tenant.slug == slug, Tenant.is_active == True)  # noqa: E712
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Shop not found")

    if not x_telegram_init_data:
        return {"role": "buyer"}

    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        # Dev mode: no bot token configured → treat as buyer
        if not settings.telegram_bot_token:
            return {"role": "buyer"}
        return {"role": "buyer"}

    owner_id = str(_owner_id_from_tg(tg_user["id"]))
    role = "owner" if str(tenant.owner_id) == owner_id else "buyer"
    return {"role": role, "tenant_id": str(tenant.id)}


@router.get("/{tenant_id}/products")
async def get_shop_products(tenant_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.product import Category
    result = await db.execute(
        select(Product, Category.name.label("category_name"))
        .outerjoin(Category, Product.category_id == Category.id)
        .where(Product.tenant_id == tenant_id, Product.is_active == True)  # noqa: E712
        .order_by(Product.sort_order)
    )
    rows = result.all()
    out = []
    for product, category_name in rows:
        meta = product.meta or {}
        d = {
            "id": str(product.id),
            "name": product.name,
            "description": product.description,
            "price": float(product.price),
            "compare_at_price": float(product.compare_at_price) if product.compare_at_price else None,
            "currency": product.currency,
            "stock": product.stock,
            "sku": product.sku,
            "images": product.images or [],
            "is_active": product.is_active,
            "sort_order": product.sort_order,
            "category_id": str(product.category_id) if product.category_id else None,
            "category": category_name,
            "sizes": meta.get("sizes", []),
            "colors": meta.get("colors", []),
            "is_featured": meta.get("is_featured", False),
            "video_url": product.video_url,
        }
        out.append(d)
    return out


@router.get("/{tenant_id}/products/{product_id}/reviews")
async def get_product_reviews(tenant_id: str, product_id: str, db: AsyncSession = Depends(get_db)):
    """Return aggregated reviews for a product (from orders that include this product)."""
    result = await db.execute(
        select(Order).join(
            OrderItem, OrderItem.order_id == Order.id
        ).where(
            Order.tenant_id == tenant_id,
            OrderItem.product_id == product_id,
        )
    )
    orders = result.scalars().all()
    reviews = []
    for o in orders:
        meta = o.meta or {}
        if meta.get("review_rating"):
            reviews.append({
                "rating": meta["review_rating"],
                "text": meta.get("review_text", ""),
                "reviewer_name": o.customer_name or "Покупатель",
                "created_at": meta.get("review_at", str(o.updated_at)),
            })
    if not reviews:
        return {"avg_rating": None, "count": 0, "reviews": []}
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1)
    return {"avg_rating": avg, "count": len(reviews), "reviews": reviews}


@router.get("/{tenant_id}/stats")
async def get_shop_stats(tenant_id: str, db: AsyncSession = Depends(get_db)):
    """Return public shop stats: avg rating, review count, and unique customer count."""
    result = await db.execute(
        select(Order).where(Order.tenant_id == tenant_id)
    )
    orders = result.scalars().all()
    ratings = [o.meta["review_rating"] for o in orders if (o.meta or {}).get("review_rating")]
    customer_count = len(set(o.customer_id for o in orders if o.customer_id))
    if not ratings:
        return {"avg_rating": None, "review_count": 0, "customer_count": customer_count}
    avg = round(sum(ratings) / len(ratings), 1)
    return {"avg_rating": avg, "review_count": len(ratings), "customer_count": customer_count}


@router.post("/{tenant_id}/orders", status_code=201)
async def create_buyer_order(
    tenant_id: str,
    body: dict,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Buyer places an order. No seller auth required — public endpoint."""
    # Verify tenant exists
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id, Tenant.is_active == True)  # noqa: E712
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Shop not found")

    # Optional: upsert Customer if initData provided
    customer_id = None
    if x_telegram_init_data:
        tg_user = _validate_init_data(x_telegram_init_data)
        if tg_user:
            tg_id = tg_user.get("id")
            cust_result = await db.execute(
                select(Customer).where(
                    Customer.tenant_id == tenant.id,
                    Customer.telegram_id == tg_id,
                    Customer.is_deleted == False,  # noqa: E712
                )
            )
            customer = cust_result.scalar_one_or_none()
            if not customer:
                customer = Customer(
                    tenant_id=tenant.id,
                    telegram_id=tg_id,
                    first_name=tg_user.get("first_name", ""),
                    last_name=tg_user.get("last_name", ""),
                    username=tg_user.get("username", ""),
                )
                db.add(customer)
                await db.flush()
            customer_id = customer.id

    # Calculate order totals from items
    items_data = body.get("items", [])
    if not items_data:
        raise HTTPException(400, "Order must have at least one item")

    # Look up products to get current prices
    product_ids = [i.get("product_id") for i in items_data if i.get("product_id")]
    products_by_id: dict = {}
    if product_ids:
        prod_result = await db.execute(
            select(Product).where(
                Product.id.in_(product_ids),
                Product.tenant_id == tenant.id,
                Product.is_active == True,  # noqa: E712
            )
        )
        for p in prod_result.scalars().all():
            products_by_id[str(p.id)] = p

    subtotal = 0
    for item in items_data:
        pid = item.get("product_id")
        product = products_by_id.get(str(pid)) if pid else None
        price = float(product.price) if product else 0
        qty = int(item.get("qty", 1))
        subtotal += price * qty

    # Enforce shop-level minimum order amount
    settings = tenant.settings or {}
    min_order = settings.get("min_order_amount")
    if min_order and subtotal < float(min_order):
        raise HTTPException(
            status_code=400,
            detail=f"Минимальная сумма заказа: {int(min_order)} {tenant.currency}",
        )

    # Validate and apply promo code if provided
    discount = 0.0
    coupon_code = body.get("coupon_code")
    if coupon_code:
        from datetime import datetime, timezone
        promo_result = await db.execute(
            select(PromoCode).where(
                PromoCode.tenant_id == tenant.id,
                PromoCode.code == coupon_code.upper().strip(),
                PromoCode.is_active == True,  # noqa: E712
            )
        )
        promo = promo_result.scalar_one_or_none()
        if promo:
            expired = promo.expires_at and promo.expires_at < datetime.now(timezone.utc)
            exhausted = promo.max_uses is not None and promo.used_count >= promo.max_uses
            if not expired and not exhausted:
                if promo.discount_type == "percent":
                    discount = round(subtotal * float(promo.discount_value) / 100, 2)
                else:
                    discount = min(float(promo.discount_value), subtotal)
                promo.used_count += 1

    total = max(subtotal - discount, 0)

    order = Order(
        tenant_id=tenant.id,
        customer_id=customer_id,
        customer_name=body.get("customer_name", ""),
        customer_phone=body.get("customer_phone", ""),
        customer_email=body.get("customer_email") or None,
        delivery_address=body.get("delivery_address"),
        delivery_type=body.get("delivery_type", "pickup"),
        payment_method=body.get("payment_method", "cash"),
        payment_status="pending",
        coupon_code=body.get("coupon_code"),
        subtotal=subtotal,
        discount=discount,
        total=total,
        currency=tenant.currency,
        customer_note=body.get("customer_note"),
    )
    db.add(order)
    await db.flush()

    # Create order items
    for item_data in items_data:
        pid = item_data.get("product_id")
        product = products_by_id.get(str(pid)) if pid else None
        price = float(product.price) if product else 0
        qty = int(item_data.get("qty", 1))
        order_item = OrderItem(
            order_id=order.id,
            product_id=pid,
            product_name=product.name if product else item_data.get("name", "Товар"),
            price=price,
            quantity=qty,
            subtotal=price * qty,
            size=item_data.get("size"),
            color=item_data.get("color"),
        )
        db.add(order_item)

    await db.commit()
    await db.refresh(order)

    # Notify merchant via Telegram if bot is configured
    try:
        await _notify_merchant_new_order(tenant, order, items_data, products_by_id)
    except Exception:
        pass  # Notification is non-fatal

    return {"id": str(order.id), "status": order.status, "total": float(order.total), "currency": order.currency}


@router.get("/{tenant_id}/my-orders")
async def get_my_orders(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Return the authenticated buyer's orders for this tenant."""
    if not x_telegram_init_data:
        return []

    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        return []

    tg_id = tg_user.get("id")

    # Find the Customer record for this tenant + telegram user
    cust_result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.telegram_id == tg_id,
        )
    )
    customer = cust_result.scalar_one_or_none()
    if not customer:
        return []

    # Fetch all orders for this customer
    orders_result = await db.execute(
        select(Order)
        .where(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
    )
    orders = orders_result.scalars().all()

    # Fetch order items for all orders in one query
    order_ids = [o.id for o in orders]
    if not order_ids:
        return []

    items_result = await db.execute(
        select(OrderItem).where(OrderItem.order_id.in_(order_ids))
    )
    all_items = items_result.scalars().all()

    # Batch-fetch product images for all product IDs
    product_ids = [oi.product_id for oi in all_items if oi.product_id]
    images_by_product: dict = {}
    if product_ids:
        prods_result = await db.execute(
            select(Product.id, Product.images).where(Product.id.in_(product_ids))
        )
        for row in prods_result.all():
            images_by_product[str(row[0])] = row[1] or []

    # Group items by order_id
    items_by_order: dict = {}
    for item in all_items:
        items_by_order.setdefault(str(item.order_id), []).append(item)

    # Build response
    result_list = []
    for order in orders:
        order_items = items_by_order.get(str(order.id), [])
        result_list.append(
            {
                "id": str(order.id),
                "status": order.status,
                "total": float(order.total),
                "currency": order.currency,
                "payment_method": order.payment_method,
                "payment_status": order.payment_status,
                "delivery_type": order.delivery_type,
                "delivery_address": order.delivery_address,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "meta": order.meta or {},
                "customer_note": order.customer_note,
                "items": [
                    {
                        "product_id": str(oi.product_id) if oi.product_id else None,
                        "product_name": oi.product_name,
                        "quantity": oi.quantity,
                        "price": float(oi.price),
                        "size": oi.size,
                        "color": oi.color,
                        "image_url": (images_by_product.get(str(oi.product_id), []) or [None])[0] if oi.product_id else None,
                    }
                    for oi in order_items
                ],
            }
        )

    return result_list


@router.get("/{tenant_id}/coupon")
async def validate_coupon(
    tenant_id: str,
    code: str,
    subtotal: float = 0.0,
    product_ids: str = "",  # comma-separated product UUIDs from cart
    db: AsyncSession = Depends(get_db),
):
    """Validate a coupon code and return the discount amount."""
    from datetime import datetime, timezone

    result = await db.execute(
        select(PromoCode).where(
            PromoCode.tenant_id == tenant_id,
            PromoCode.code == code.upper().strip(),
            PromoCode.is_active == True,  # noqa: E712
        )
    )
    promo = result.scalar_one_or_none()

    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")

    if promo.expires_at and promo.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Промокод истёк")

    if promo.max_uses is not None and promo.used_count >= promo.max_uses:
        raise HTTPException(status_code=410, detail="Промокод исчерпан")

    if promo.min_order_amount is not None and subtotal < float(promo.min_order_amount):
        raise HTTPException(
            status_code=422,
            detail=f"Минимальная сумма заказа для этого купона: {int(promo.min_order_amount)}",
        )

    # Check applicable products — if restricted, at least one cart product must match
    if promo.applicable_product_ids:
        cart_ids = set(pid.strip() for pid in product_ids.split(",") if pid.strip())
        allowed_ids = set(str(pid) for pid in promo.applicable_product_ids)
        if not cart_ids.intersection(allowed_ids):
            raise HTTPException(
                status_code=422,
                detail="Купон не применим к товарам в корзине",
            )

    if promo.discount_type == "percent":
        discount_amount = round(subtotal * float(promo.discount_value) / 100, 2)
    else:
        discount_amount = min(float(promo.discount_value), subtotal)

    return {
        "valid": True,
        "discount_type": promo.discount_type,
        "discount_value": float(promo.discount_value),
        "discount_amount": discount_amount,
    }


@router.get("/{tenant_id}/wishlist")
async def get_wishlist(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Return list of product_ids in this buyer's wishlist for the shop."""
    if not x_telegram_init_data:
        return []
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        return []
    tg_id = tg_user.get("id")
    result = await db.execute(
        select(WishlistItem.product_id).where(
            WishlistItem.tenant_id == tenant_id,
            WishlistItem.customer_telegram_id == tg_id,
        )
    )
    return [str(pid) for pid in result.scalars().all()]


@router.get("/{tenant_id}/check-channel-membership")
async def check_channel_membership(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Verify the caller is a member of the tenant's gated channel."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    channel_username = (tenant.settings or {}).get("channel_username", "")
    if not channel_username:
        return {"is_member": True}

    if not x_telegram_init_data:
        return {"is_member": False}

    tg_user = _validate_init_data(x_telegram_init_data)
    if not tg_user:
        return {"is_member": False}

    tg_user_id = tg_user.get("id")
    if not tg_user_id or not tenant.bot_token_enc:
        return {"is_member": False}

    try:
        bot_token = decrypt(tenant.bot_token_enc)
        channel = channel_username.lstrip("@")
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getChatMember",
                params={"chat_id": f"@{channel}", "user_id": tg_user_id},
            )
        data = resp.json()
        if data.get("ok"):
            member_status = data["result"]["status"]
            return {"is_member": member_status in ("member", "administrator", "creator")}
    except Exception:
        pass

    return {"is_member": False}


@router.get("/{tenant_id}/my-profile")
async def get_buyer_profile(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Return the buyer's saved profile for this tenant."""
    if not x_telegram_init_data:
        return {}
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        return {}
    tg_id = tg_user.get("id")

    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.telegram_id == tg_id,
            Customer.is_deleted == False,  # noqa: E712
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        return {
            "first_name": tg_user.get("first_name", ""),
            "last_name": tg_user.get("last_name", ""),
            "username": tg_user.get("username", ""),
            "phone": None,
            "email": None,
            "birthday": None,
            "saved_address": None,
            "custom_avatar_url": None,
            "locale": tg_user.get("language_code", "ru"),
        }
    return {
        "first_name": customer.first_name or tg_user.get("first_name", ""),
        "last_name": customer.last_name or tg_user.get("last_name", ""),
        "username": customer.username or tg_user.get("username", ""),
        "phone": customer.phone,
        "email": customer.email,
        "birthday": customer.birthday.isoformat() if customer.birthday else None,
        "saved_address": customer.saved_address,
        "custom_avatar_url": customer.custom_avatar_url,
        "locale": customer.locale or "ru",
        "created_at": customer.created_at.isoformat() if customer.created_at else None,
    }


@router.patch("/{tenant_id}/my-profile")
async def update_buyer_profile(
    tenant_id: str,
    body: dict,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Upsert the buyer's profile for this tenant."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")
    tg_id = tg_user.get("id")

    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.telegram_id == tg_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        customer = Customer(
            tenant_id=tenant_id,
            telegram_id=tg_id,
            first_name=tg_user.get("first_name"),
            last_name=tg_user.get("last_name"),
            username=tg_user.get("username"),
            locale=tg_user.get("language_code", "ru"),
        )
        db.add(customer)

    allowed = {"first_name", "last_name", "phone", "email", "birthday", "saved_address", "custom_avatar_url", "locale"}
    for key, val in body.items():
        if key in allowed:
            if key == "birthday" and val:
                from datetime import date
                try:
                    setattr(customer, key, date.fromisoformat(val))
                except ValueError:
                    pass
            else:
                setattr(customer, key, val or None)

    await db.commit()
    return {"ok": True}


@router.delete("/{tenant_id}/my-profile", status_code=200)
async def delete_buyer_profile(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Anonymize and soft-delete the buyer's profile for this tenant."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")
    tg_id = tg_user.get("id")

    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.telegram_id == tg_id,
            Customer.is_deleted == False,  # noqa: E712
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        return {"ok": True}

    # Anonymize PII on all this customer's orders
    orders_result = await db.execute(
        select(Order).where(Order.customer_id == customer.id)
    )
    for order in orders_result.scalars().all():
        order.customer_name = "Удалённый пользователь"
        order.customer_phone = None

    # Delete wishlist items
    await db.execute(
        WishlistItem.__table__.delete().where(
            WishlistItem.tenant_id == tenant_id,
            WishlistItem.customer_telegram_id == tg_id,
        )
    )

    # Anonymize customer record and mark deleted
    customer.first_name = "Удалённый"
    customer.last_name = "пользователь"
    customer.username = None
    customer.phone = None
    customer.email = None
    customer.birthday = None
    customer.saved_address = None
    customer.custom_avatar_url = None
    customer.is_deleted = True

    await db.commit()
    return {"ok": True}


@router.post("/{tenant_id}/orders/{order_id}/cancel")
async def cancel_buyer_order(
    tenant_id: str,
    order_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Allow buyer to cancel their own order (only if status is new/created)."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")

    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in ("new", "created"):
        raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")

    order.status = "cancelled"
    await db.commit()
    return {"ok": True, "status": "cancelled"}


@router.post("/{tenant_id}/orders/{order_id}/review")
async def submit_order_review(
    tenant_id: str,
    order_id: str,
    body: dict,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Allow buyer to submit a star rating + optional text for a delivered order."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")

    rating = body.get("rating")
    if rating is None or not (1 <= int(rating) <= 5):
        raise HTTPException(status_code=400, detail="rating must be 1-5")

    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in ("delivered", "completed"):
        raise HTTPException(status_code=400, detail="Order must be delivered to review")

    meta = dict(order.meta or {})
    if meta.get("review_rating"):
        raise HTTPException(status_code=400, detail="Already reviewed")

    from datetime import datetime, timezone
    from sqlalchemy.orm.attributes import flag_modified
    meta["review_rating"] = int(rating)
    meta["review_text"] = body.get("text", "")
    meta["review_at"] = datetime.now(timezone.utc).isoformat()
    order.meta = meta
    flag_modified(order, "meta")
    await db.commit()
    return {"ok": True, "rating": int(rating)}


@router.post("/{tenant_id}/wishlist/toggle")
async def toggle_wishlist(
    tenant_id: str,
    body: dict,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a product in/out of wishlist. Returns new state."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")
    tg_id = tg_user.get("id")
    product_id = body.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id required")

    existing = await db.execute(
        select(WishlistItem).where(
            WishlistItem.tenant_id == tenant_id,
            WishlistItem.customer_telegram_id == tg_id,
            WishlistItem.product_id == product_id,
        )
    )
    item = existing.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
        return {"in_wishlist": False, "product_id": product_id}
    else:
        new_item = WishlistItem(
            tenant_id=tenant_id,
            customer_telegram_id=tg_id,
            product_id=product_id,
        )
        db.add(new_item)
        await db.commit()
        return {"in_wishlist": True, "product_id": product_id}


@router.post("/{tenant_id}/orders/{order_id}/payment-screenshot")
async def upload_payment_screenshot(
    tenant_id: str,
    order_id: str,
    file: UploadFile = File(...),
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Buyer uploads payment screenshot for manual card transfer orders."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")

    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB)")

    ext = (file.filename or "img").rsplit(".", 1)[-1] if "." in (file.filename or "") else "jpg"
    key = f"payments/{tenant_id}/{_uuid.uuid4()}.{ext}"

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

    from sqlalchemy.orm.attributes import flag_modified
    meta = dict(order.meta or {})
    meta["payment_screenshot"] = public_url
    order.meta = meta
    flag_modified(order, "meta")
    await db.commit()

    return {"url": public_url}


@router.post("/{tenant_id}/profile/avatar")
async def upload_buyer_avatar(
    tenant_id: str,
    file: UploadFile = File(...),
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Upload a custom avatar for the buyer profile."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")

    tg_user_id = str(tg_user.get("id", ""))
    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.telegram_id == tg_user_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 5 MB)")

    ext = "jpg"
    if file.content_type == "image/png":
        ext = "png"
    elif file.content_type == "image/webp":
        ext = "webp"
    key = f"customers/{customer.id}/avatar.{ext}"

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
            ContentType=file.content_type or "image/jpeg",
        )

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _upload)

    public_url = f"{settings.r2_public_url.rstrip('/')}/{key}"
    customer.custom_avatar_url = public_url
    await db.commit()

    return {"url": public_url}


@router.delete("/{tenant_id}/profile/avatar")
async def reset_buyer_avatar(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Reset buyer avatar back to Telegram photo."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")

    tg_user_id = str(tg_user.get("id", ""))
    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.telegram_id == tg_user_id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.custom_avatar_url = None
    await db.commit()

    return {"ok": True}


@router.get("/{tenant_id}/my-referral")
async def get_my_referral(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Return the buyer's referral code, link, and stats."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=401, detail="Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(status_code=401, detail="Invalid auth")

    tg_id = str(tg_user.get("id", ""))
    result = await db.execute(
        select(Customer).where(
            Customer.tenant_id == tenant_id,
            Customer.telegram_id == tg_id,
            Customer.is_deleted == False,  # noqa: E712
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Derive referral code from customer id (short, uppercase)
    code = customer.referral_code if hasattr(customer, "referral_code") and customer.referral_code else \
        str(customer.id).replace("-", "").upper()[:8]

    bot_username = (tenant.settings or {}).get("bot_username") or ""
    ref_link = f"https://t.me/{bot_username}?start=ref_{code}" if bot_username else ""

    # Count referrals from customer meta or return zeros when table absent
    referred_count = 0
    completed_count = 0
    pending_count = 0
    earned = 0.0
    friends: list = []

    return {
        "is_active": False,  # Will be True once referral_programs table is active
        "code": code,
        "link": ref_link,
        "stats": {
            "invited": referred_count,
            "completed": completed_count,
            "pending": pending_count,
            "earned": earned,
        },
        "friends": friends,
    }


@router.get("/{tenant_id}/stories")
async def get_stories(tenant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Shop not found")
    return (tenant.settings or {}).get("stories", [])


@router.get("/{tenant_id}/my-loyalty-history")
async def get_loyalty_history(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not x_telegram_init_data:
        raise HTTPException(401, "Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(401, "Invalid auth")
    return []


@router.post("/{tenant_id}/products/{product_id}/share-intent")
async def create_share_intent(
    tenant_id: str,
    product_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not x_telegram_init_data:
        raise HTTPException(401, "Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(401, "Invalid auth")
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Shop not found")
    share_id = str(_uuid.uuid4())[:8].upper()
    bot_username = tenant.bot_username or ""
    deep_link = f"https://t.me/{bot_username}?start=share_{share_id}" if bot_username else ""
    return {"share_id": share_id, "referral_code": None, "deep_link": deep_link}


@router.get("/{tenant_id}/products/{product_id}/recommendations")
async def get_product_recommendations(
    tenant_id: str,
    product_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product)
        .where(Product.tenant_id == tenant_id, Product.is_active == True, Product.id != product_id)  # noqa: E712
        .limit(6)
    )
    products = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "price": float(p.price),
            "images": p.images or [],
            "compare_at_price": float(p.compare_at_price) if p.compare_at_price else None,
        }
        for p in products
    ]


@router.get("/{tenant_id}/my-returns")
async def get_my_returns(
    tenant_id: str,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not x_telegram_init_data:
        raise HTTPException(401, "Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(401, "Invalid auth")
    tg_id = tg_user.get("id")
    result = await db.execute(
        select(Customer).where(Customer.tenant_id == tenant_id, Customer.telegram_id == tg_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        return []
    returns_q = await db.execute(
        select(Order).where(
            Order.tenant_id == tenant_id,
            Order.customer_id == customer.id,
            Order.status.in_(["return_requested", "return_approved", "return_rejected", "returned"]),
        ).order_by(Order.created_at.desc())
    )
    orders = returns_q.scalars().all()
    return [
        {
            "id": str(o.id),
            "status": o.status,
            "total": float(o.total or 0),
            "currency": o.currency,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "meta": o.meta or {},
        }
        for o in orders
    ]


@router.post("/{tenant_id}/returns")
async def create_return(
    tenant_id: str,
    body: dict,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update as sa_update
    if not x_telegram_init_data:
        raise HTTPException(401, "Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(401, "Invalid auth")
    tg_id = tg_user.get("id")
    order_id = body.get("order_id")
    reason = body.get("reason", "")
    if not order_id:
        raise HTTPException(400, "order_id required")
    result = await db.execute(select(Customer).where(Customer.tenant_id == tenant_id, Customer.telegram_id == tg_id))
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(404, "Customer not found")
    order_result = await db.execute(
        select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id, Order.customer_id == customer.id)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    meta = dict(order.meta or {})
    meta["return_reason"] = reason
    meta["return_items"] = body.get("items", [])
    await db.execute(
        sa_update(Order).where(Order.id == order.id).values(status="return_requested", meta=meta)
    )
    await db.commit()
    return {"ok": True, "order_id": order_id, "status": "return_requested"}


@router.post("/{tenant_id}/ai/chat")
async def ai_chat(
    tenant_id: str,
    body: dict,
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not x_telegram_init_data:
        raise HTTPException(401, "Auth required")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        raise HTTPException(401, "Invalid auth")
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "Shop not found")
    messages = body.get("messages", [])
    try:
        from app.ai.client import openai as ai_client
        resp = await ai_client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=500,
            messages=[
                {"role": "system", "content": f"Ты AI-консультант магазина '{tenant.name}'. Помогай покупателям с выбором товаров. Отвечай кратко и по делу, на русском языке."},
                *[{"role": m["role"], "content": m["content"]} for m in messages],
            ],
        )
        reply = resp.choices[0].message.content.strip()
    except Exception:
        reply = "Здравствуйте! Чем могу помочь?"
    return {"reply": reply}


@router.get("/public/help-articles")
async def get_help_articles(db: AsyncSession = Depends(get_db)):  # noqa: ARG001
    return [
        {"id": "1", "slug": "how-to-order", "title": "Как сделать заказ", "category": "orders",
         "content": "1. Выберите товары\n2. Добавьте в корзину\n3. Оформите заказ"},
        {"id": "2", "slug": "payment-methods", "title": "Способы оплаты", "category": "payments",
         "content": "Принимаем: наличные при получении, перевод на карту, Telegram Stars."},
        {"id": "3", "slug": "returns", "title": "Возврат товара", "category": "returns",
         "content": "Вы можете запросить возврат в течение 14 дней с момента получения заказа."},
    ]
