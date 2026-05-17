import uuid
from datetime import datetime, timezone

from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramBadRequest
from sqlalchemy import update

from app.core.bot_utils import get_tenant_bot
from app.core.database import AsyncSessionLocal
from app.models.order import Cart


async def send_cart_reminder(ctx: dict, chat_id: int, tenant_id: str | None = None) -> None:
    tenant_bot: Bot | None = None
    if tenant_id:
        tenant_bot = await get_tenant_bot(tenant_id)

    bot: Bot = tenant_bot or ctx["bot"]

    try:
        await bot.send_message(
            chat_id=chat_id,
            text=(
                "🛒 Вы забыли о своей корзине!\n\n"
                "Товары ждут вас. Оформите заказ, пока они не закончились."
            ),
        )
        if tenant_id:
            async with AsyncSessionLocal() as db:
                now = datetime.now(timezone.utc)
                await db.execute(
                    update(Cart)
                    .where(
                        Cart.tenant_id == uuid.UUID(tenant_id),
                        Cart.telegram_user_id == chat_id,
                        Cart.recovered == False,  # noqa: E712
                    )
                    .values(abandoned=True, abandoned_at=now, recovery_sent_at=now)
                )
                await db.commit()
    except (TelegramForbiddenError, TelegramBadRequest):
        pass
    finally:
        if tenant_bot:
            await tenant_bot.session.close()
