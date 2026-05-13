from decimal import Decimal
from typing import Optional
from uuid import uuid4

from app.payment.base import PaymentProvider, PaymentResult, PaymentStatus, RefundResult


class ManualTransferProvider(PaymentProvider):
    """Card-to-card manual transfer. UZ-specific, for sellers without a legal entity."""

    async def create_payment(
        self, amount: Decimal, currency: str, metadata: dict
    ) -> PaymentResult:
        payment_id = str(uuid4())
        return PaymentResult(
            payment_id=payment_id,
            payment_url=None,
            status=PaymentStatus.PENDING,
        )

    async def verify_payment(self, payment_id: str) -> PaymentStatus:
        return PaymentStatus.PENDING

    async def refund(
        self, payment_id: str, amount: Optional[Decimal] = None
    ) -> RefundResult:
        return RefundResult(success=True)
