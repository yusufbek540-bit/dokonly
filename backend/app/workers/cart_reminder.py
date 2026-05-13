from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError, TelegramBadRequest


async def send_cart_reminder(ctx: dict, chat_id: int) -> None:
    bot: Bot = ctx["bot"]
    try:
        await bot.send_message(
            chat_id=chat_id,
            text=(
                "🛒 Вы забыли о своей корзине!\n\n"
                "Товары ждут вас. Оформите заказ, пока они не закончились."
            ),
        )
    except (TelegramForbiddenError, TelegramBadRequest):
        pass  # User blocked the bot or chat not found — nothing to do
