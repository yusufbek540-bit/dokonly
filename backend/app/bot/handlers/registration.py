import re

from aiogram import Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

router = Router()


class RegStates(StatesGroup):
    waiting_name = State()
    waiting_slug = State()


@router.callback_query(lambda c: c.data == "register_shop")
async def start_registration(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Как называется ваш магазин? (например: Мой Цветочный)")
    await state.set_state(RegStates.waiting_name)
    await callback.answer()


@router.message(RegStates.waiting_name)
async def got_name(message: Message, state: FSMContext):
    await state.update_data(name=message.text)
    slug = re.sub(r"[^a-z0-9-]", "-", message.text.lower())[:50]
    await state.update_data(suggested_slug=slug)
    bot_info = await message.bot.me()
    await message.answer(
        f"Отлично! Ваш магазин будет доступен по ссылке:\n"
        f"<code>t.me/{bot_info.username}?start={slug}</code>\n\n"
        f"Подходит? Отправьте <b>да</b> или введите другое короткое имя (только латиница и цифры)."
    )
    await state.set_state(RegStates.waiting_slug)


@router.message(RegStates.waiting_slug)
async def got_slug(message: Message, state: FSMContext):
    data = await state.get_data()
    text = message.text.strip()
    if text.lower() in ("да", "yes", "+"):
        slug = data["suggested_slug"]
    else:
        slug = re.sub(r"[^a-z0-9-]", "-", text.lower())[:50]
    await state.clear()
    await message.answer(
        f"🎉 Магазин <b>{data['name']}</b> создан!\n\n"
        f"Поделитесь ссылкой с покупателями и начните добавлять товары."
    )
