import hashlib
import hmac
import json
import urllib.parse
import uuid

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.core.config import settings

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


def _validate_init_data(init_data: str) -> dict | None:
    """Validate Telegram WebApp initData and return the user dict."""
    try:
        params = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    except Exception:
        return None
    hash_ = params.pop("hash", None)
    if not hash_:
        return None
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(params.items()))
    secret_key = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
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


def get_tg_user(x_telegram_init_data: str = Header(default="")) -> dict:
    """Auth dependency for Mini App seller endpoints — validates Telegram initData."""
    if not x_telegram_init_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Telegram initData")
    tg_user = _validate_init_data(x_telegram_init_data)
    if tg_user is None:
        # In development with empty bot token, allow any initData for testing
        if not settings.telegram_bot_token:
            try:
                params = dict(urllib.parse.parse_qsl(x_telegram_init_data))
                user_str = params.get("user", '{"id":0}')
                tg_user = json.loads(user_str)
            except Exception:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData")
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram initData")
    owner_id = _owner_id_from_tg(tg_user["id"])
    return {"sub": str(owner_id), "tg_id": tg_user["id"], "tg_user": tg_user}
