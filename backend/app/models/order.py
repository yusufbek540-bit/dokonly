import uuid

from sqlalchemy import BigInteger, Boolean, Column, Date, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base, TimestampMixin


class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    telegram_id = Column(BigInteger, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    username = Column(String(100))
    locale = Column(String(5), default="ru")
    phone = Column(String(50))
    email = Column(String(200))
    birthday = Column(Date)
    saved_address = Column(Text)
    custom_avatar_url = Column(Text)
    is_deleted = Column(Boolean, nullable=False, default=False)
    # Denormalized counters — must be updated by the order service when orders are created/cancelled.
    total_orders = Column(Integer, nullable=False, default=0)
    total_spent = Column(Numeric(14, 2), nullable=False, default=0)


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer_id = Column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=True
    )
    customer_name = Column(String(200))
    customer_phone = Column(String(50))
    customer_email = Column(String(200))
    delivery_address = Column(Text)
    delivery_type = Column(String(50), default="pickup")
    coupon_code = Column(String(50))
    status = Column(String(20), nullable=False, default="new")
    payment_method = Column(String(30), nullable=False)
    payment_status = Column(String(20), nullable=False, default="pending")
    payment_id = Column(String(255))
    subtotal = Column(Numeric(14, 2), nullable=False)
    discount = Column(Numeric(14, 2), nullable=False, default=0)
    total = Column(Numeric(14, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="UZS")
    delivery_note = Column(Text)
    customer_note = Column(Text)
    seller_note = Column(Text)
    meta = Column(JSONB, default=dict)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL")
    )
    product_name = Column(String(255), nullable=False)
    price = Column(Numeric(14, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Numeric(14, 2), nullable=False)
    size = Column(String(100))
    color = Column(String(100))


class WishlistItem(Base, TimestampMixin):
    __tablename__ = "wishlist_items"
    __table_args__ = (
        UniqueConstraint("tenant_id", "customer_telegram_id", "product_id", name="uq_wishlist"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer_telegram_id = Column(BigInteger, nullable=False)
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )
