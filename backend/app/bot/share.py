from html import escape


def product_share_caption(product, tenant, price_str: str, discount_line: str = "") -> str:
    shop_name = escape(str(getattr(tenant, "name", "") or "магазине"))
    product_name = escape(str(getattr(product, "name", "") or "Товар"))
    price = escape(str(price_str))
    discount = escape(str(discount_line or ""))

    return (
        f"Смотри, что я нашла на {shop_name}\n\n"
        f"<b>{product_name}</b>{discount}\n"
        f"{price}"
    )


def product_share_button_text(tenant) -> str:
    shop_name = str(getattr(tenant, "name", "") or "магазине").strip()
    return f"Открыть в {shop_name}"


def prepared_product_share_result(product, tenant, price_str: str, deep_link: str) -> dict:
    caption = product_share_caption(product, tenant, price_str)
    return {
        "type": "article",
        "id": f"share-product-{getattr(product, 'id')}",
        "title": str(getattr(product, "name", "") or "Товар"),
        "description": str(price_str),
        "input_message_content": {
            "message_text": caption,
            "parse_mode": "HTML",
            "link_preview_options": {"is_disabled": True},
        },
        "reply_markup": {
            "inline_keyboard": [[
                {"text": product_share_button_text(tenant), "url": deep_link}
            ]],
        },
    }
