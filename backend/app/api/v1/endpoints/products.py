from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.tenant import Tenant
from app.models.product import Category, Product
from app.schemas.product import (
    CategoryCreate,
    CategoryResponse,
    ProductCreate,
    ProductUpdate,
    ProductResponse,
)

router_categories = APIRouter(prefix="/categories", tags=["categories"])
router_products = APIRouter(prefix="/products", tags=["products"])


async def get_tenant_or_404(user: dict, db: AsyncSession) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.owner_id == user["sub"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Create a store first")
    return tenant


# ---------------------------------------------------------------------------
# Category endpoints
# ---------------------------------------------------------------------------

@router_categories.get("", response_model=list[CategoryResponse])
async def list_categories(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await get_tenant_or_404(user, db)
    result = await db.execute(
        select(Category)
        .where(Category.tenant_id == tenant.id)
        .order_by(Category.sort_order)
    )
    return result.scalars().all()


@router_categories.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await get_tenant_or_404(user, db)
    category = Category(**body.model_dump(), tenant_id=tenant.id)
    db.add(category)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A category with this slug already exists for your store",
        )
    await db.refresh(category)
    return category


# ---------------------------------------------------------------------------
# Product endpoints
# ---------------------------------------------------------------------------

@router_products.get("", response_model=list[ProductResponse])
async def list_products(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await get_tenant_or_404(user, db)
    result = await db.execute(
        select(Product)
        .where(Product.tenant_id == tenant.id)
        .order_by(Product.sort_order)
    )
    return result.scalars().all()


@router_products.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await get_tenant_or_404(user, db)
    product = Product(**body.model_dump(), tenant_id=tenant.id)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router_products.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    body: ProductUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await get_tenant_or_404(user, db)
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    await db.commit()
    await db.refresh(product)
    return product


@router_products.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant = await get_tenant_or_404(user, db)
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.tenant_id == tenant.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    await db.delete(product)
    await db.commit()
