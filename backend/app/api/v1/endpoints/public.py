"""
Public (unauthenticated) endpoints — help articles, etc.
"""
import logging
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.marketing import MarketingLead
from app.schemas.marketing import MarketingLeadCreate, MarketingLeadResponse
from app.services.marketing_leads import send_marketing_lead_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public", tags=["public"])
_lead_request_log: dict[str, deque[datetime]] = defaultdict(deque)


def _alert_failure_status(exc: Exception) -> int | None:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code
    return None


def _client_key(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


def _check_lead_rate_limit(request: Request) -> None:
    limit = settings.marketing_lead_rate_limit_per_hour
    if limit <= 0:
        return

    now = datetime.now(UTC)
    window_start = now - timedelta(hours=1)
    requests = _lead_request_log[_client_key(request)]
    while requests and requests[0] < window_start:
        requests.popleft()

    if len(requests) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many lead requests",
        )

    requests.append(now)


@router.post("/leads", response_model=MarketingLeadResponse, status_code=status.HTTP_201_CREATED)
async def create_marketing_lead(
    request: Request,
    body: MarketingLeadCreate,
    db: AsyncSession = Depends(get_db),
):
    _check_lead_rate_limit(request)

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
