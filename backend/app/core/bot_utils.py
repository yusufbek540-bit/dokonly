import uuid

from aiogram import Bot
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.tenant import Tenant


async def get_tenant_bot(tenant_id: str | uuid.UUID) -> Bot | None:
    """Return a Bot instance using the tenant's own bot token, or None if unavailable."""
    from app.core.crypto import decrypt

    tid = uuid.UUID(str(tenant_id))
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tenant).where(Tenant.id == tid))
        tenant = result.scalar_one_or_none()

    if tenant and tenant.bot_token_enc:
        try:
            raw_token = decrypt(tenant.bot_token_enc)
            return Bot(token=raw_token)
        except Exception:
            pass
    return None
