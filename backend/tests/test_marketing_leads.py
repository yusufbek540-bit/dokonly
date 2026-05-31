import pytest
from pydantic import ValidationError

from app.models.marketing import MarketingLead
from app.schemas.marketing import MarketingLeadCreate
from app.services.marketing_leads import format_marketing_lead_alert


def _valid_lead_payload(**overrides):
    payload = {
        "locale": "ru",
        "name": "Aziz",
        "telegram_username": "@aziz",
        "niche": "clothing",
        "source_page": "https://dokonly.com/",
    }
    payload.update(overrides)
    return payload


def test_marketing_lead_schema_rejects_missing_contact():
    with pytest.raises(ValidationError, match="telegram_username, phone, or email is required"):
        MarketingLeadCreate(
            **_valid_lead_payload(telegram_username=None, phone=None, email=None)
        )


def test_marketing_lead_schema_accepts_telegram_contact():
    lead = MarketingLeadCreate(**_valid_lead_payload())

    assert lead.telegram_username == "@aziz"
    assert lead.locale == "ru"


def test_format_marketing_lead_alert_contains_key_fields():
    lead = MarketingLead(
        name="Aziz",
        niche="clothing",
        source_page="https://dokonly.com/ru",
        telegram_username="@aziz",
        business_name="Aziz Shop",
        monthly_order_volume="100-300",
        utm_campaign="spring",
    )

    alert = format_marketing_lead_alert(lead)

    assert "Новая заявка Dokonly" in alert
    assert "Имя: Aziz" in alert
    assert "Ниша: clothing" in alert
    assert "Страница: https://dokonly.com/ru" in alert
    assert "Telegram: @aziz" in alert
    assert "Бизнес: Aziz Shop" in alert
    assert "Заказы в месяц: 100-300" in alert
    assert "UTM campaign: spring" in alert
