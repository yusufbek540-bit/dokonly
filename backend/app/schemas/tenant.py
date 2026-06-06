import re
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

RESERVED_TENANT_SLUGS = {
    "api",
    "blog",
    "contact",
    "demo",
    "help",
    "kontakt",
    "namuna",
    "niches",
    "nishi",
    "pomoshch",
    "pricing",
    "ru",
    "sitemap.xml",
    "tarify",
    "uz",
}

TENANT_SLUG_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$")


def normalize_tenant_slug(slug: str) -> str:
    normalized = slug.strip().lower()
    if not normalized:
        raise ValueError("Slug is required")
    if not TENANT_SLUG_PATTERN.fullmatch(normalized):
        raise ValueError("Slug may contain only lowercase letters, numbers, and hyphens")
    if normalized in RESERVED_TENANT_SLUGS:
        raise ValueError("Slug is reserved")
    return normalized


class TenantCreate(BaseModel):
    name: str
    slug: str
    country: str = "UZ"
    currency: str = "UZS"
    locale: str = "ru"

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        return normalize_tenant_slug(value)


class TenantResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    country: str
    currency: str
    locale: str
    tier: str
    is_active: bool
    bot_username: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    accent_color: str = "emerald"
    typography_bundle: str = "modern"
    description: str | None = None
    contact_info: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)
    layout: str | None = None

    model_config = {"from_attributes": True}


class ManualTransferSettings(BaseModel):
    card_number: str = Field(min_length=1, max_length=50)
    card_holder: str = Field(min_length=1, max_length=100)
    bank_name: str = Field(min_length=1, max_length=100)
