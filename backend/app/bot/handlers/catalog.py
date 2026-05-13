from aiogram import F, Router
from aiogram.filters.callback_data import CallbackData
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.product import Product
from app.models.tenant import Tenant

router = Router()


class ProductCallback(CallbackData, prefix="prod"):
    product_id: str


@router.callback_query(F.data == "browse_catalog")
async def show_catalog(callback: CallbackQuery):
    async with AsyncSessionLocal() as db:
        bot_info = await callback.bot.me()
        result = await db.execute(
            select(Tenant).where(Tenant.bot_username == bot_info.username)
        )
        tenant = result.scalar_one_or_none()
        if not tenant:
            await callback.answer("Магазин не найден", show_alert=True)
            return

        products_result = await db.execute(
            select(Product)
            .where(Product.tenant_id == tenant.id, Product.is_active == True)  # noqa: E712
            .order_by(Product.sort_order)
            .limit(10)
        )
        products = products_result.scalars().all()

    if not products:
        await callback.message.answer("Каталог пуст. Добавьте товары через админ-панель.")
        await callback.answer()
        return

    buttons = [
        [InlineKeyboardButton(
            text=f"{p.name} — {int(p.price):,} {p.currency}",
            callback_data=ProductCallback(product_id=str(p.id)).pack(),
        )]
        for p in products
    ]
    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    await callback.message.answer("📦 Каталог товаров:", reply_markup=kb)
    await callback.answer()


@router.callback_query(ProductCallback.filter())
async def show_product(callback: CallbackQuery, callback_data: ProductCallback):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Product).where(Product.id == callback_data.product_id)
        )
        product = result.scalar_one_or_none()

    if not product:
        await callback.answer("Товар не найден", show_alert=True)
        return

    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🛒 Купить", callback_data=f"buy:{product.id}"),
        InlineKeyboardButton(text="◀ Назад", callback_data="browse_catalog"),
    ]])

    text = (
        f"<b>{product.name}</b>\n\n"
        f"{product.description or ''}\n\n"
        f"Цена: <b>{int(product.price):,} {product.currency}</b>"
    )
    if product.stock is not None:
        text += f"\nОстаток: {product.stock} шт."

    if product.images:
        await callback.message.answer_photo(product.images[0], caption=text, reply_markup=kb)
    else:
        await callback.message.answer(text, reply_markup=kb)
    await callback.answer()
