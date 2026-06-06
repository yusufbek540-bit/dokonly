import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.miniapp_urls import shop_miniapp_url
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


@router.post("/me/configure-bot", status_code=status.HTTP_200_OK)
async def configure_bot_menu(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.core.crypto import decrypt
    result = await db.execute(select(Tenant).where(Tenant.owner_id == user["sub"]))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No tenant found")
    if not tenant.bot_token_enc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No merchant bot configured. Set up your own bot first.")

    try:
        raw_token = decrypt(tenant.bot_token_enc)
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to decrypt bot token")

    mini_app_url = shop_miniapp_url(tenant.slug)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{raw_token}/setChatMenuButton",
            json={"menu_button": {"type": "web_app", "text": "Открыть магазин", "web_app": {"url": mini_app_url}}},
        )
    return {"ok": resp.status_code == 200, "url": mini_app_url}
