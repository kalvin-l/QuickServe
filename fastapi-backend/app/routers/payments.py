"""
Payments Router - API endpoints for payment operations.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.payment import PaymentMethod
from app.schemas.payment import PaymentResponse, PaymentRetryRequest, ReceiptResponse
from app.services.payment_service import (
    PaymentService,
    PaymentNotFoundError,
    PaymentProcessingError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["Payments"])


def payment_to_response(payment) -> dict:
    """Convert Payment model to response dict"""
    return payment.to_dict()


@router.get("/{payment_id}")
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get payment details by ID"""
    payment_service = PaymentService(db)
    payment = await payment_service.get_payment_by_id(payment_id)

    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")

    return payment_to_response(payment)


@router.get("/reference/{payment_reference}")
async def get_payment_by_reference(
    payment_reference: str,
    db: AsyncSession = Depends(get_db)
):
    """Get payment details by payment reference"""
    payment_service = PaymentService(db)
    payment = await payment_service.get_payment_by_reference(payment_reference)

    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment {payment_reference} not found")

    return payment_to_response(payment)


@router.get("/order/{order_id}")
async def get_payment_by_order(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get payment for a specific order"""
    payment_service = PaymentService(db)
    payment = await payment_service.get_payment_by_order_id(order_id)

    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment for order {order_id} not found")

    return payment_to_response(payment)


@router.get("/{payment_id}/receipt")
async def get_receipt(
    payment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get digital receipt for a payment.

    If receipt hasn't been generated yet, generates it first.
    """
    payment_service = PaymentService(db)

    try:
        # Get payment first
        payment = await payment_service.get_payment_by_id(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")

        # If receipt already exists, return it
        if payment.receipt_data:
            return payment.receipt_data

        # Generate receipt
        receipt = await payment_service.generate_receipt(payment_id)
        return receipt

    except PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting receipt: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{payment_id}/confirm-cash")
async def confirm_cash_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Confirm a cash payment (admin action).
    Only works for PENDING CASH payments.
    """
    payment_service = PaymentService(db)

    try:
        payment = await payment_service.confirm_cash_payment(payment_id)

        # Generate receipt
        await payment_service.generate_receipt(payment.id)
        # Refresh payment to get receipt data
        payment = await payment_service.get_payment_by_id(payment.id)

        return payment_to_response(payment)

    except PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PaymentProcessingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error confirming cash payment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{payment_id}/retry")
async def retry_payment(
    payment_id: int,
    request_data: Optional[PaymentRetryRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retry a failed payment.

    Only works for payments with FAILED status.
    Optionally can change payment method.
    """
    payment_service = PaymentService(db)

    try:
        new_method = None
        if request_data and request_data.method:
            new_method = request_data.method

        payment = await payment_service.retry_payment(payment_id, new_method)

        # Generate receipt if successful
        if payment.status.value == "completed":
            await payment_service.generate_receipt(payment.id)
            # Refresh payment to get receipt data
            payment = await payment_service.get_payment_by_id(payment.id)

        return payment_to_response(payment)

    except PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PaymentProcessingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrying payment: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
