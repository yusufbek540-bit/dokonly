from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant

# Cache bot_id → bot_username to avoid an API call on every update
_bot_username_cache: dict[int, str] = {}


class TenantMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        data["tenant"] = None
        bot = data.get("bot")
        if bot:
            try:
                bot_id = int(bot.token.split(":")[0])
                if bot_id not in _bot_username_cache:
                    bot_info = await bot.get_me()
                    _bot_username_cache[bot_id] = bot_info.username
                username = _bot_username_cache[bot_id]
                async with AsyncSessionLocal() as db:
                    result = await db.execute(
                        select(Tenant).where(Tenant.bot_username == username)
                    )
                    data["tenant"] = result.scalar_one_or_none()
            except Exception:
                pass  # tenant stays None; handlers check for None
        return await handler(event, data)
