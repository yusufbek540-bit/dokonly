"""
Public (unauthenticated) endpoints — help articles, etc.
"""
import logging

import httpx
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.marketing import MarketingLead
from app.schemas.marketing import MarketingLeadCreate, MarketingLeadResponse
from app.services.marketing_leads import send_marketing_lead_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])


def _alert_failure_status(exc: Exception) -> int | None:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code
    return None


@router.post("/leads", response_model=MarketingLeadResponse, status_code=status.HTTP_201_CREATED)
async def create_marketing_lead(
    body: MarketingLeadCreate,
    db: AsyncSession = Depends(get_db),
):
    lead = MarketingLead(**body.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    try:
        await send_marketing_lead_alert(lead)
    except Exception as exc:
        logger.warning(
            "Marketing lead alert failed: type=%s status_code=%s",
            type(exc).__name__,
            _alert_failure_status(exc),
        )

    return lead


@router.get("/help-articles")
async def get_help_articles():
    return [
        {
            "id": "1",
            "slug": "how-to-order",
            "title": "Как сделать заказ",
            "category": "orders",
            "content": "1. Выберите товары\n2. Добавьте в корзину\n3. Оформите заказ",
        },
        {
            "id": "2",
            "slug": "payment-methods",
            "title": "Способы оплаты",
            "category": "payments",
            "content": "Принимаем: наличные при получении, перевод на карту, Telegram Stars.",
        },
        {
            "id": "3",
            "slug": "returns",
            "title": "Возврат товара",
            "category": "returns",
            "content": "Вы можете запросить возврат в течение 14 дней с момента получения заказа.",
        },
        {
            "id": "4",
            "slug": "delivery",
            "title": "Доставка",
            "category": "orders",
            "content": "Условия доставки устанавливает каждый продавец отдельно.",
        },
    ]
