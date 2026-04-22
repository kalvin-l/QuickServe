"""
Table Schemas
Pydantic schemas for table validation and responses
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.table import TableLocation, TableStatus


class TableBase(BaseModel):
    """Base table schema"""
    table_number: int = Field(..., ge=1, description="Table number (unique)")
    location: TableLocation = Field(..., description="Table location")
    capacity: int = Field(..., ge=1, le=20, description="Number of seats")


class TableCreate(TableBase):
    """Schema for creating a table"""
    qr_code: Optional[str] = Field(None, max_length=50, description="QR code (auto-generated if not provided)")
    access_code: Optional[str] = Field(None, max_length=10, description="Access code (auto-generated if not provided)")
    status: TableStatus = Field(default=TableStatus.AVAILABLE, description="Initial table status")


class TableUpdate(BaseModel):
    """Schema for updating a table (all fields optional)"""
    table_number: Optional[int] = Field(None, ge=1)
    location: Optional[TableLocation] = None
    capacity: Optional[int] = Field(None, ge=1, le=20)
    status: Optional[TableStatus] = None
    is_active: Optional[bool] = None


class TableResponse(BaseModel):
    """Schema for table response (public - no secrets)"""
    id: int
    table_number: int
    location: TableLocation
    capacity: int
    qr_code: str
    access_code: str
    status: TableStatus
    is_active: bool
    occupied: int = 0
    available_seats: int = 0
    qr_expires_at: Optional[datetime] = None
    qr_scan_count: int = 0
    qr_last_scanned: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TableInternal(TableResponse):
    """Schema for table response (internal - includes secrets)"""
    qr_token: str  # Only server-side


class TableListParams(BaseModel):
    """Query parameters for table list with pagination"""
    page: int = Field(1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(12, ge=1, le=100, description="Items per page")
    location: Optional[TableLocation] = Field(None, description="Filter by location")
    status: Optional[TableStatus] = Field(None, description="Filter by status")
    is_active: bool = Field(True, description="Show active tables only")
    sort_by: str = Field("table_number", description="Sort field")
    order: str = Field("asc", pattern="^(asc|desc)$", description="Sort order")


class PaginatedTableResponse(BaseModel):
    """Standard paginated response for tables"""
    items: List[TableResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class TableStats(BaseModel):
    """Table statistics summary"""
    total: int
    by_location: dict[str, int]
    by_status: dict[str, int]
    total_capacity: int
    available_seats: int


class QRCodeValidationRequest(BaseModel):
    """Request schema for QR code validation"""
    qr_code: str = Field(..., description="QR code to validate")


class QRCodeValidationResponse(BaseModel):
    """Response schema for QR code validation"""
    valid: bool
    table: Optional[TableResponse] = None


class QRCodeRegenerateResponse(BaseModel):
    """Response schema for QR code regeneration"""
    message: str
    table: TableResponse


class QRCodeRequest(BaseModel):
    """Request schema for QR code image generation"""
    size: str = Field("medium", pattern="^(small|medium|large)$", description="QR code image size")
    format: str = Field("png", pattern="^(png|pdf)$", description="Image format")
    include_color: bool = Field(True, description="Use brand color instead of black")


class AccessCodeValidationRequest(BaseModel):
    """Request schema for access code validation"""
    access_code: str = Field(..., min_length=6, max_length=6, description="6-character access code")


class AccessCodeValidationResponse(BaseModel):
    """Response schema for access code validation"""
    valid: bool
    table: Optional[TableResponse] = None


class ScanAnalytics(BaseModel):
    """Response schema for QR scan analytics"""
    table_id: int
    total_scans: int
    last_scanned: Optional[datetime] = None
    scans_by_day: List[dict] = []
    unique_ips: int = 0


class QRExpirationUpdate(BaseModel):
    """Request schema for setting QR code expiration"""
    expires_at: Optional[datetime] = Field(None, description="Expiration datetime (null to clear)")


class QRBatchRequest(BaseModel):
    """Request schema for batch QR code generation"""
    table_ids: List[int] = Field(..., min_items=1, description="List of table IDs to generate QR codes for")
    size: str = Field("medium", pattern="^(small|medium|large)$", description="QR code image size")
    format: str = Field("png", pattern="^(png|pdf)$", description="Image format")
