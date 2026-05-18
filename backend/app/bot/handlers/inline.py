import uuid

from aiogram import Router
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InlineQuery,
    InlineQueryResultArticle,
    InlineQueryResultPhoto,
    InputTextMessageContent,
    LinkPreviewOptions,
)
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import Product
from app.models.tenant import Tenant

router = Router()

MINIAPP_BASE = "https://dokonly-miniapp.pages.dev"


def _fmt_price(price: float, currency: str) -> str:
    if currency == "UZS":
        return f"{int(price):,} сум".replace(",", " ")
    return f"{price:,.2f} {currency}"


@router.inline_query()
async def handle_product_inline_query(query: InlineQuery, tenant: Tenant | None):
    q = query.query.strip()

    # Only handle if we have a tenant context and a query that looks like a product ID
    if not tenant or not q:
        await query.answer([], cache_time=10)
        return

    # Query is a product UUID (sent by frontend via switchInlineQuery)
    try:
        product_id = uuid.UUID(q)
    except ValueError:
        await query.answer([], cache_time=10)
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Product).where(
                Product.id == product_id,
                Product.tenant_id == tenant.id,
                Product.is_active == True,  # noqa: E712
            )
        )
        product = result.scalar_one_or_none()

    if not product:
        await query.answer([], cache_time=10)
        return

    shop_url = f"{MINIAPP_BASE}?shop={tenant.slug}"
    deep_link = (
        f"https://t.me/{tenant.bot_username}?startapp=product_{product.id}"
        if tenant.bot_username
        else shop_url
    )

    price_str = _fmt_price(float(product.price), product.currency)

    discount_line = ""
    if product.compare_at_price and float(product.compare_at_price) > float(product.price):
        pct = round((1 - float(product.price) / float(product.compare_at_price)) * 100)
        discount_line = f" 🔥 -{pct}%"

    caption = (
        f"<b>{product.name}</b>{discount_line}\n\n"
        f"💰 <b>{price_str}</b>\n\n"
        f"🏪 {tenant.name}"
    )

    open_btn = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🛍 Открыть магазин", url=deep_link)
    ]])

    if product.images:
        photo_url = product.images[0]
        result_item = InlineQueryResultPhoto(
            id=str(product.id),
            photo_url=photo_url,
            thumbnail_url=photo_url,
            title=product.name,
            description=f"{price_str} · {tenant.name}",
            caption=caption,
            parse_mode="HTML",
            reply_markup=open_btn,
        )
    else:
        result_item = InlineQueryResultArticle(
            id=str(product.id),
            title=product.name,
            description=f"{price_str} · {tenant.name}",
            input_message_content=InputTextMessageContent(
                message_text=caption,
                parse_mode="HTML",
                link_preview_options=LinkPreviewOptions(
                    url=deep_link,
                    prefer_large_media=True,
                    show_above_text=True,
                ),
            ),
            reply_markup=open_btn,
        )

    await query.answer([result_item], cache_time=300, is_personal=True)
