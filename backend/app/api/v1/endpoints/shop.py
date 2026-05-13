from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.product import Product
from app.models.tenant import Tenant

router = APIRouter(prefix="/shop", tags=["shop"])


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
    }


@router.get("/{tenant_id}/products")
async def get_shop_products(tenant_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .where(Product.tenant_id == tenant_id, Product.is_active == True)  # noqa: E712
        .order_by(Product.sort_order)
    )
    return result.scalars().all()
