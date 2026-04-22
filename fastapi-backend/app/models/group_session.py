"""
Group Session Model
Manages group ordering sessions where multiple customers order together
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.utils.timezone_config import serialize_datetime
import enum
import uuid


class PaymentType(str, enum.Enum):
    """Payment modes for group orders"""
    HOST_PAYS_ALL = "host_pays_all"      # One person pays for everyone
    INDIVIDUAL = "individual"             # Each person pays separately
    HYBRID = "hybrid"                     # Mix of both


class GroupSessionStatus(str, enum.Enum):
    """Group session lifecycle states"""
    ACTIVE = "active"                     # Open for ordering and joining
    CLOSED = "closed"                     # No new members, but ordering open
    PAID = "paid"                         # Payment completed
    CANCELLED = "cancelled"               # Group was cancelled


class GroupSession(Base):
    """
    Manages group ordering sessions.

    A group session allows multiple customers to:
    - Order together at the same table
    - Share payment (host pays all) or pay individually
    - Allow late joiners with approval
    """
    __tablename__ = "group_sessions"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Group Identifiers
    group_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))

    # Table Relationship
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False, index=True)

    # Host Information
    host_session_id = Column(String(36), nullable=False, index=True)  # References table_sessions.session_id (deprecated, for backward compatibility)
    host_participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=True, index=True)  # References session_participants.id (new)
    host_name = Column(String(100), nullable=True)

    # Group Configuration
    payment_type = Column(SQLEnum(PaymentType), nullable=False, default=PaymentType.INDIVIDUAL)
    auto_approve_joins = Column(Boolean, default=False, index=True)
    max_members = Column(Integer, default=6)

    # Group Status
    status = Column(SQLEnum(GroupSessionStatus), default=GroupSessionStatus.ACTIVE, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, index=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Share Link
    share_code = Column(String(12), unique=True, index=True)  # Short code for sharing

    # Metadata
    group_metadata = Column(JSON, default=dict)  # Store: settings, notes, etc.

    # Relationships - use selectin for async compatibility
    members = relationship("GroupMember", back_populates="group_session", cascade="all, delete-orphan", lazy="selectin")

    # Soft Delete
    is_active = Column(Boolean, default=True, index=True)

    def __repr__(self):
        return f"<GroupSession(id={self.id}, group_id='{self.group_id}', table_id={self.table_id}, payment_type='{self.payment_type}')>"

    def to_dict(self, member_count: int = None):
        """Convert to dictionary for API responses

        Args:
            member_count: Optional member count (to avoid lazy loading issues)
        """
        return {
            "id": self.id,
            "group_id": self.group_id,
            "table_id": self.table_id,
            "host_session_id": self.host_session_id,
            "host_participant_id": self.host_participant_id,
            "host_name": self.host_name,
            "payment_type": self.payment_type,
            "auto_approve_joins": self.auto_approve_joins,
            "max_members": self.max_members,
            "status": self.status,
            "member_count": member_count if member_count is not None else (len(self.members) if self.members else 0),
            "share_code": self.share_code,
            "share_link": f"{self.share_code}" if self.share_code else None,
            "created_at": serialize_datetime(self.created_at),
            "closed_at": serialize_datetime(self.closed_at),
            "paid_at": serialize_datetime(self.paid_at),
            "metadata": self.group_metadata or {},
            "is_active": self.is_active
        }


class GroupMember(Base):
    """
    Represents a member of a group ordering session.
    """
    __tablename__ = "group_members"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Group Relationship
    group_session_id = Column(Integer, ForeignKey("group_sessions.id"), nullable=False, index=True)

    # Member Information
    member_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), nullable=True, index=True)  # References table_sessions.session_id (deprecated, for backward compatibility)
    participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=True, index=True)  # New: References session_participants.id
    name = Column(String(100), nullable=True)

    # Member Status
    has_joined = Column(Boolean, default=False, index=True)  # True when request approved
    has_paid = Column(Boolean, default=False, index=True)

    # Order Totals (cached for performance)
    order_subtotal = Column(Integer, default=0)  # Stored in cents

    # Payment Details
    payment_method = Column(String(50), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    joined_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    member_metadata = Column(JSON, default=dict)

    # Relationships - use selectin for async compatibility
    group_session = relationship("GroupSession", back_populates="members", lazy="selectin")

    # Soft Delete
    is_active = Column(Boolean, default=True, index=True)

    def __repr__(self):
        return f"<GroupMember(id={self.id}, member_id='{self.member_id}', name='{self.name}', has_paid={self.has_paid})>"

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "member_id": self.member_id,
            "session_id": self.session_id,
            "participant_id": self.participant_id,
            "name": self.name,
            "has_joined": self.has_joined,
            "has_paid": self.has_paid,
            "order_subtotal": self.order_subtotal,
            "payment_method": self.payment_method,
            "joined_at": serialize_datetime(self.joined_at),
            "paid_at": serialize_datetime(self.paid_at),
            "metadata": self.member_metadata or {},
            "is_active": self.is_active
        }
