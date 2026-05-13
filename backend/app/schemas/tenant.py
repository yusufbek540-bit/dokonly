from pydantic import BaseModel
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

    model_config = {"from_attributes": True}
