import uuid

from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin


class MarketingLead(Base, TimestampMixin):
    __tablename__ = "marketing_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    locale = Column(String(2), nullable=False, default="ru")
    name = Column(String(200), nullable=False)
    telegram_username = Column(String(100))
    phone = Column(String(50))
    email = Column(String(200))
    business_name = Column(String(200))
    niche = Column(String(100), nullable=False)
    monthly_order_volume = Column(String(100))
    message = Column(Text)
    source_page = Column(Text, nullable=False)
    utm_source = Column(String(200))
    utm_medium = Column(String(200))
    utm_campaign = Column(String(200))
    utm_content = Column(String(200))
    utm_term = Column(String(200))
