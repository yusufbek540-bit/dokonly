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
