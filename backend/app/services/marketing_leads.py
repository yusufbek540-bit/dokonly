import logging

import httpx

from app.core.config import settings
from app.models.marketing import MarketingLead

logger = logging.getLogger(__name__)


def format_marketing_lead_alert(lead: MarketingLead) -> str:
    parts = [
        "Новая заявка Dokonly",
        f"Имя: {lead.name}",
        f"Ниша: {lead.niche}",
        f"Страница: {lead.source_page}",
    ]
    if lead.telegram_username:
        parts.append(f"Telegram: {lead.telegram_username}")
    if lead.phone:
        parts.append(f"Телефон: {lead.phone}")
    if lead.email:
        parts.append(f"Email: {lead.email}")
    if lead.business_name:
        parts.append(f"Бизнес: {lead.business_name}")
    if lead.monthly_order_volume:
        parts.append(f"Заказы в месяц: {lead.monthly_order_volume}")
    if lead.utm_campaign:
        parts.append(f"UTM campaign: {lead.utm_campaign}")
    return "\n".join(parts)


async def send_marketing_lead_alert(lead: MarketingLead) -> None:
    if not settings.telegram_bot_token or not settings.lead_alert_chat_id:
        return

    async with httpx.AsyncClient(timeout=5) as client:
        response = await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
            json={
                "chat_id": settings.lead_alert_chat_id,
                "text": format_marketing_lead_alert(lead),
            },
        )
        response.raise_for_status()
