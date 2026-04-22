"""
Join Request Model
Manages late joiner requests for group ordering sessions
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.utils.timezone_config import serialize_datetime
import enum
import uuid


class JoinRequestStatus(str, enum.Enum):
    """Join request lifecycle states"""
    PENDING = "pending"       # Waiting for host approval
    APPROVED = "approved"     # Approved by host
    DECLINED = "declined"     # Declined by host
    TIMEOUT = "timeout"       # Auto-declined after 5 minutes


class JoinRequest(Base):
    """
    Manages requests from customers who want to join an existing group order.

    Late joiners can:
    - Request to join a group
    - Wait for host approval (or auto-approve if enabled)
    - Get notified when approved/declined
    """
    __tablename__ = "join_requests"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Request Identifiers
    request_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))

    # Group Relationship
    group_session_id = Column(Integer, ForeignKey("group_sessions.id"), nullable=False, index=True)

    # Participant Relationship (for session pooling)
    participant_id = Column(Integer, ForeignKey("session_participants.id"), nullable=True, index=True)

    # Requester Information
    requester_session_id = Column(String(36), nullable=False, index=True)  # References table_sessions.session_id
    requester_name = Column(String(100), nullable=True)

    # Request Details
    message = Column(Text, nullable=True)  # Optional message to host
    status = Column(SQLEnum(JoinRequestStatus), default=JoinRequestStatus.PENDING, index=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, index=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    timeout_at = Column(DateTime(timezone=True), nullable=True, index=True)  # 5 minutes from creation

    # Response Details
    response_reason = Column(Text, nullable=True)  # Reason for decline

    # Soft Delete
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    participant = relationship("SessionParticipant", back_populates="join_requests")

    def __repr__(self):
        return f"<JoinRequest(id={self.id}, request_id='{self.request_id}', group_session_id={self.group_session_id}, status='{self.status}')>"

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "request_id": self.request_id,
            "group_session_id": self.group_session_id,
            "participant_id": self.participant_id,
            "requester_name": self.requester_name,
            "requester_session_id": self.requester_session_id,
            "message": self.message,
            "status": self.status,
            "created_at": serialize_datetime(self.created_at),
            "responded_at": serialize_datetime(self.responded_at),
            "timeout_at": serialize_datetime(self.timeout_at),
            "response_reason": self.response_reason,
            "is_active": self.is_active
        }
