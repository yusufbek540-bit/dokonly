from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AwareDatetime, BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.promo import PromoCode
from app.models.tenant import Tenant

router = APIRouter(prefix="/promo-codes", tags=["promo-codes"])


class PromoCodeCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    discount_type: Literal["percent", "fixed"]
    discount_value: Decimal = Field(gt=0)
    max_uses: int | None = Field(default=None, gt=0)
    expires_at: AwareDatetime | None = None

    @model_validator(mode="after")
    def check_percent_max(self) -> "PromoCodeCreate":
        if self.discount_type == "percent" and self.discount_value > 100:
            raise ValueError("Percent discount cannot exceed 100")
        return self


class PromoCodeResponse(BaseModel):
    id: UUID
    code: str
    discount_type: str
    discount_value: Decimal
    max_uses: int | None
    used_count: int
    expires_at: AwareDatetime | None
    is_active: bool

    model_config = {"from_attributes": True}


@router.post("", response_model=PromoCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_promo_code(
    body: PromoCodeCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_result = await db.execute(select(Tenant).where(Tenant.owner_id == user["sub"]))
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No tenant found")

    promo = PromoCode(
        tenant_id=tenant.id,
        code=body.code.upper(),
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        max_uses=body.max_uses,
        expires_at=body.expires_at,
    )
    db.add(promo)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code already exists for this shop",
        )
    await db.refresh(promo)
    return promo
