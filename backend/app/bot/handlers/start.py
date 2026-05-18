import uuid

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import Product
from app.models.tenant import Tenant

router = Router()

MINIAPP_BASE = "https://dokonly-miniapp.pages.dev"


@router.message(CommandStart(deep_link=True))
async def cmd_start_deep_link(message: Message, command: CommandObject, tenant: Tenant | None):
    payload = command.args or ""

    # Handle product deep link: product_<uuid>
    if payload.startswith("product_") and tenant:
        raw_id = payload.removeprefix("product_")
        try:
            product_id = uuid.UUID(raw_id)
        except ValueError:
            product_id = None

        if product_id:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Product).where(
                        Product.id == product_id,
                        Product.tenant_id == tenant.id,
                        Product.is_active == True,  # noqa: E712
                    )
                )
                product = result.scalar_one_or_none()

            if product:
                shop_url = f"{MINIAPP_BASE}?shop={tenant.slug}&product={product.id}"
                kb = InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(
                        text="🛍 Открыть товар",
                        web_app=WebAppInfo(url=shop_url),
                    )
                ]])
                price_str = f"{int(product.price):,} сум".replace(",", " ")
                await message.answer(
                    f"<b>{product.name}</b>\n💰 {price_str}\n\n"
                    f"Нажмите кнопку ниже, чтобы открыть товар в магазине {tenant.name}.",
                    reply_markup=kb,
                    parse_mode="HTML",
                )
                return

    # Default start for merchant bots (with tenant)
    if tenant:
        shop_url = f"{MINIAPP_BASE}?shop={tenant.slug}"
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🛍 Открыть магазин",
                web_app=WebAppInfo(url=shop_url),
            )
        ]])
        await message.answer(
            f"👋 Добро пожаловать в <b>{tenant.name}</b>!\n\n"
            "Нажмите кнопку ниже, чтобы открыть магазин.",
            reply_markup=kb,
        )
        return

    # Default start for master bot (no tenant)
    await _send_master_welcome(message)


@router.message(CommandStart())
async def cmd_start(message: Message, tenant: Tenant | None):
    if tenant:
        shop_url = f"{MINIAPP_BASE}?shop={tenant.slug}"
        kb = InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(
                text="🛍 Открыть магазин",
                web_app=WebAppInfo(url=shop_url),
            )
        ]])
        await message.answer(
            f"👋 Добро пожаловать в <b>{tenant.name}</b>!\n\n"
            "Нажмите кнопку ниже, чтобы открыть магазин.",
            reply_markup=kb,
        )
        return

    await _send_master_welcome(message)


async def _send_master_welcome(message: Message) -> None:
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🛍 Открыть панель продавца",
            web_app=WebAppInfo(url=MINIAPP_BASE),
        )],
        [InlineKeyboardButton(text="🏪 Создать магазин", callback_data="register_shop")],
    ])
    await message.answer(
        "👋 Добро пожаловать в <b>Dokonly</b>!\n\n"
        "Создайте Telegram-магазин за 5 минут — без сайта, без программистов.",
        reply_markup=kb,
    )
