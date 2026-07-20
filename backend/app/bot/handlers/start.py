import uuid

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.miniapp_urls import master_miniapp_url, product_miniapp_url, shop_miniapp_url
from app.models.product import Product
from app.models.tenant import Tenant
from app.services.dashboard_login import create_dashboard_login_url

router = Router()


def _telegram_owner_id(telegram_user_id: int) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_X500, f"telegram:{telegram_user_id}")


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
                shop_url = product_miniapp_url(tenant.slug, product.id)
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
        shop_url = shop_miniapp_url(tenant.slug)
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
        shop_url = shop_miniapp_url(tenant.slug)
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
    owner_id = _telegram_owner_id(message.from_user.id)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant).where(Tenant.owner_id == owner_id, Tenant.is_active == True)  # noqa: E712
        )
        existing_tenant = result.scalar_one_or_none()
        dashboard_login_url = (
            await create_dashboard_login_url(db, existing_tenant)
            if existing_tenant
            else None
        )
        await db.commit()

    existing_rows = []
    if existing_tenant and dashboard_login_url:
        existing_rows = [
            [InlineKeyboardButton(text="🖥 Открыть web dashboard", url=dashboard_login_url)],
            [InlineKeyboardButton(text="⚙️ Открыть Telegram-панель", web_app=WebAppInfo(url=master_miniapp_url()))],
            [InlineKeyboardButton(text="🛍 Посмотреть витрину", web_app=WebAppInfo(url=shop_miniapp_url(existing_tenant.slug)))],
        ]

    kb = InlineKeyboardMarkup(inline_keyboard=[
        *existing_rows,
        [InlineKeyboardButton(
            text="🛍 Открыть панель продавца",
            web_app=WebAppInfo(url=master_miniapp_url()),
        )],
        [InlineKeyboardButton(text="🏪 Создать магазин", callback_data="register_shop")],
    ])
    await message.answer(
        "👋 Добро пожаловать в <b>Dokonly</b>!\n\n"
        "Создайте Telegram-магазин за 5 минут — без сайта, без программистов.",
        reply_markup=kb,
    )
