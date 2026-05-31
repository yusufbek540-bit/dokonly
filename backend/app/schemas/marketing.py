from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class MarketingLeadCreate(BaseModel):
    locale: str = Field(default="ru", pattern="^(ru|uz)$")
    name: str = Field(min_length=2, max_length=200)
    telegram_username: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=200)
    business_name: str | None = Field(default=None, max_length=200)
    niche: str = Field(min_length=2, max_length=100)
    monthly_order_volume: str | None = Field(default=None, max_length=100)
    message: str | None = Field(default=None, max_length=2000)
    source_page: str = Field(min_length=1, max_length=1000)
    utm_source: str | None = Field(default=None, max_length=200)
    utm_medium: str | None = Field(default=None, max_length=200)
    utm_campaign: str | None = Field(default=None, max_length=200)
    utm_content: str | None = Field(default=None, max_length=200)
    utm_term: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def require_contact(self) -> "MarketingLeadCreate":
        if not (self.telegram_username or self.phone or self.email):
            raise ValueError("telegram_username, phone, or email is required")
        return self


class MarketingLeadResponse(BaseModel):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
