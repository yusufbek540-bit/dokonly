import re

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

router = Router()

_CYR_TO_LAT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def _make_slug(text: str) -> str:
    lowered = text.lower()
    transliterated = "".join(_CYR_TO_LAT.get(ch, ch) for ch in lowered)
    result = re.sub(r"[^a-z0-9-]", "-", transliterated)
    result = re.sub(r"-+", "-", result).strip("-")
    return result[:50] or "shop"


class RegStates(StatesGroup):
    waiting_name = State()
    waiting_slug = State()


@router.callback_query(F.data == "register_shop")
async def start_registration(callback: CallbackQuery, state: FSMContext):
    await callback.message.answer("Как называется ваш магазин? (например: Мой Цветочный)")
    await state.set_state(RegStates.waiting_name)
    await callback.answer()


@router.message(RegStates.waiting_name, F.text)
async def got_name(message: Message, state: FSMContext):
    await state.update_data(name=message.text)
    slug = _make_slug(message.text)
    await state.update_data(suggested_slug=slug)
    bot_info = await message.bot.me()
    await message.answer(
        f"Отлично! Ваш магазин будет доступен по ссылке:\n"
        f"<code>t.me/{bot_info.username}?start={slug}</code>\n\n"
        f"Подходит? Отправьте <b>да</b> или введите другое короткое имя (только латиница и цифры)."
    )
    await state.set_state(RegStates.waiting_slug)


@router.message(RegStates.waiting_slug, F.text)
async def got_slug(message: Message, state: FSMContext):
    data = await state.get_data()
    text = message.text.strip()
    if text.lower() in ("да", "yes", "+"):
        slug = data["suggested_slug"]
    else:
        slug = _make_slug(text)
    await state.update_data(slug=slug)
    data = await state.get_data()
    await state.clear()
    await message.answer(
        f"🎉 Магазин <b>{data['name']}</b> создан!\n"
        f"Ссылка для покупателей: <code>{slug}</code>\n\n"
        f"Поделитесь ссылкой с покупателями и начните добавлять товары."
    )
