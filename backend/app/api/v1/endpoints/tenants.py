from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.tenant import Tenant
from app.schemas.tenant import ManualTransferSettings, TenantCreate, TenantResponse

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
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already taken")
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


@router.post("/me/payment/manual-transfer", status_code=status.HTTP_200_OK)
async def set_manual_transfer(
    body: ManualTransferSettings,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tenant).where(Tenant.owner_id == user["sub"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No tenant found")
    settings = dict(tenant.settings or {})
    settings["manual_transfer"] = body.model_dump()
    tenant.settings = settings
    await db.commit()
    return {"ok": True}
