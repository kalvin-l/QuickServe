"""
Table Session Model
Tracks customer sessions at tables for capacity tracking and order management
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.utils.timezone_config import serialize_datetime
import enum


class SessionStatus(str, enum.Enum):
    """Session lifecycle states"""
    ACTIVE = "active"
    IDLE = "idle"  # No activity detected (heartbeat timeout)
    PAUSING = "pausing"  # Grace period in progress
    PAUSED = "paused"  # Soft end, recoverable for 24h
    ENDED = "ended"
    ABANDONED = "abandoned"  # No activity for 20 minutes (legacy)


class PaymentStatus(str, enum.Enum):
    """Payment status for session"""
    PENDING = "pending"
    PARTIAL = "partial"  # Some items paid
    COMPLETE = "complete"  # All paid
    REFUNDED = "refunded"


class TableSession(Base):
    """
    Tracks customer sessions at tables.

    Phase 3 Goals:
    - Track when customers sit/leave tables
    - Enable capacity tracking
    - Support session-based orders
    """
    __tablename__ = "table_sessions"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Table Relationship
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False, index=True)

    # Session Identifiers (matches existing QR pattern)
    session_id = Column(String(36), unique=True, index=True)  # UUID for customers
    access_code = Column(String(6), index=True)  # Links to table.access_code (not unique - multiple sessions per table allowed)

    # Party Information
    customer_count = Column(Integer, default=1)  # Party size
    customer_name = Column(String(100), nullable=True)  # Optional: "John's party"

    # Session Status
    status = Column(String, default=SessionStatus.ACTIVE, index=True)

    # Payment Status (Phase 1: Smart Session End)
    payment_status = Column(String(20), default=PaymentStatus.PENDING, index=True)
    pending_orders_count = Column(Integer, default=0)

    # Grace Period / Pause Tracking (Phase 1: Smart Session End)
    session_end_scheduled_at = Column(DateTime(timezone=True), nullable=True, index=True)
    paused_at = Column(DateTime(timezone=True), nullable=True, index=True)
    ended_by = Column(String(20), nullable=True)  # 'user', 'system', 'admin'
    end_reason = Column(String(100), nullable=True)
    grace_period_minutes = Column(Integer, default=5)

    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # Session Metadata (flexible, no schema changes needed)
    session_metadata = Column(JSON, default=dict)  # Store: cart, preferences, notes

    # Soft Delete
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    participants = relationship("SessionParticipant", back_populates="table_session", cascade="all, delete-orphan")
    preserved_cart = relationship("PreservedCart", back_populates="session", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TableSession(id={self.id}, table_id={self.table_id}, status='{self.status}')>"

    @property
    def duration_minutes(self) -> int:
        """Session duration in minutes"""
        from sqlalchemy.sql import select
        end = self.ended_at or func.now()
        # This needs to be evaluated in a query context
        return 0  # Placeholder - use Duration calculations in service layer

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "table_id": self.table_id,
            "session_id": self.session_id,
            "access_code": self.access_code,
            "customer_count": self.customer_count,
            "customer_name": self.customer_name,
            "status": self.status,
            "payment_status": self.payment_status,
            "pending_orders_count": self.pending_orders_count,
            "session_end_scheduled_at": serialize_datetime(self.session_end_scheduled_at) if self.session_end_scheduled_at else None,
            "paused_at": serialize_datetime(self.paused_at) if self.paused_at else None,
            "ended_by": self.ended_by,
            "end_reason": self.end_reason,
            "grace_period_minutes": self.grace_period_minutes,
            "started_at": serialize_datetime(self.started_at),
            "last_activity_at": serialize_datetime(self.last_activity_at),
            "ended_at": serialize_datetime(self.ended_at),
            "metadata": self.session_metadata or {},
            "is_active": self.is_active
        }
