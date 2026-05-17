"""One-time script: update all merchant bot menu buttons to permanent miniapp URL."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.crypto import decrypt as decrypt_token
from app.models.tenant import Tenant
from aiogram import Bot
from aiogram.types import MenuButtonWebApp, WebAppInfo


async def main():
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Tenant).where(Tenant.bot_token_enc.isnot(None))
        )
        tenants = result.scalars().all()

    print(f"Found {len(tenants)} tenants with bots")
    miniapp_url = settings.miniapp_url

    for tenant in tenants:
        try:
            raw_token = decrypt_token(tenant.bot_token_enc)
            bot = Bot(token=raw_token)
            url = f"{miniapp_url}?shop={tenant.slug}"
            await bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(text="Магазин", web_app=WebAppInfo(url=url))
            )
            info = await bot.get_me()
            print(f"  ✅ @{info.username} ({tenant.slug}) → {url}")
            await bot.session.close()
        except Exception as e:
            print(f"  ❌ {tenant.slug}: {e}")


if __name__ == "__main__":
    asyncio.run(main())
