"""
Session Participant Model
Tracks individual devices/participants within a table session
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.utils.timezone_config import serialize_datetime
import enum
import uuid


class ParticipantRole(str, enum.Enum):
    """Participant role in the session"""
    HOST = "host"       # First participant to join (created the session)
    GUEST = "guest"     # Subsequent participants


class ConnectionStatus(str, enum.Enum):
    """Connection status for heartbeat tracking"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    IDLE = "idle"


class SessionParticipant(Base):
    """
    Tracks individual devices/participants within a table session.

    This enables session pooling where:
    - One table_session can have multiple participants
    - Each device has a unique device_id stored in localStorage
    - Each participant can independently join groups
    """
    __tablename__ = "session_participants"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Participant Identifiers
    participant_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))

    # Session Relationship
    table_session_id = Column(Integer, ForeignKey("table_sessions.id"), nullable=False, index=True)

    # Device Information
    device_id = Column(String(64), index=True, nullable=False)  # From localStorage
    device_name = Column(String(100), nullable=True)  # e.g., "Mobile Device", "Desktop Browser"

    # Party Information
    customer_count = Column(Integer, default=1)  # Number of people this device represents

    # Role
    role = Column(
        SQLEnum(ParticipantRole, values_callable=lambda obj: [e.value for e in obj]),
        default=ParticipantRole.GUEST,
        index=True
    )

    # Connection Status (Phase 1: Smart Session End - Heartbeat tracking)
    connection_status = Column(String(20), default=ConnectionStatus.CONNECTED)
    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)

    # Timestamps
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    left_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    table_session = relationship("TableSession", back_populates="participants")
    join_requests = relationship("JoinRequest", back_populates="participant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SessionParticipant(id={self.id}, participant_id='{self.participant_id}', device_id='{self.device_id}', role='{self.role}')>"

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "id": self.id,
            "participant_id": self.participant_id,
            "table_session_id": self.table_session_id,
            "device_id": self.device_id,
            "device_name": self.device_name,
            "customer_count": self.customer_count,
            "role": self.role,
            "connection_status": self.connection_status,
            "last_heartbeat_at": serialize_datetime(self.last_heartbeat_at) if self.last_heartbeat_at else None,
            "is_active": self.is_active,
            "joined_at": serialize_datetime(self.joined_at),
            "last_activity_at": serialize_datetime(self.last_activity_at),
            "left_at": serialize_datetime(self.left_at),
        }
