"""
Payment model for QuickServe payment processing.
"""
import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey,
    Boolean, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.utils.timezone_config import get_utc_now, serialize_datetime


class PaymentMethod(str, enum.Enum):
    """Supported payment methods"""
    CASH = "cash"
    CARD = "card"
    E_WALLET = "e_wallet"
    QR = "qr"
    BANK_TRANSFER = "bank_transfer"


class PaymentStatus(str, enum.Enum):
    """Payment lifecycle states"""
    PENDING = "pending"          # Payment created, not yet processed
    PROCESSING = "processing"    # Payment being processed
    COMPLETED = "completed"      # Payment successful
    FAILED = "failed"            # Payment failed
    REFUNDED = "refunded"        # Payment refunded


class Payment(Base):
    """
    Payment model for tracking order payments.

    Currently uses simulation mode (no real payment gateway).
    """
    __tablename__ = "payments"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Payment Reference Number
    payment_reference = Column(String(50), unique=True, index=True, nullable=False)

    # Order Reference (one-to-one)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True, index=True)

    # Payment Details
    method = Column(SQLEnum(PaymentMethod), nullable=False)
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # In cents

    # Simulation Fields
    simulated = Column(Boolean, default=True, nullable=False)
    simulation_result = Column(String(20), nullable=True)  # "success", "failed"
    transaction_id = Column(String(50), nullable=True)     # Simulated transaction ID

    # Receipt Data (JSON)
    receipt_data = Column(JSON, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    order = relationship("Order", back_populates="payment")

    def to_dict(self) -> dict:
        """Convert payment to dictionary for API response"""
        return {
            "id": self.id,
            "payment_reference": self.payment_reference,
            "order_id": self.order_id,
            "method": self.method.value if self.method else None,
            "status": self.status.value if self.status else None,
            "amount": self.amount,
            "amount_in_pesos": self.amount / 100 if self.amount else 0,
            "simulated": self.simulated,
            "simulation_result": self.simulation_result,
            "transaction_id": self.transaction_id,
            "receipt_data": self.receipt_data,
            "created_at": serialize_datetime(self.created_at),
            "processed_at": serialize_datetime(self.processed_at),
        }

    def generate_receipt(self, order) -> dict:
        """Generate digital receipt data"""
        items_data = []
        if order.items:
            for item in order.items:
                item_receipt = {
                    "name": item.item_name,
                    "quantity": item.quantity,
                    "unit_price": item.base_price,
                    "unit_price_in_pesos": item.base_price / 100 if item.base_price else 0,
                    "total": item.item_total,
                    "total_in_pesos": item.item_total / 100 if item.item_total else 0,
                }

                # Add customizations
                customizations = []
                if item.size_label:
                    customizations.append(item.size_label)
                if item.temperature:
                    customizations.append(item.temperature)
                if item.addons:
                    for addon in item.addons:
                        customizations.append(addon.get("name", ""))

                if customizations:
                    item_receipt["customizations"] = customizations

                items_data.append(item_receipt)

        receipt = {
            "receipt_id": f"RCP-{self.payment_reference.replace('PAY-', '')}",
            "payment_reference": self.payment_reference,
            "transaction_id": self.transaction_id,
            "order_number": order.order_number,
            "order_type": order.order_type.value if order.order_type else None,
            "order_date": serialize_datetime(order.created_at),
            "table_number": f"Table {order.table.table_number}" if order.table else None,
            "customer_name": order.customer_name or "Guest",
            "items": items_data,
            "subtotal": order.subtotal,
            "subtotal_in_pesos": order.subtotal / 100 if order.subtotal else 0,
            "tax": order.tax,
            "tax_in_pesos": order.tax / 100 if order.tax else 0,
            "total": order.total,
            "total_in_pesos": order.total / 100 if order.total else 0,
            "payment_method": self.method.value if self.method else None,
            "payment_status": self.status.value if self.status else None,
            "generated_at": serialize_datetime(get_utc_now()),
        }

        return receipt
