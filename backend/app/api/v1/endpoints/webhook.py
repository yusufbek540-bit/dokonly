from aiogram import Bot
from aiogram.types import Update
from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app.bot.setup import bot, dp
from app.core.crypto import decrypt
from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant

router = APIRouter(prefix="/webhook", tags=["webhook"])


@router.post("/telegram")
async def telegram_webhook(request: Request):
    """Webhook for the Dokonly master bot."""
    data = await request.json()
    update = Update(**data)
    await dp.feed_update(bot, update)
    return {"ok": True}


@router.post("/merchant/{token_hash}")
async def merchant_webhook(token_hash: str, request: Request):
    """
    Webhook for a specific merchant's bot, routed by SHA-256(bot_token).
    Each merchant has their own bot — this endpoint dispatches the update
    using that merchant's Bot instance (constructed from the decrypted token).
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Tenant).where(Tenant.bot_token_hash == token_hash)
        )
        tenant = result.scalar_one_or_none()

    if not tenant or not tenant.bot_token_enc:
        raise HTTPException(404, "Unknown bot")

    raw_token = decrypt(tenant.bot_token_enc)
    merchant_bot = Bot(token=raw_token)

    try:
        data = await request.json()
        update = Update(**data)
        # Re-use the same dispatcher (dp) — handlers can inspect bot.id to get tenant context
        await dp.feed_update(merchant_bot, update)
    finally:
        await merchant_bot.session.close()

    return {"ok": True}
