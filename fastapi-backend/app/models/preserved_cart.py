"""
Preserved Cart Model
Stores cart data when session is paused, allowing cart to survive session expiry
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.utils.timezone_config import serialize_datetime


class PreservedCart(Base):
    """
    Cart preserved when session pauses.

    Phase 1 Goals:
    - Cart survives session expiry
    - Cart tied to device_id for cross-session recovery
    - 24-hour expiry from preservation time
    """
    __tablename__ = "preserved_carts"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Session Relationship
    session_id = Column(Integer, ForeignKey("table_sessions.id"), unique=True, nullable=False, index=True)

    # Device Information
    device_id = Column(String(64), index=True, nullable=False)  # For cross-session recovery

    # Table Information
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False)  # Original table

    # Cart Data
    cart_data = Column(JSON, default=dict)  # Full cart state: items, totals, etc.

    # Expiry
    preserved_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)  # 24h from preservation

    # Relationships
    session = relationship("TableSession", back_populates="preserved_cart")

    def __repr__(self):
        return f"<PreservedCart(id={self.id}, session_id={self.session_id}, device_id='{self.device_id}')>"

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "device_id": self.device_id,
            "table_id": self.table_id,
            "cart_data": self.cart_data or {},
            "cart_item_count": len(self.cart_data.get("items", [])) if self.cart_data else 0,
            "cart_total": self.cart_data.get("total", 0) if self.cart_data else 0,
            "preserved_at": serialize_datetime(self.preserved_at),
            "expires_at": serialize_datetime(self.expires_at),
            "is_expired": self.expires_at < func.now() if self.expires_at else False
        }

    @property
    def is_expired(self):
        """Check if preserved cart has expired"""
        from app.utils.timezone_config import get_utc_now
        return self.expires_at < get_utc_now() if self.expires_at else True
