"""
Pydantic schemas for Payment system.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.models.payment import PaymentMethod, PaymentStatus


class PaymentCreate(BaseModel):
    """Schema for creating a payment"""
    order_id: int = Field(..., description="Order ID to pay for")
    method: PaymentMethod = Field(..., description="Payment method")
    amount: int = Field(..., gt=0, description="Amount to pay in cents")


class PaymentResponse(BaseModel):
    """Schema for payment response"""
    id: int
    payment_reference: str
    order_id: int
    method: str
    status: str
    amount: int
    amount_in_pesos: float
    simulated: bool
    simulation_result: Optional[str]
    transaction_id: Optional[str]
    created_at: Optional[str]
    processed_at: Optional[str]

    class Config:
        from_attributes = True


class PaymentRetryRequest(BaseModel):
    """Schema for retrying a failed payment"""
    method: Optional[PaymentMethod] = Field(None, description="New payment method (optional)")


class ReceiptItemResponse(BaseModel):
    """Individual item in receipt"""
    name: str
    quantity: int
    unit_price: int
    unit_price_in_pesos: float
    total: int
    total_in_pesos: float
    customizations: Optional[List[str]]


class ReceiptResponse(BaseModel):
    """Schema for digital receipt"""
    receipt_id: str
    payment_reference: str
    transaction_id: Optional[str]
    order_number: str
    order_type: Optional[str]
    order_date: Optional[str]
    table_number: Optional[str]
    customer_name: Optional[str]
    items: List[ReceiptItemResponse]
    subtotal: int
    subtotal_in_pesos: float
    tax: int
    tax_in_pesos: float
    total: int
    total_in_pesos: float
    payment_method: Optional[str]
    payment_status: Optional[str]
    generated_at: str

    class Config:
        from_attributes = True


class PaymentSummary(BaseModel):
    """Brief payment summary"""
    id: int
    payment_reference: str
    method: str
    status: str
    amount: int
    amount_in_pesos: float
