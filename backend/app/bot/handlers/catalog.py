import io

from aiogram import F, Router
from aiogram.filters.callback_data import CallbackData
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from sqlalchemy import select

from app.ai.tasks.photo_import import extract_product_from_photo
from app.ai.tasks.voice_import import extract_products_from_text, transcribe_voice
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


@router.message(F.photo)
async def handle_photo_import(message: Message):
    await message.answer("🔍 Анализирую фото...")
    photo = message.photo[-1]
    file = await message.bot.get_file(photo.file_id)
    buf = io.BytesIO()
    await message.bot.download_file(file.file_path, buf)
    image_bytes = buf.getvalue()

    caption = message.caption or ""
    product_data = await extract_product_from_photo(image_bytes, caption)

    async with AsyncSessionLocal() as db:
        bot_info = await message.bot.me()
        result = await db.execute(select(Tenant).where(Tenant.bot_username == bot_info.username))
        tenant = result.scalar_one_or_none()
        if not tenant:
            await message.answer("Сначала создайте магазин через /start")
            return

        product = Product(
            tenant_id=tenant.id,
            name=product_data.name,
            description=product_data.description,
            price=product_data.price or 0,
            currency=tenant.currency,
        )
        db.add(product)
        await db.commit()

    await message.answer(
        f"✅ Товар добавлен!\n\n"
        f"<b>{product_data.name}</b>\n"
        f"{product_data.description or ''}\n"
        f"Цена: {product_data.price or 'не указана'}"
    )


@router.message(F.voice)
async def handle_voice_import(message: Message):
    await message.answer("🎤 Транскрибирую голосовое...")
    file = await message.bot.get_file(message.voice.file_id)
    buf = io.BytesIO()
    await message.bot.download_file(file.file_path, buf)

    text = await transcribe_voice(buf.getvalue())
    await message.answer(f"Распознано: <i>{text}</i>\n\nСоздаю товары...")

    products_data = await extract_products_from_text(text)

    async with AsyncSessionLocal() as db:
        bot_info = await message.bot.me()
        result = await db.execute(select(Tenant).where(Tenant.bot_username == bot_info.username))
        tenant = result.scalar_one_or_none()
        if not tenant:
            await message.answer("Сначала создайте магазин через /start")
            return

        created = []
        for pd in products_data:
            p = Product(
                tenant_id=tenant.id,
                name=pd["name"],
                description=pd.get("description"),
                price=pd.get("price") or 0,
                currency=tenant.currency,
            )
            db.add(p)
            created.append(pd["name"])
        await db.commit()

    await message.answer(
        f"✅ Создано {len(created)} товаров:\n" + "\n".join(f"• {n}" for n in created)
    )
