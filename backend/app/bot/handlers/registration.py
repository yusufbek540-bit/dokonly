import re
import uuid

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal
from app.core.miniapp_urls import master_miniapp_url, shop_miniapp_url
from app.models.tenant import Tenant as TenantModel
from app.schemas.tenant import normalize_tenant_slug
from app.services.dashboard_login import create_dashboard_login_url

router = Router()


def _telegram_owner_id(telegram_user_id: int) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_X500, f"telegram:{telegram_user_id}")

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


def _safe_slug(text: str) -> str:
    slug = _make_slug(text)
    try:
        return normalize_tenant_slug(slug)
    except ValueError:
        return f"{slug}-shop"


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
    slug = _safe_slug(message.text)
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
        try:
            slug = normalize_tenant_slug(_make_slug(text))
        except ValueError as exc:
            await message.answer(str(exc))
            return

    owner_id = _telegram_owner_id(message.from_user.id)
    dashboard_login_url = ""
    async with AsyncSessionLocal() as db:
        tenant = TenantModel(
            owner_id=owner_id,
            name=data["name"],
            slug=slug,
            currency="UZS",
        )
        db.add(tenant)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            await message.answer("Этот адрес уже занят. Попробуйте другой.")
            return
        await db.refresh(tenant)
        dashboard_login_url = await create_dashboard_login_url(db, tenant)
        await db.commit()

    await state.clear()
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🖥 Открыть web dashboard", url=dashboard_login_url)],
        [InlineKeyboardButton(text="⚙️ Открыть Telegram-панель", web_app=WebAppInfo(url=master_miniapp_url()))],
        [InlineKeyboardButton(text="🛍 Посмотреть витрину", web_app=WebAppInfo(url=shop_miniapp_url(slug)))],
    ])
    await message.answer(
        f"🎉 Магазин <b>{data['name']}</b> создан!\n"
        f"Ссылка для покупателей: <code>{shop_miniapp_url(slug)}</code>\n\n"
        f"Откройте панель, чтобы добавить товары и настроить витрину.",
        reply_markup=kb,
    )
