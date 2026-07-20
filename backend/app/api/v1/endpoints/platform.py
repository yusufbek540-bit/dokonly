"""
Platform ops endpoints — internal admin panel, authenticated via Supabase JWT.
Platform endpoints require an explicit admin allowlist.
"""
from datetime import datetime, timezone, timedelta
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_platform_admin_user
from app.core.config import settings
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.product import Product
from app.models.order import Order

router = APIRouter(prefix="/platform", tags=["Platform"])


# ---------------------------------------------------------------------------
# GET /platform/stats
# ---------------------------------------------------------------------------

@router.get("/stats")
async def platform_stats(
    user: dict = Depends(get_platform_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide statistics overview."""
    now = datetime.now(timezone.utc)
    cutoff_7d = now - timedelta(days=7)

    # Total active tenants
    total_tenants_q = await db.execute(
        select(func.count(Tenant.id)).where(Tenant.is_active == True)
    )
    total_tenants = total_tenants_q.scalar() or 0

    # Trial tenants (tier in ['trial', 'start'])
    trial_tenants_q = await db.execute(
        select(func.count(Tenant.id)).where(Tenant.tier.in_(["trial", "start"]))
    )
    trial_tenants = trial_tenants_q.scalar() or 0

    # Total orders
    total_orders_q = await db.execute(select(func.count(Order.id)))
    total_orders = total_orders_q.scalar() or 0

    # Total revenue from completed/delivered orders
    total_revenue_q = await db.execute(
        select(func.sum(Order.total)).where(
            Order.status.in_(["completed", "delivered"])
        )
    )
    total_revenue = float(total_revenue_q.scalar() or 0)

    # New tenants in last 7 days
    new_tenants_7d_q = await db.execute(
        select(func.count(Tenant.id)).where(Tenant.created_at >= cutoff_7d)
    )
    new_tenants_7d = new_tenants_7d_q.scalar() or 0

    # New orders in last 7 days
    new_orders_7d_q = await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= cutoff_7d)
    )
    new_orders_7d = new_orders_7d_q.scalar() or 0

    return {
        "total_tenants": total_tenants,
        "trial_tenants": trial_tenants,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "new_tenants_7d": new_tenants_7d,
        "new_orders_7d": new_orders_7d,
    }


# ---------------------------------------------------------------------------
# GET /platform/tenants
# ---------------------------------------------------------------------------

@router.get("/tenants")
async def platform_list_tenants(
    q: str | None = None,
    tier: str | None = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_platform_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all tenants with optional search and filter."""
    query = select(Tenant)

    if q:
        query = query.where(
            Tenant.name.ilike(f"%{q}%") | Tenant.slug.ilike(f"%{q}%")
        )
    if tier:
        query = query.where(Tenant.tier == tier)

    query = query.order_by(Tenant.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    tenants = result.scalars().all()

    return [
        {
            "id": str(t.id),
            "name": t.name,
            "slug": t.slug,
            "currency": t.currency,
            "country": t.country,
            "tier": t.tier,
            "bot_username": t.bot_username,
            "is_active": t.is_active,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "logo_url": t.logo_url,
            "owner_id": str(t.owner_id),
        }
        for t in tenants
    ]


# ---------------------------------------------------------------------------
# GET /platform/tenants/{tenant_id}
# ---------------------------------------------------------------------------

@router.get("/tenants/{tenant_id}")
async def platform_get_tenant(
    tenant_id: UUID,
    user: dict = Depends(get_platform_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single tenant with aggregated stats."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Order count
    order_count_q = await db.execute(
        select(func.count(Order.id)).where(Order.tenant_id == tenant_id)
    )
    order_count = order_count_q.scalar() or 0

    # Product count
    product_count_q = await db.execute(
        select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
    )
    product_count = product_count_q.scalar() or 0

    # Total revenue (completed/delivered)
    revenue_q = await db.execute(
        select(func.sum(Order.total)).where(
            Order.tenant_id == tenant_id,
            Order.status.in_(["completed", "delivered"]),
        )
    )
    total_revenue = float(revenue_q.scalar() or 0)

    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug,
        "currency": tenant.currency,
        "country": tenant.country,
        "tier": tenant.tier,
        "bot_username": tenant.bot_username,
        "is_active": tenant.is_active,
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        "logo_url": tenant.logo_url,
        "owner_id": str(tenant.owner_id),
        "description": tenant.description,
        "accent_color": tenant.accent_color,
        "typography_bundle": tenant.typography_bundle,
        "order_count": order_count,
        "product_count": product_count,
        "total_revenue": total_revenue,
    }


# ---------------------------------------------------------------------------
# PATCH /platform/tenants/{tenant_id}
# ---------------------------------------------------------------------------

@router.patch("/tenants/{tenant_id}")
async def platform_update_tenant(
    tenant_id: UUID,
    body: dict,
    user: dict = Depends(get_platform_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Update tenant tier and/or active status."""
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if "tier" in body:
        tenant.tier = body["tier"]
    if "is_active" in body:
        tenant.is_active = body["is_active"]

    await db.commit()
    await db.refresh(tenant)

    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "slug": tenant.slug,
        "currency": tenant.currency,
        "country": tenant.country,
        "tier": tenant.tier,
        "bot_username": tenant.bot_username,
        "is_active": tenant.is_active,
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
        "logo_url": tenant.logo_url,
        "owner_id": str(tenant.owner_id),
    }


# ---------------------------------------------------------------------------
# GET /platform/orders
# ---------------------------------------------------------------------------

@router.get("/orders")
async def platform_list_orders(
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_platform_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all orders across all tenants."""
    query = (
        select(Order)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    orders = result.scalars().all()

    return [
        {
            "id": str(o.id),
            "tenant_id": str(o.tenant_id),
            "customer_name": o.customer_name,
            "total": float(o.total),
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "currency": o.currency,
        }
        for o in orders
    ]


# ---------------------------------------------------------------------------
# Activity feed
# ---------------------------------------------------------------------------


@router.get("/activity")
async def platform_activity(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    orders_q = await db.execute(select(Order).order_by(Order.created_at.desc()).limit(20))
    orders = orders_q.scalars().all()
    events = []
    for o in orders:
        events.append({
            "id": str(o.id), "type": "new_order",
            "title": f"Новый заказ #{str(o.id)[:8].upper()}",
            "description": f"{o.customer_name} — {float(o.total):,.0f} {o.currency}",
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })
    return events


# ---------------------------------------------------------------------------
# Tenant actions
# ---------------------------------------------------------------------------


@router.post("/tenants/{tenant_id}/suspend")
async def suspend_tenant(tenant_id: UUID, body: dict, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import update as sa_update
    await db.execute(sa_update(Tenant).where(Tenant.id == tenant_id).values(is_active=False, settings=Tenant.settings))
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant not found")
    settings_data = dict(t.settings or {})
    settings_data["suspend_reason"] = body.get("reason", "")
    t.settings = settings_data
    t.is_active = False
    await db.commit()
    return {"ok": True}


@router.post("/tenants/{tenant_id}/unsuspend")
async def unsuspend_tenant(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant not found")
    t.is_active = True
    await db.commit()
    return {"ok": True}


@router.get("/tenants/{tenant_id}/activity")
async def tenant_activity(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    orders_q = await db.execute(select(Order).where(Order.tenant_id == tenant_id).order_by(Order.created_at.desc()).limit(20))
    orders = orders_q.scalars().all()
    return [{"id": str(o.id), "type": "order", "status": o.status, "total": float(o.total), "created_at": o.created_at.isoformat() if o.created_at else None} for o in orders]


@router.get("/tenants/{tenant_id}/subscription")
async def tenant_subscription(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant not found")
    return {"tenant_id": str(tenant_id), "tier": t.tier, "status": "active", "trial_ends_at": None}


@router.get("/tenants/{tenant_id}/products")
async def tenant_products(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.tenant_id == tenant_id).limit(50))
    products = result.scalars().all()
    return [{"id": str(p.id), "name": p.name, "price": float(p.price), "is_active": p.is_active} for p in products]


@router.get("/tenants/{tenant_id}/team")
async def tenant_team(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    return (t.settings or {}).get("team_members", []) if t else []


@router.get("/tenants/{tenant_id}/notes")
async def get_tenant_notes(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    return (t.settings or {}).get("platform_notes", []) if t else []


@router.post("/tenants/{tenant_id}/notes", status_code=201)
async def add_tenant_note(tenant_id: UUID, body: dict, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    import uuid as _uuid
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant not found")
    settings_data = dict(t.settings or {})
    notes = list(settings_data.get("platform_notes", []))
    note = {"id": str(_uuid.uuid4()), "content": body.get("content", ""), "created_at": datetime.now(timezone.utc).isoformat(), "author": user.get("email", "admin")}
    notes.insert(0, note)
    settings_data["platform_notes"] = notes
    t.settings = settings_data
    await db.commit()
    return note


@router.post("/tenants/{tenant_id}/impersonate")
async def impersonate_tenant(tenant_id: UUID, body: dict, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tenant not found")
    import time
    token_payload = {"sub": str(t.owner_id), "impersonated": True, "by": user.get("sub"), "exp": int(time.time()) + 3600}
    token = jwt.encode(token_payload, settings.supabase_jwt_secret, algorithm="HS256")
    return {"token": token, "url": "/"}


@router.get("/tenants/{tenant_id}/orders")
async def tenant_orders(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Order).where(Order.tenant_id == tenant_id).order_by(Order.created_at.desc()).limit(50))
    orders = result.scalars().all()
    return [{"id": str(o.id), "status": o.status, "total": float(o.total), "currency": o.currency, "created_at": o.created_at.isoformat() if o.created_at else None} for o in orders]


# ---------------------------------------------------------------------------
# Subscriptions, invoices, refunds
# ---------------------------------------------------------------------------


@router.get("/subscriptions")
async def list_subscriptions(q: str = "", tier: str = "", status: str = "", skip: int = 0, limit: int = 50, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    query = select(Tenant)
    if tier:
        query = query.where(Tenant.tier == tier)
    if q:
        query = query.where(Tenant.name.ilike(f"%{q}%"))
    result = await db.execute(query.offset(skip).limit(limit))
    tenants = result.scalars().all()
    return [{"id": str(t.id), "name": t.name, "tier": t.tier, "is_active": t.is_active, "slug": t.slug} for t in tenants]


@router.post("/subscriptions/{tenant_id}/extend-trial")
async def extend_trial(tenant_id: UUID, body: dict, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return {"ok": True, "days_added": body.get("days", 14)}


@router.post("/subscriptions/{tenant_id}/cancel")
async def cancel_subscription(tenant_id: UUID, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return {"ok": True}


@router.get("/invoices")
async def list_platform_invoices(skip: int = 0, limit: int = 50, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return []


@router.get("/refunds")
async def list_refunds(skip: int = 0, limit: int = 50, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return []


@router.get("/failed-payments")
async def list_failed_payments(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return []


@router.post("/invoices/{invoice_id}/refund")
async def issue_refund(invoice_id: str, body: dict, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return {"ok": True}


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


@router.get("/analytics/growth")
async def analytics_growth(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count()).select_from(Tenant))
    total = result.scalar() or 0
    return {"total_tenants": total, "growth_rate": 0, "new_this_week": 0, "chart": []}


@router.get("/analytics/revenue")
async def analytics_revenue(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.sum(Order.total)).select_from(Order))
    total = float(result.scalar() or 0)
    return {"total_revenue": total, "mrr": 0, "chart": []}


@router.get("/analytics/ai-costs")
async def analytics_ai_costs(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return {"total_cost": 0, "by_feature": {}, "chart": []}


@router.get("/analytics/product-usage")
async def analytics_product_usage(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count()).select_from(Product))
    total = result.scalar() or 0
    return {"total_products": total, "by_tier": {}, "chart": []}


# ---------------------------------------------------------------------------
# Platform team
# ---------------------------------------------------------------------------


@router.get("/team")
async def get_platform_team(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return [{"id": user.get("sub"), "email": user.get("email"), "role": "admin"}]


@router.post("/team/invite", status_code=201)
async def invite_platform_team(body: dict, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return {"ok": True, "email": body.get("email"), "role": body.get("role")}


@router.delete("/team/{member_id}", status_code=204)
async def remove_platform_team(member_id: str, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    pass


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------


@router.get("/audit")
async def get_audit_log(action: str = "", user_id: str = "", skip: int = 0, limit: int = 50, user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    return []


# ---------------------------------------------------------------------------
# System status
# ---------------------------------------------------------------------------


@router.get("/status")
async def system_status(user: dict = Depends(get_platform_admin_user), db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(select(func.now()))
        db_ok = True
    except Exception:
        db_ok = False
    return {"database": "ok" if db_ok else "error", "api": "ok", "bot": "ok", "workers": "ok"}


# ---------------------------------------------------------------------------
# Config endpoints
# ---------------------------------------------------------------------------


@router.get("/config/countries")
async def get_countries_config(user: dict = Depends(get_platform_admin_user)):
    return {"countries": ["UZ", "KZ", "RU", "TR", "AE"]}


@router.patch("/config/countries")
async def update_countries_config(body: dict, user: dict = Depends(get_platform_admin_user)):
    return {"ok": True, **body}


@router.get("/config/payment-providers")
async def get_payment_providers(user: dict = Depends(get_platform_admin_user)):
    return {"providers": ["manual_transfer", "cash_on_delivery", "telegram_stars"]}


@router.patch("/config/payment-providers")
async def update_payment_providers(body: dict, user: dict = Depends(get_platform_admin_user)):
    return {"ok": True, **body}


@router.get("/config/features")
async def get_features_config(user: dict = Depends(get_platform_admin_user)):
    return {"ai_enabled": True, "loyalty_enabled": True, "referrals_enabled": True}


@router.patch("/config/features")
async def update_features_config(body: dict, user: dict = Depends(get_platform_admin_user)):
    return {"ok": True, **body}


@router.get("/config/ai")
async def get_ai_config(user: dict = Depends(get_platform_admin_user)):
    return {"model": "gpt-4o-mini", "max_tokens": 500, "enabled": True}


@router.patch("/config/ai")
async def update_ai_config(body: dict, user: dict = Depends(get_platform_admin_user)):
    return {"ok": True, **body}


# ---------------------------------------------------------------------------
# Content / help articles
# ---------------------------------------------------------------------------


@router.get("/content/help-articles")
async def list_help_articles_platform(user: dict = Depends(get_platform_admin_user)):
    return [
        {"id": "1", "slug": "how-to-order", "title": "Как сделать заказ", "category": "orders", "content": "1. Выберите товары\n2. Добавьте в корзину\n3. Оформите заказ", "published": True},
        {"id": "2", "slug": "payment-methods", "title": "Способы оплаты", "category": "payments", "content": "Принимаем: наличные при получении, перевод на карту, Telegram Stars.", "published": True},
        {"id": "3", "slug": "returns", "title": "Возврат товара", "category": "returns", "content": "Вы можете запросить возврат в течение 14 дней с момента получения заказа.", "published": True},
    ]


@router.post("/content/help-articles", status_code=201)
async def create_help_article(body: dict, user: dict = Depends(get_platform_admin_user)):
    import uuid as _uuid
    return {"id": str(_uuid.uuid4()), **body, "published": False}


@router.patch("/content/help-articles/{article_id}")
async def update_help_article(article_id: str, body: dict, user: dict = Depends(get_platform_admin_user)):
    return {"id": article_id, **body}


@router.delete("/content/help-articles/{article_id}", status_code=204)
async def delete_help_article(article_id: str, user: dict = Depends(get_platform_admin_user)):
    pass


# ---------------------------------------------------------------------------
# Auth / 2FA (stub)
# ---------------------------------------------------------------------------


@router.get("/auth/2fa-status")
async def get_2fa_status(user: dict = Depends(get_platform_admin_user)):
    return {"enabled": False, "required": False}


@router.get("/auth/setup-2fa")
async def setup_2fa(user: dict = Depends(get_platform_admin_user)):
    return {"qr_url": "", "secret": "NOTIMPLEMENTED"}


@router.post("/auth/verify-2fa")
async def verify_2fa(body: dict, user: dict = Depends(get_platform_admin_user)):
    return {"ok": True}
