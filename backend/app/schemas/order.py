from pydantic import BaseModel
from uuid import UUID
from decimal import Decimal
from typing import Optional
from datetime import datetime


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: Optional[UUID]
    product_name: str
    price: Decimal
    quantity: int
    subtotal: Decimal
    size: Optional[str] = None
    color: Optional[str] = None
    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: str  # "confirmed" | "packing" | "shipped" | "delivered" | "cancelled"
    delivery_note: Optional[str] = None


class OrderResponse(BaseModel):
    id: UUID
    status: str
    payment_method: str
    payment_status: str
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    currency: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_type: Optional[str] = None
    customer_note: Optional[str] = None
    delivery_note: Optional[str] = None
    created_at: datetime
    items: list[OrderItemResponse] = []
    model_config = {"from_attributes": True}
