"""
Table Model
Represents physical tables in the cafe/restaurant
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class TableLocation(str, enum.Enum):
    """Table location in the establishment"""
    INDOOR = "Indoor"
    OUTDOOR = "Outdoor"
    PATIO = "Patio"
    BAR = "Bar"


class TableStatus(str, enum.Enum):
    """Table status based on occupancy"""
    AVAILABLE = "available"
    PARTIAL = "partial"
    FULL = "full"
    CLEANING = "cleaning"
    OUT_OF_SERVICE = "out_of_service"


class Table(Base):
    """Table model for physical tables in the cafe"""

    __tablename__ = "tables"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Table Identification
    table_number = Column(Integer, nullable=False, unique=True, index=True)
    location = Column(SQLEnum(TableLocation), nullable=False, index=True)
    capacity = Column(Integer, nullable=False)  # Number of seats

    # QR Code System
    qr_code = Column(String(50), nullable=False, unique=True, index=True)  # Public: "QS-TABLE-5"
    qr_token = Column(String(100), nullable=False, unique=True)  # Secret validation token
    access_code = Column(String(10), nullable=False, unique=True)  # 6-char backup code

    # QR Code Security & Analytics
    qr_expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiration date
    qr_scan_count = Column(Integer, default=0)  # Total scan count
    qr_last_scanned = Column(DateTime(timezone=True), nullable=True)  # Last scan timestamp

    # Status Tracking
    status = Column(SQLEnum(TableStatus), default=TableStatus.AVAILABLE, index=True)
    is_active = Column(Boolean, default=True, index=True)  # Soft delete toggle

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Table(id={self.id}, table_number={self.table_number}, location='{self.location}', capacity={self.capacity})>"

    @property
    def occupied(self) -> int:
        """
        Current occupancy count.
        Phase 1: Always returns 0 (no session tracking yet)
        Phase 2: Will query TableSession to count active sessions
        """
        return 0  # TODO: Implement in Phase 2 with session tracking

    @property
    def available_seats(self) -> int:
        """Number of available seats at this table"""
        return max(0, self.capacity - self.occupied)

    @property
    def is_full(self) -> bool:
        """Check if table is at full capacity"""
        return self.occupied >= self.capacity

    @property
    def is_available(self) -> bool:
        """Check if table is available for new sessions"""
        return self.status == TableStatus.AVAILABLE and not self.is_full and self.is_active
