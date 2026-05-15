import uuid

from sqlalchemy import Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base, TimestampMixin


class MassMailing(Base, TimestampMixin):
    __tablename__ = "mass_mailings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    text = Column(Text, nullable=False)
    image_url = Column(String(1024), nullable=True)
    status = Column(String(20), nullable=False, default="draft")  # draft | sending | sent | failed
    recipient_count = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
