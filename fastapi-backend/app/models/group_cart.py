"""
GroupCartItem model for shared group cart (host-pays-all mode).
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.utils.timezone_config import serialize_datetime


class GroupCartItem(Base):
    """
    Shared cart item for group orders where host pays all.

    Unlike individual carts (stored in localStorage), group cart items
    are stored in the database so all participants can see and modify them.
    """
    __tablename__ = "group_cart_items"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Group Reference
    group_session_id = Column(Integer, ForeignKey("group_sessions.id"), nullable=False, index=True)

    # Who added this item
    participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=True, index=True)
    participant_name = Column(String(100), nullable=True)

    # Menu Item Reference
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False, index=True)

    # Item Details (snapshot from menu)
    item_name = Column(String(255), nullable=False)
    item_image = Column(String(500), nullable=True)
    base_price = Column(Integer, nullable=False)  # In cents

    # Quantity
    quantity = Column(Integer, nullable=False, default=1)

    # Size Customization
    size_key = Column(String(50), nullable=True)
    size_label = Column(String(50), nullable=True)
    size_price = Column(Integer, default=0)  # In cents

    # Temperature
    temperature = Column(String(20), nullable=True)

    # Addons (stored as JSON array)
    addons = Column(JSON, nullable=True)

    # Calculated Total
    item_total = Column(Integer, nullable=False)  # (base + size + addons) * quantity

    # Special Instructions
    special_instructions = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    group_session = relationship("GroupSession", backref="cart_items", lazy="selectin")
    participant = relationship("SessionParticipant", lazy="selectin")
    menu_item = relationship("MenuItem", lazy="selectin")

    def to_dict(self) -> dict:
        """Convert cart item to dictionary for API response"""
        return {
            "id": self.id,
            "group_session_id": self.group_session_id,
            "participant_id": self.participant_id,
            "participant_name": self.participant_name,
            "menu_item_id": self.menu_item_id,
            "item_name": self.item_name,
            "item_image": self.item_image,
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
            "updated_at": serialize_datetime(self.updated_at),
        }

    @staticmethod
    def calculate_item_total(base_price: int, size_price: int, addons: list, quantity: int) -> int:
        """Calculate total price for this item"""
        addon_total = 0
        if addons:
            for addon in addons:
                addon_price = addon.get("price", 0)
                addon_qty = addon.get("quantity", 1)
                addon_total += addon_price * addon_qty

        return (base_price + size_price + addon_total) * quantity
