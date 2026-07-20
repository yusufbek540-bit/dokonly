import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import is_platform_admin_owner_id
from app.core.config import settings
from app.models.auth import DashboardLoginToken
from app.models.tenant import Tenant


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_dashboard_login_url(db: AsyncSession, tenant: Tenant) -> str:
    raw_token = secrets.token_urlsafe(32)
    login_token = DashboardLoginToken(
        tenant_id=tenant.id,
        owner_id=tenant.owner_id,
        token_hash=_hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    db.add(login_token)
    await db.flush()
    return f"{settings.dashboard_url.rstrip('/')}?telegram_token={raw_token}"


async def exchange_dashboard_login_token(db: AsyncSession, raw_token: str) -> dict | None:
    token_hash = _hash_token(raw_token)
    result = await db.execute(
        select(DashboardLoginToken).where(DashboardLoginToken.token_hash == token_hash)
    )
    login_token = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if not login_token or login_token.used_at is not None or login_token.expires_at < now:
        return None

    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == login_token.tenant_id, Tenant.is_active == True)  # noqa: E712
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        return None

    login_token.used_at = now
    access_token = jwt.encode(
        {
            "sub": str(login_token.owner_id),
            "aud": "authenticated",
            "role": "authenticated",
            "email": f"telegram-owner-{login_token.owner_id}@dokonly.local",
            "telegram_dashboard_login": True,
            "is_platform_admin": is_platform_admin_owner_id(login_token.owner_id),
            "tenant_id": str(tenant.id),
            "exp": int(time.time()) + 60 * 60 * 24 * 7,
        },
        settings.supabase_jwt_secret,
        algorithm="HS256",
    )
    await db.flush()
    return {"access_token": access_token, "token_type": "bearer", "tenant_slug": tenant.slug}
