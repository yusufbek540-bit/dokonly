from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.dashboard_login import exchange_dashboard_login_token

router = APIRouter(prefix="/auth", tags=["auth"])


class TelegramDashboardLoginRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)


@router.post("/telegram-dashboard")
async def telegram_dashboard_login(
    body: TelegramDashboardLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await exchange_dashboard_login_token(db, body.token)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid or expired dashboard login link")
    await db.commit()
    return result
