from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantResponse

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("", response_model=TenantResponse, status_code=201)
async def create_tenant(
    body: TenantCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Tenant).where(Tenant.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Slug already taken")
    tenant = Tenant(**body.model_dump(), owner_id=user["sub"])
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.get("/me", response_model=TenantResponse)
async def get_my_tenant(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.owner_id == user["sub"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(404, "No tenant found")
    return tenant
