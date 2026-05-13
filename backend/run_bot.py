import asyncio

import app.bot.handlers  # noqa: F401 — registers routers and middleware into dp
from app.bot.setup import bot, dp


async def main():
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
