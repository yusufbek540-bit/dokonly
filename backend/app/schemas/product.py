from pydantic import BaseModel
from uuid import UUID
from decimal import Decimal
from typing import Optional


class CategoryCreate(BaseModel):
    name: str
    slug: str
    sort_order: int = 0


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    sort_order: int
    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: Decimal
    currency: str = "UZS"
    stock: Optional[int] = None
    category_id: Optional[UUID] = None
    images: list[str] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None
    images: Optional[list[str]] = None
    category_id: Optional[UUID] = None


class ProductResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    description: Optional[str]
    price: Decimal
    currency: str
    stock: Optional[int]
    images: list[str]
    is_active: bool
    sort_order: int
    category_id: Optional[UUID]
    model_config = {"from_attributes": True}
