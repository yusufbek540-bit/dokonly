"""
Platform ops endpoints — internal admin panel, authenticated via Supabase JWT.
All authenticated users are trusted for now; role checks will be added later.
"""
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_current_user
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
    user: dict = Depends(get_current_user),
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
    user: dict = Depends(get_current_user),
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
    user: dict = Depends(get_current_user),
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
    user: dict = Depends(get_current_user),
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
    user: dict = Depends(get_current_user),
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
