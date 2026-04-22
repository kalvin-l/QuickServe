"""
QR Scan Log Model
Tracks QR code scans for analytics and security
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.core.database import Base


class QRScanLog(Base):
    """
    QR code scan log for analytics and security tracking.

    Tracks every QR scan with:
    - Which table was scanned
    - When it was scanned
    - IP address (for rate limiting)
    - User agent (for analytics)
    - Validation result (success, failed, expired)
    """
    __tablename__ = "qr_scan_logs"

    # Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # Foreign Key to Table
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False, index=True)

    # QR Code that was scanned
    qr_code = Column(String(50), nullable=False, index=True)

    # Scan metadata
    scanned_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Request metadata (for security/analytics)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)

    # Validation result
    validation_result = Column(String(20), nullable=False)  # success, failed, expired

    def __repr__(self):
        return f"<QRScanLog(id={self.id}, table_id={self.table_id}, qr_code='{self.qr_code}', result='{self.validation_result}')>"

    # Indexes for common queries
    __table_args__ = (
        Index('ix_qr_scan_logs_table_scanned', 'table_id', 'scanned_at'),
        Index('ix_qr_scan_logs_qr_scanned', 'qr_code', 'scanned_at'),
        Index('ix_qr_scan_logs_ip_scanned', 'ip_address', 'scanned_at'),
    )
