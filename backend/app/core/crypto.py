"""
Symmetric encryption for sensitive fields stored in the DB (bot tokens, etc).
Key is derived from settings.secret_key using PBKDF2 so we can use any string as a key.
"""
import base64
import hashlib

from cryptography.fernet import Fernet

from app.core.config import settings


def _fernet() -> Fernet:
    # Derive a 32-byte key from secret_key, then base64url-encode for Fernet
    raw = hashlib.sha256(settings.secret_key.encode()).digest()
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode()).decode()
