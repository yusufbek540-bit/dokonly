from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum
from typing import Optional


class PaymentStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


@dataclass
class PaymentResult:
    payment_id: str
    payment_url: Optional[str]
    status: PaymentStatus


@dataclass
class RefundResult:
    success: bool
    refund_id: Optional[str] = None


class PaymentProvider(ABC):
    @abstractmethod
    async def create_payment(
        self, amount: Decimal, currency: str, metadata: dict
    ) -> PaymentResult: ...

    @abstractmethod
    async def verify_payment(self, payment_id: str) -> PaymentStatus: ...

    @abstractmethod
    async def refund(
        self, payment_id: str, amount: Optional[Decimal] = None
    ) -> RefundResult: ...
