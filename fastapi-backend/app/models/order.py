"""
Order and OrderItem models for QuickServe ordering system.
"""
import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey,
    Boolean, Enum as SQLEnum, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.utils.timezone_config import serialize_datetime


class OrderStatus(str, enum.Enum):
    """Order lifecycle states"""
    PENDING = "pending"          # Just created, awaiting confirmation
    CONFIRMED = "confirmed"      # Confirmed by staff
    PREPARING = "preparing"      # Being prepared in kitchen
    READY = "ready"              # Ready for pickup/serving
    SERVED = "served"            # Delivered to customer
    CANCELLED = "cancelled"      # Cancelled


class OrderType(str, enum.Enum):
    """Order type based on cart type"""
    INDIVIDUAL = "individual"    # Individual dine (no group)
    GROUP_SPLIT = "group_split"  # Group order, split bill (each pays own)
    GROUP_HOST = "group_host"    # Group order, host pays all


class Order(Base):
    """
    Order model representing a customer order.

    Supports three scenarios:
    - Individual: Single person ordering alone
    - Group Split: Group members pay separately
    - Group Host: Host pays for everyone
    """
    __tablename__ = "orders"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Order Identifiers
    order_number = Column(String(20), unique=True, index=True, nullable=False)

    # Table/Session References
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True, index=True)
    table_session_id = Column(Integer, ForeignKey("table_sessions.id"), nullable=True, index=True)

    # Order Type
    order_type = Column(SQLEnum(OrderType), default=OrderType.INDIVIDUAL, nullable=False, index=True)
    group_session_id = Column(Integer, ForeignKey("group_sessions.id"), nullable=True, index=True)
    participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=True, index=True)

    # Customer Information
    customer_name = Column(String(100), nullable=True)

    # Order Status
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)

    # Pricing (in cents to avoid floating point issues)
    subtotal = Column(Integer, nullable=False, default=0)
    tax = Column(Integer, nullable=False, default=0)
    total = Column(Integer, nullable=False, default=0)

    # Special Instructions
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    ready_at = Column(DateTime(timezone=True), nullable=True)
    served_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Soft Delete
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")
    payment = relationship("Payment", back_populates="order", uselist=False, lazy="selectin")
    table = relationship("Table", backref="orders", lazy="selectin")
    table_session = relationship("TableSession", backref="orders", lazy="selectin")
    group_session = relationship("GroupSession", backref="orders", lazy="selectin")
    participant = relationship("SessionParticipant", backref="orders", lazy="selectin")

    def to_dict(self, include_items: bool = True, include_payment: bool = True) -> dict:
        """Convert order to dictionary for API response"""
        result = {
            "id": self.id,
            "order_number": self.order_number,
            "table_id": self.table_id,
            "table_session_id": self.table_session_id,
            "order_type": self.order_type.value if self.order_type else None,
            "group_session_id": self.group_session_id,
            "participant_id": self.participant_id,
            "customer_name": self.customer_name,
            "status": self.status.value if self.status else None,
            "subtotal": self.subtotal,
            "tax": self.tax,
            "total": self.total,
            "subtotal_in_pesos": self.subtotal / 100 if self.subtotal else 0,
            "total_in_pesos": self.total / 100 if self.total else 0,
            "notes": self.notes,
            "created_at": serialize_datetime(self.created_at),
            "updated_at": serialize_datetime(self.updated_at),
            "confirmed_at": serialize_datetime(self.confirmed_at),
            "ready_at": serialize_datetime(self.ready_at),
            "served_at": serialize_datetime(self.served_at),
            "cancelled_at": serialize_datetime(self.cancelled_at),
            "is_active": self.is_active,
        }

        # Include table number if table relationship is loaded
        if self.table:
            result["table_number"] = self.table.table_number

        if include_items and self.items:
            result["items"] = [item.to_dict() for item in self.items]

        if include_payment and self.payment:
            result["payment"] = self.payment.to_dict()

        return result


class OrderItem(Base):
    """
    Individual item within an order.
    Stores a snapshot of the menu item at order time.
    """
    __tablename__ = "order_items"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Order Reference
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)

    # Menu Item Reference
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False, index=True)

    # Participant who added this item (for group orders)
    added_by_participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=True)
    added_by_name = Column(String(100), nullable=True)

    # Item Details (snapshot at order time)
    item_name = Column(String(255), nullable=False)
    base_price = Column(Integer, nullable=False)  # In cents

    # Quantity
    quantity = Column(Integer, nullable=False, default=1)

    # Size Customization
    size_key = Column(String(50), nullable=True)    # e.g., "small", "medium", "large"
    size_label = Column(String(50), nullable=True)  # e.g., "8oz", "12oz", "16oz"
    size_price = Column(Integer, default=0)         # Additional price in cents

    # Temperature
    temperature = Column(String(20), nullable=True)  # "Hot", "Cold"

    # Addons (stored as JSON array)
    # Format: [{"id": 1, "name": "Extra Shot", "price": 50, "quantity": 1}]
    addons = Column(JSON, nullable=True)

    # Calculated Total
    item_total = Column(Integer, nullable=False)  # (base + size + addons) * quantity

    # Special Instructions
    special_instructions = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", lazy="selectin")
    added_by = relationship("SessionParticipant", lazy="selectin")

    def to_dict(self) -> dict:
        """Convert order item to dictionary for API response"""
        return {
            "id": self.id,
            "order_id": self.order_id,
            "menu_item_id": self.menu_item_id,
            "added_by_participant_id": self.added_by_participant_id,
            "added_by_name": self.added_by_name,
            "item_name": self.item_name,
            "base_price": self.base_price,
            "base_price_in_pesos": self.base_price / 100 if self.base_price else 0,
            "quantity": self.quantity,
            "size_key": self.size_key,
            "size_label": self.size_label,
            "size_price": self.size_price,
            "size_price_in_pesos": self.size_price / 100 if self.size_price else 0,
            "temperature": self.temperature,
            "addons": self.addons or [],
            "item_total": self.item_total,
            "item_total_in_pesos": self.item_total / 100 if self.item_total else 0,
            "special_instructions": self.special_instructions,
            "created_at": serialize_datetime(self.created_at),
        }
