import hashlib
import hmac
import json
import urllib.parse
import uuid

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from app.core.config import settings
from app.core.database import get_db

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _owner_id_from_tg(telegram_user_id: int) -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_X500, f"telegram:{telegram_user_id}")


def _csv_values(value: str) -> set[str]:
    return {item.strip() for item in value.split(",") if item.strip()}


def is_platform_admin_owner_id(owner_id: str | uuid.UUID) -> bool:
    owner_id_str = str(owner_id)
    if owner_id_str in _csv_values(settings.platform_admin_owner_ids):
        return True

    for telegram_id in _csv_values(settings.platform_admin_telegram_ids):
        try:
            if str(_owner_id_from_tg(int(telegram_id))) == owner_id_str:
                return True
        except ValueError:
            continue
    return False


def get_platform_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if user.get("is_platform_admin") is True or is_platform_admin_owner_id(str(user.get("sub", ""))):
        return user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform admin access required")


def _validate_init_data(init_data: str, bot_token: str | None = None) -> dict | None:
    """Validate Telegram WebApp initData and return the user dict.

    Pass bot_token to validate against a specific bot (e.g. a merchant's own bot).
    Defaults to the platform master bot token.
    """
    if not settings.is_production and init_data.startswith("mock:"):
        try:
            return json.loads(urllib.parse.unquote(init_data.removeprefix("mock:")))
        except Exception:
            return None

    effective_token = bot_token or settings.telegram_bot_token
    if not effective_token:
        return None
    try:
        params = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    except Exception:
        return None
    hash_ = params.pop("hash", None)
    if not hash_:
        return None
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", effective_token.encode(), hashlib.sha256).digest()
    computed = hmac.new(secret_key, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(computed, hash_):
        return None
    user_str = params.get("user")
    if not user_str:
        return None
    try:
        return json.loads(user_str)
    except Exception:
        return None


def _parse_tg_user_id(init_data: str) -> int | None:
    """Extract Telegram user ID from initData without validating the HMAC."""
    try:
        params = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
        user_str = params.get("user")
        if user_str:
            return json.loads(user_str).get("id")
    except Exception:
        pass
    return None


async def get_tg_user(
    x_telegram_init_data: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Auth dependency for Mini App seller endpoints — validates Telegram initData.

    Tries the platform master bot token first.  If that fails (seller opened via
    their own merchant bot), looks up the tenant that owns this Telegram user and
    re-validates against that tenant's encrypted bot token.
    """
    if not x_telegram_init_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Telegram initData")

    tg_user = _validate_init_data(x_telegram_init_data)

    if tg_user is None:
        # Dev mode: no master bot token — accept any initData for local testing
        if not settings.telegram_bot_token:
            try:
                params = dict(urllib.parse.parse_qsl(x_telegram_init_data))
                user_str = params.get("user", '{"id":0}')
                tg_user = json.loads(user_str)
            except Exception:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData")
        else:
            # Master bot validation failed — try the tenant's own bot token.
            # Parse the user ID without HMAC to look up which tenant this user owns.
            raw_tg_id = _parse_tg_user_id(x_telegram_init_data)
            if raw_tg_id is not None:
                from app.models.tenant import Tenant
                from app.core.crypto import decrypt
                owner_id = _owner_id_from_tg(raw_tg_id)
                result = await db.execute(
                    select(Tenant).where(Tenant.owner_id == owner_id, Tenant.is_active == True)  # noqa: E712
                )
                tenant = result.scalar_one_or_none()
                if tenant and tenant.bot_token_enc:
                    try:
                        raw_token = decrypt(tenant.bot_token_enc)
                        tg_user = _validate_init_data(x_telegram_init_data, bot_token=raw_token)
                    except Exception:
                        pass

            if tg_user is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData")

    mock_owner_id = tg_user.get("_mock_owner_id") if not settings.is_production else None
    owner_id = uuid.UUID(mock_owner_id) if mock_owner_id else _owner_id_from_tg(tg_user["id"])
    return {"sub": str(owner_id), "tg_id": tg_user["id"], "tg_user": tg_user}
