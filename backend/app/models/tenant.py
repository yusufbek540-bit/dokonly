import uuid

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base, TimestampMixin


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    country = Column(String(2), nullable=False, default="UZ")
    currency = Column(String(3), nullable=False, default="UZS")
    locale = Column(String(5), nullable=False, default="ru")
    tier = Column(String(20), nullable=False, default="start")
    bot_token_enc = Column(Text)          # Fernet-encrypted bot token
    bot_token_hash = Column(String(64), unique=True)  # SHA-256 for routing
    bot_username = Column(String(100))
    logo_url = Column(Text)
    cover_url = Column(Text)
    accent_color = Column(String(20), nullable=False, default="emerald")
    typography_bundle = Column(String(20), nullable=False, default="modern")
    description = Column(Text)
    contact_info = Column(JSONB, default=dict)
    settings = Column(JSONB, default=dict)
    is_active = Column(Boolean, nullable=False, default=True)
