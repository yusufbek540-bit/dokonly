from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from app.bot.setup import bot
from app.core.config import settings
from app.workers.cart_reminder import send_cart_reminder

arq_pool: ArqRedis | None = None


async def init_pool() -> None:
    global arq_pool
    try:
        arq_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
    except Exception as e:
        import logging
        logging.warning(f"Redis unavailable, cart reminders disabled: {e}")


async def close_pool() -> None:
    global arq_pool
    if arq_pool:
        await arq_pool.aclose()
        arq_pool = None


async def _startup(ctx: dict) -> None:
    ctx["bot"] = bot


class WorkerSettings:
    functions = [send_cart_reminder]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    on_startup = _startup
