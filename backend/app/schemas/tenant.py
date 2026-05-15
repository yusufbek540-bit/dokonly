from pydantic import BaseModel, Field
from uuid import UUID


class TenantCreate(BaseModel):
    name: str
    slug: str
    country: str = "UZ"
    currency: str = "UZS"
    locale: str = "ru"


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

    model_config = {"from_attributes": True}


class ManualTransferSettings(BaseModel):
    card_number: str = Field(min_length=1, max_length=50)
    card_holder: str = Field(min_length=1, max_length=100)
    bank_name: str = Field(min_length=1, max_length=100)
