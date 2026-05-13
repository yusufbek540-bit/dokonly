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
    customer_note: Optional[str]
    delivery_note: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}
