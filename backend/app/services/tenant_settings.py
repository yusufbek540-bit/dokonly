from collections.abc import Mapping


TOP_LEVEL_TENANT_FIELDS = {
    "name",
    "description",
    "logo_url",
    "cover_url",
    "accent_color",
    "typography_bundle",
}

JSON_SETTINGS_FIELDS = {
    "layout",
    "channel_username",
    "channel_subscription_gate",
    "channel_id",
    "crosspost_channel",
    "auto_crosspost",
    "crosspost_template",
    "delivery_methods",
    "payment_methods",
    "manual_transfer",
    "transfer_card_number",
    "transfer_card_holder",
    "min_order_amount",
    "required_checkout_fields",
    "order_confirmation_message",
    "return_policy",
    "notify_group_chat_id",
    "owner_tg_id",
    "notification_preferences",
    "default_language",
    "supported_languages",
    "welcome_message",
    "bot_menu_text",
    "bot_commands",
    "analytics_weekly_email",
    "stories_enabled",
    "stories_style",
    "featured_banner_enabled",
    "featured_banner_autorotate",
    "trust_strip_enabled",
    "trust_strip_items",
    "show_trust_strip",
    "categories_enabled",
    "categories_style",
    "product_collections",
    "card_style",
    "card_columns",
    "about_block_enabled",
    "reviews_enabled",
    "reviews_min_rating",
    "recently_viewed_enabled",
    "show_dokonly_branding",
    "loyalty_enabled",
}


def apply_tenant_settings_update(tenant, body: Mapping[str, object]) -> None:
    settings = dict(getattr(tenant, "settings", None) or {})

    for key in TOP_LEVEL_TENANT_FIELDS:
        if key in body:
            setattr(tenant, key, body[key])

    if "contact_info" in body:
        incoming = body["contact_info"]
        if isinstance(incoming, Mapping):
            tenant.contact_info = {
                **(getattr(tenant, "contact_info", None) or {}),
                **dict(incoming),
            }

    for key in JSON_SETTINGS_FIELDS:
        if key in body:
            settings[key] = body[key]

    if "accent_color" in body:
        settings["accent_color"] = body["accent_color"]
    if "typography_bundle" in body:
        settings["typography_bundle"] = body["typography_bundle"]

    tenant.settings = settings
