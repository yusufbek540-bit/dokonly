from types import SimpleNamespace
from uuid import uuid4


def test_apply_tenant_settings_update_persists_visible_seller_settings():
    from app.services.tenant_settings import apply_tenant_settings_update

    tenant = SimpleNamespace(
        name="Old Store",
        description="Old description",
        logo_url=None,
        cover_url=None,
        accent_color="emerald",
        typography_bundle="modern",
        contact_info={"phone": "+998 90 000 00 00"},
        settings={"payment_methods": ["cash"]},
    )

    apply_tenant_settings_update(
        tenant,
        {
            "name": "New Store",
            "description": "New description",
            "logo_url": "https://cdn.example/logo.png",
            "cover_url": "https://cdn.example/cover.png",
            "accent_color": "orange",
            "typography_bundle": "warm",
            "contact_info": {"telegram": "@new_store"},
            "layout": "bento",
            "notification_preferences": {"new_orders": True},
            "default_language": "uz",
            "supported_languages": ["ru", "uz"],
            "bot_menu_text": "🛍 Магазин",
            "bot_commands": [{"command": "catalog", "description": "Каталог"}],
            "analytics_weekly_email": True,
            "stories_enabled": False,
            "featured_banner_enabled": False,
            "card_style": "photo",
            "card_columns": 1,
            "reviews_enabled": False,
            "recently_viewed_enabled": False,
            "return_policy": "7 дней",
            "required_checkout_fields": ["name", "phone", "address"],
            "owner_tg_id": "733400880",
        },
    )

    assert tenant.name == "New Store"
    assert tenant.description == "New description"
    assert tenant.logo_url == "https://cdn.example/logo.png"
    assert tenant.cover_url == "https://cdn.example/cover.png"
    assert tenant.accent_color == "orange"
    assert tenant.typography_bundle == "warm"
    assert tenant.contact_info == {
        "phone": "+998 90 000 00 00",
        "telegram": "@new_store",
    }
    assert tenant.settings["payment_methods"] == ["cash"]
    assert tenant.settings["layout"] == "bento"
    assert tenant.settings["notification_preferences"] == {"new_orders": True}
    assert tenant.settings["default_language"] == "uz"
    assert tenant.settings["supported_languages"] == ["ru", "uz"]
    assert tenant.settings["bot_menu_text"] == "🛍 Магазин"
    assert tenant.settings["bot_commands"] == [{"command": "catalog", "description": "Каталог"}]
    assert tenant.settings["analytics_weekly_email"] is True
    assert tenant.settings["stories_enabled"] is False
    assert tenant.settings["featured_banner_enabled"] is False
    assert tenant.settings["card_style"] == "photo"
    assert tenant.settings["card_columns"] == 1
    assert tenant.settings["reviews_enabled"] is False
    assert tenant.settings["recently_viewed_enabled"] is False
    assert tenant.settings["return_policy"] == "7 дней"
    assert tenant.settings["required_checkout_fields"] == ["name", "phone", "address"]
    assert tenant.settings["owner_tg_id"] == "733400880"


def test_miniapp_url_helpers_use_configured_base_url(monkeypatch):
    from app.core.config import settings
    from app.core.miniapp_urls import master_miniapp_url, product_miniapp_url, shop_miniapp_url

    product_id = uuid4()
    monkeypatch.setattr(settings, "miniapp_url", "https://demo.example/miniapp/")

    assert master_miniapp_url() == "https://demo.example/miniapp"
    assert shop_miniapp_url("test-shop") == "https://demo.example/miniapp?shop=test-shop"
    assert product_miniapp_url("test-shop", product_id) == (
        f"https://demo.example/miniapp?shop=test-shop&product={product_id}"
    )


def test_public_shop_payload_exposes_saved_layout():
    from app.api.v1.endpoints.shop import _public_shop_payload

    tenant_id = uuid4()
    tenant = SimpleNamespace(
        id=tenant_id,
        name="Demo Store",
        currency="UZS",
        logo_url=None,
        cover_url=None,
        accent_color="emerald",
        typography_bundle="modern",
        description="Demo",
        contact_info={},
        settings={"layout": "marketplace"},
        bot_username="demo_bot",
    )

    payload = _public_shop_payload(tenant)

    assert payload["id"] == str(tenant_id)
    assert payload["layout"] == "marketplace"
    assert payload["settings"]["layout"] == "marketplace"
