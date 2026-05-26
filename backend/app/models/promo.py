import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base, TimestampMixin


class PromoCode(Base, TimestampMixin):
    __tablename__ = "promo_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    code = Column(String(50), nullable=False)
    discount_type = Column(String(10), nullable=False)  # "percent" or "fixed"
    discount_value = Column(Numeric(14, 2), nullable=False)
    max_uses = Column(Integer, nullable=True)  # null = unlimited
    used_count = Column(Integer, nullable=False, default=0)
    min_order_amount = Column(Numeric(15, 2), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    applicable_product_ids = Column(JSONB, nullable=True)  # null = all products
    is_active = Column(Boolean, nullable=False, default=True)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_promo_tenant_code"),)
