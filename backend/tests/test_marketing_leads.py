from datetime import UTC, datetime
from importlib import import_module
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import settings
from app.models.marketing import MarketingLead
from app.schemas.marketing import MarketingLeadCreate
from app.schemas.tenant import TenantCreate, normalize_tenant_slug
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


def test_marketing_lead_schema_rejects_whitespace_contact():
    with pytest.raises(ValidationError, match="telegram_username, phone, or email is required"):
        MarketingLeadCreate(
            **_valid_lead_payload(telegram_username="   ", phone="\t", email="\n")
        )


def test_marketing_lead_schema_rejects_whitespace_required_fields():
    with pytest.raises(ValidationError):
        MarketingLeadCreate(**_valid_lead_payload(name="   "))

    with pytest.raises(ValidationError):
        MarketingLeadCreate(**_valid_lead_payload(niche="   "))

    with pytest.raises(ValidationError):
        MarketingLeadCreate(**_valid_lead_payload(source_page="   "))


def test_marketing_lead_schema_accepts_telegram_contact():
    lead = MarketingLeadCreate(**_valid_lead_payload(telegram_username="  @aziz  "))

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


def test_create_marketing_lead_returns_201_when_alert_fails(monkeypatch, caplog):
    monkeypatch.setattr(settings, "database_url", "postgresql+asyncpg://user:password@localhost/test")
    monkeypatch.setattr(settings, "telegram_bot_token", "123456:TEST")

    public = import_module("app.api.v1.endpoints.public")
    database = import_module("app.core.database")

    class FakeSession:
        def add(self, lead):
            self.lead = lead

        async def commit(self):
            return None

        async def refresh(self, lead):
            lead.id = uuid4()
            lead.created_at = datetime.now(UTC)

    async def override_db():
        yield FakeSession()

    async def failing_alert(_lead):
        raise RuntimeError("https://api.telegram.org/botSECRET/sendMessage")

    app = FastAPI()
    app.include_router(public.router)
    app.dependency_overrides[database.get_db] = override_db
    monkeypatch.setattr(public, "send_marketing_lead_alert", failing_alert)

    with caplog.at_level("WARNING", logger=public.logger.name):
        response = TestClient(app).post("/public/leads", json=_valid_lead_payload())

    assert response.status_code == 201
    assert response.json()["id"]
    assert "Marketing lead alert failed" in caplog.text
    assert "SECRET" not in caplog.text
    assert "api.telegram.org" not in caplog.text


def test_create_marketing_lead_rate_limits_by_client(monkeypatch):
    monkeypatch.setattr(settings, "marketing_lead_rate_limit_per_hour", 1)

    public = import_module("app.api.v1.endpoints.public")
    database = import_module("app.core.database")
    public._lead_request_log.clear()

    class FakeSession:
        def add(self, lead):
            self.lead = lead

        async def commit(self):
            return None

        async def refresh(self, lead):
            lead.id = uuid4()
            lead.created_at = datetime.now(UTC)

    async def override_db():
        yield FakeSession()

    async def noop_alert(_lead):
        return None

    app = FastAPI()
    app.include_router(public.router)
    app.dependency_overrides[database.get_db] = override_db
    monkeypatch.setattr(public, "send_marketing_lead_alert", noop_alert)

    client = TestClient(app)
    assert client.post("/public/leads", json=_valid_lead_payload()).status_code == 201
    assert client.post("/public/leads", json=_valid_lead_payload()).status_code == 429


def test_reserved_tenant_slugs_are_rejected():
    with pytest.raises(ValueError, match="reserved"):
        normalize_tenant_slug("blog")

    with pytest.raises(ValidationError, match="reserved"):
        TenantCreate(name="Store", slug="Kontakt")

    assert normalize_tenant_slug("my-store-1") == "my-store-1"
