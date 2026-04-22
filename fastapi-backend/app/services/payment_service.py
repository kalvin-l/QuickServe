"""
Payment Service - Business logic for payment processing.
"""
import logging
import secrets
import string
import random
import asyncio
from datetime import datetime
from typing import Optional
from app.utils.timezone_config import get_utc_now

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.order import Order

logger = logging.getLogger(__name__)


class PaymentNotFoundError(Exception):
    """Raised when a payment is not found"""
    pass


class PaymentAlreadyExistsError(Exception):
    """Raised when trying to create payment for order that already has one"""
    pass


class PaymentProcessingError(Exception):
    """Raised when payment processing fails"""
    pass


class PaymentService:
    """Service for payment business logic with simulation support"""

    # Simulation success rate (90%)
    SIMULATION_SUCCESS_RATE = 0.90

    # Simulated processing delay range (seconds)
    MIN_PROCESSING_DELAY = 0.5
    MAX_PROCESSING_DELAY = 2.0

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment(
        self,
        order_id: int,
        method: PaymentMethod,
        amount: int
    ) -> Payment:
        """
        Create a new payment record for an order.

        - Generates unique payment reference
        - Links to order
        - Sets status to PENDING
        """
        # Check if order already has payment
        existing = await self.db.execute(
            select(Payment).where(Payment.order_id == order_id)
        )
        if existing.scalar_one_or_none():
            raise PaymentAlreadyExistsError(f"Order {order_id} already has a payment")

        # Generate payment reference
        payment_reference = await self._generate_payment_reference()

        payment = Payment(
            payment_reference=payment_reference,
            order_id=order_id,
            method=method,
            status=PaymentStatus.PENDING,
            amount=amount,
            simulated=True,
            created_at=get_utc_now(),
        )

        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)

        logger.info(f"Created payment {payment_reference} for order {order_id}, amount: {amount}")

        return payment

    async def process_payment(self, payment_id: int) -> Payment:
        """
        Process a payment (simulation mode).

        - Simulates processing delay
        - 90% success rate
        - Updates status and timestamps
        - Generates receipt data
        """
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(f"Payment {payment_id} not found")

        if payment.status != PaymentStatus.PENDING:
            raise PaymentProcessingError(
                f"Payment {payment_id} is not in PENDING status"
            )

        # Update to processing
        payment.status = PaymentStatus.PROCESSING
        await self.db.commit()

        # Simulate processing delay
        delay = random.uniform(self.MIN_PROCESSING_DELAY, self.MAX_PROCESSING_DELAY)
        await asyncio.sleep(delay)

        # Simulate payment result
        success = random.random() < self.SIMULATION_SUCCESS_RATE

        if success:
            payment.status = PaymentStatus.COMPLETED
            payment.simulation_result = "success"
            payment.transaction_id = self._generate_transaction_id()
            logger.info(f"Payment {payment.payment_reference} completed successfully")
        else:
            payment.status = PaymentStatus.FAILED
            payment.simulation_result = "failed"
            logger.warning(f"Payment {payment.payment_reference} failed (simulated)")

        payment.processed_at = get_utc_now()
        await self.db.commit()
        await self.db.refresh(payment)

        return payment

    async def get_payment_by_id(self, payment_id: int) -> Optional[Payment]:
        """Get payment by ID"""
        result = await self.db.execute(
            select(Payment)
            .options(selectinload(Payment.order))
            .where(Payment.id == payment_id)
        )
        return result.scalar_one_or_none()

    async def get_payment_by_reference(self, payment_reference: str) -> Optional[Payment]:
        """Get payment by reference number"""
        result = await self.db.execute(
            select(Payment)
            .options(selectinload(Payment.order))
            .where(Payment.payment_reference == payment_reference)
        )
        return result.scalar_one_or_none()

    async def get_payment_by_order_id(self, order_id: int) -> Optional[Payment]:
        """Get payment by order ID"""
        result = await self.db.execute(
            select(Payment)
            .options(selectinload(Payment.order))
            .where(Payment.order_id == order_id)
        )
        return result.scalar_one_or_none()

    async def retry_payment(
        self,
        payment_id: int,
        new_method: Optional[PaymentMethod] = None
    ) -> Payment:
        """
        Retry a failed payment.

        - Only works for FAILED payments
        - Optionally changes payment method
        - Re-processes the payment
        """
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(f"Payment {payment_id} not found")

        if payment.status != PaymentStatus.FAILED:
            raise PaymentProcessingError(
                f"Can only retry FAILED payments, current status: {payment.status.value}"
            )

        # Reset to pending
        payment.status = PaymentStatus.PENDING
        payment.simulation_result = None
        payment.transaction_id = None
        payment.processed_at = None

        if new_method:
            payment.method = new_method

        await self.db.commit()

        # Process again
        return await self.process_payment(payment_id)

    async def confirm_cash_payment(self, payment_id: int) -> Payment:
        """
        Confirm a cash payment (admin action).
        """
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(f"Payment {payment_id} not found")

        if payment.status != PaymentStatus.PENDING:
            raise PaymentProcessingError(
                f"Can only confirm PENDING payments, current status: {payment.status.value}"
            )

        if payment.method != PaymentMethod.CASH:
            raise PaymentProcessingError(
                f"Can only manually confirm CASH payments, method is: {payment.method.value}"
            )

        # Update to completed
        payment.status = PaymentStatus.COMPLETED
        payment.simulation_result = "manual_confirm"
        payment.transaction_id = self._generate_transaction_id()
        payment.processed_at = get_utc_now()

        await self.db.commit()
        await self.db.refresh(payment)

        logger.info(f"Cash payment {payment.payment_reference} confirmed manually")

        return payment

    async def generate_receipt(self, payment_id: int) -> dict:
        """Generate and store receipt data for a payment"""
        payment = await self.get_payment_by_id(payment_id)
        if not payment:
            raise PaymentNotFoundError(f"Payment {payment_id} not found")

        # Get order with items
        order_result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.table),
            )
            .where(Order.id == payment.order_id)
        )
        order = order_result.scalar_one_or_none()

        if not order:
            raise PaymentNotFoundError(f"Order for payment {payment_id} not found")

        # Generate receipt
        receipt_data = payment.generate_receipt(order)

        # Store receipt data
        payment.receipt_data = receipt_data
        await self.db.commit()

        return receipt_data

    async def _generate_payment_reference(self) -> str:
        """Generate unique payment reference in format PAY-YYYYMMDD-XXX"""
        today = get_utc_now().strftime("%Y%m%d")

        while True:
            random_part = ''.join(secrets.choice(string.digits) for _ in range(3))
            payment_reference = f"PAY-{today}-{random_part}"

            result = await self.db.execute(
                select(Payment).where(Payment.payment_reference == payment_reference)
            )
            if not result.scalar_one_or_none():
                return payment_reference

    def _generate_transaction_id(self) -> str:
        """Generate simulated transaction ID"""
        random_part = ''.join(
            secrets.choice(string.ascii_uppercase + string.digits)
            for _ in range(12)
        )
        return f"TXN-{random_part}"
