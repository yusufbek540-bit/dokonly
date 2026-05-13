from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🏪 Создать магазин", callback_data="register_shop"),
        InlineKeyboardButton(text="📦 Мои заказы", callback_data="my_orders"),
    ]])
    await message.answer(
        "👋 Добро пожаловать в <b>Dokonly</b>!\n\n"
        "Создайте Telegram-магазин за 5 минут — без сайта, без программистов.",
        reply_markup=kb,
    )
