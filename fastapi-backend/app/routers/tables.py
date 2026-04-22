"""
Tables Router
API endpoints for table CRUD operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from app.core.database import get_db
from app.services.table_service import TableService
from app.schemas.table import (
    TableCreate,
    TableUpdate,
    TableResponse,
    TableListParams,
    TableStats,
    QRCodeValidationRequest,
    QRCodeValidationResponse,
    QRCodeRegenerateResponse,
    QRCodeRequest,
    AccessCodeValidationRequest,
    AccessCodeValidationResponse,
    ScanAnalytics,
    QRExpirationUpdate,
)
from app.models.table import Table, TableLocation, TableStatus
from app.utils.qr_generator import generate_print_template
from app.utils.jwt_handler import validate_table_token


router = APIRouter(prefix="/api/tables", tags=["Tables"])


# ============================================================
# TABLE CRUD ENDPOINTS
# ============================================================


def table_to_dict(table, occupied: int = None) -> dict:
    """Convert Table model to response dict

    Args:
        table: Table model instance
        occupied: Optional pre-calculated occupancy count. If None, uses model property.
    """
    if occupied is None:
        occupied = table.occupied

    return {
        "id": table.id,
        "table_number": table.table_number,
        "location": table.location.value if table.location else None,
        "capacity": table.capacity,
        "qr_code": table.qr_code,
        "access_code": table.access_code,
        "status": table.status.value if table.status else None,
        "is_active": table.is_active,
        "occupied": occupied,
        "available_seats": max(0, table.capacity - occupied),
        "qr_expires_at": table.qr_expires_at.isoformat() if table.qr_expires_at else None,
        "qr_scan_count": table.qr_scan_count,
        "qr_last_scanned": table.qr_last_scanned.isoformat() if table.qr_last_scanned else None,
        "created_at": table.created_at.isoformat() if table.created_at else None,
        "updated_at": table.updated_at.isoformat() if table.updated_at else None,
    }


@router.get("")
async def get_tables(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=100, description="Items per page"),
    location: Optional[TableLocation] = Query(None, description="Filter by location"),
    status: Optional[TableStatus] = Query(None, description="Filter by status"),
    is_active: bool = Query(True, description="Show active tables only"),
    sort_by: str = Query("table_number", description="Sort field"),
    order: str = Query("asc", regex="^(asc|desc)$", description="Sort order"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all tables with filters, sorting, and pagination

    Query parameters:
    - **page**: Page number (1-indexed)
    - **page_size**: Items per page (1-100)
    - **location**: Filter by location (Indoor, Outdoor, Patio, Bar)
    - **status**: Filter by status (available, partial, full, cleaning, out_of_service)
    - **is_active**: Show active/inactive tables
    - **sort_by**: Sort field (table_number, capacity, location, status)
    - **order**: Sort order (asc, desc)
    """
    try:
        # Create params object
        params = TableListParams(
            page=page,
            page_size=page_size,
            location=location,
            status=status,
            is_active=is_active,
            sort_by=sort_by,
            order=order
        )

        service = TableService(db)
        result = await service.get_all_tables(params)

        # Calculate occupancy for all tables in batch (avoids N+1 queries)
        tables = result["items"]
        table_ids = [t.id for t in tables]
        occupancy_map = await service.calculate_occupancy_batch(table_ids)

        # Convert items to response format with live occupancy
        items_response = [
            table_to_dict(table, occupied=occupancy_map.get(table.id, 0))
            for table in tables
        ]

        return {
            "items": items_response,
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"],
            "has_next": result["has_next"],
            "has_prev": result["has_prev"]
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_id}")
async def get_table(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single table by ID

    - **table_id**: Table ID
    """
    service = TableService(db)
    table = await service.get_table_by_id(table_id)

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Calculate live occupancy
    occupied = await service.calculate_occupancy(table_id)

    return table_to_dict(table, occupied=occupied)


@router.get("/number/{table_number}")
async def get_table_by_number(
    table_number: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single table by table number

    - **table_number**: Table number (human-readable)
    """
    service = TableService(db)
    table = await service.get_table_by_number(table_number)

    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Calculate live occupancy
    occupied = await service.calculate_occupancy(table.id)

    return table_to_dict(table, occupied=occupied)


@router.post("", status_code=201)
async def create_table(
    table_data: TableCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new table

    Request body:
    - **table_number**: Table number (required, unique)
    - **location**: Table location (Indoor, Outdoor, Patio, Bar)
    - **capacity**: Number of seats (1-20)
    - **qr_code**: QR code (optional, auto-generated if not provided)
    - **access_code**: Access code (optional, auto-generated if not provided)
    - **status**: Initial status (default: available)
    """
    try:
        service = TableService(db)
        table = await service.create_table(table_data)
        return table_to_dict(table)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{table_id}")
async def update_table(
    table_id: int,
    table_data: TableUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a table (all fields optional)

    - **table_id**: Table ID

    Only provided fields will be updated.
    """
    try:
        service = TableService(db)
        table = await service.update_table(table_id, table_data)

        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        return table_to_dict(table)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{table_id}", status_code=204)
async def delete_table(
    table_id: int,
    hard_delete: bool = Query(False, description="Permanently delete from database"),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a table (soft delete by default)

    - **table_id**: Table ID
    - **hard_delete**: Set to true to permanently delete (admin only)

    By default, performs soft delete (sets is_active=False).
    Use hard_delete=true to permanently remove from database.
    """
    service = TableService(db)
    success = await service.delete_table(table_id, hard_delete=hard_delete)

    if not success:
        raise HTTPException(status_code=404, detail="Table not found")

    return None


@router.post("/{table_id}/regenerate-qr")
async def regenerate_qr(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerate QR codes for a table

    - **table_id**: Table ID

    Generates new QR code, QR token, and access code.
    Use this when QR codes are compromised or need to be changed.
    """
    try:
        service = TableService(db)
        table = await service.regenerate_qr_codes(table_id)

        return {
            "message": "QR codes regenerated successfully",
            "table": table_to_dict(table)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{table_id}/status")
async def update_table_status(
    table_id: int,
    status: TableStatus = Query(..., description="New table status"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update table status

    - **table_id**: Table ID
    - **status**: New status (available, partial, full, cleaning, out_of_service)
    """
    try:
        service = TableService(db)
        table = await service.update_table_status(table_id, status)

        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        return table_to_dict(table)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/summary")
async def get_table_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    Get table statistics summary

    Returns aggregated statistics including:
    - Total number of tables
    - Tables by location
    - Tables by status
    - Total capacity
    - Available seats
    """
    try:
        service = TableService(db)
        stats = await service.get_table_stats()
        return stats
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/location/{location}")
async def get_tables_by_location(
    location: TableLocation,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all tables for a specific location

    - **location**: Table location (Indoor, Outdoor, Patio, Bar)

    Returns all active tables for the specified location.
    """
    try:
        service = TableService(db)
        params = TableListParams(
            page=1,
            page_size=100,  # Get all tables for this location
            location=location,
            is_active=True
        )
        result = await service.get_all_tables(params)

        # Calculate occupancy for all tables in batch
        tables = result["items"]
        table_ids = [t.id for t in tables]
        occupancy_map = await service.calculate_occupancy_batch(table_ids)

        items_response = [
            table_to_dict(table, occupied=occupancy_map.get(table.id, 0))
            for table in tables
        ]

        return {
            "location": location.value,
            "tables": items_response,
            "total": len(items_response)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# QR Code Image Endpoints
# ============================================================

@router.get("/{table_id}/qr-image")
async def get_qr_image(
    table_id: int,
    size: str = Query("medium", regex="^(small|medium|large)$", description="Image size"),
    include_color: bool = Query(True, description="Use brand color"),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate QR code image for a table

    Query parameters:
    - **size**: Image size - small (256px), medium (512px), large (1024px)
    - **include_color**: Use brand orange color (default: true)

    Returns PNG image file for download.
    """
    try:
        service = TableService(db)
        img_io = await service.generate_qr_code_image(table_id, size=size, include_color=include_color)

        return StreamingResponse(
            img_io,
            media_type="image/png",
            headers={
                "Content-Disposition": f"attachment; filename=table-{table_id}-qr.png"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_id}/qr-print")
async def get_qr_print_template(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate print-ready QR code template for a table

    Returns a professionally designed PNG image with:
    - QR code centered
    - Table number and location
    - "Scan to Order" instructions
    - Restaurant branding

    Suitable for printing table stand cards.
    """
    try:
        service = TableService(db)
        img_io = await service.generate_qr_print_template(table_id)

        return StreamingResponse(
            img_io,
            media_type="image/png",
            headers={
                "Content-Disposition": f"attachment; filename=table-{table_id}-print.png"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qr-batch")
async def get_batch_qr_images(
    size: str = Query("medium", regex="^(small|medium|large)$", description="Image size"),
    location: Optional[TableLocation] = Query(None, description="Filter by location"),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate batch QR codes for all tables (or filtered by location)

    Query parameters:
    - **size**: Image size - small (256px), medium (512px), large (1024px)
    - **location**: Optional filter by location

    Returns a single PNG image with all QR codes arranged in a grid.
    """
    try:
        service = TableService(db)

        # Get tables
        params = TableListParams(
            page=1,
            page_size=100,  # Get all tables
            location=location,
            is_active=True
        )
        result = await service.get_all_tables(params)
        tables = result["items"]

        if not tables:
            raise HTTPException(status_code=404, detail="No tables found")

        img_io = service.generate_batch_qr_images(tables, size=size)

        location_suffix = f"-{location.value}" if location else ""
        return StreamingResponse(
            img_io,
            media_type="image/png",
            headers={
                "Content-Disposition": f"attachment; filename=all-tables-qr{location_suffix}.png"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# QR Code Validation Endpoints
# ============================================================

@router.post("/validate-qr")
async def validate_qr(
    request_data: QRCodeValidationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate QR code and return table info (with logging)

    Request body:
    - **qr_code**: QR code to validate (e.g., "QS-TABLE-5")

    Used when customer scans QR code.
    Returns table information if QR code is valid, active, and not expired.

    Logs scan attempt for analytics and security.
    """
    try:
        service = TableService(db)
        result = await service.validate_qr_code_with_logging(request_data.qr_code, request)

        if not result["valid"]:
            return {
                "valid": False,
                "table": None,
                "error": result.get("error", "Invalid QR code")
            }

        # Calculate live occupancy
        occupied = await service.calculate_occupancy(result["table"].id)

        return {
            "valid": True,
            "table": table_to_dict(result["table"], occupied=occupied),
            "error": None
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class TokenValidationRequest(BaseModel):
    """Request model for JWT token validation"""
    token: str


@router.post("/validate-token")
async def validate_token(
    request_data: TokenValidationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate JWT token from QR code scan

    Request body:
    - **token**: JWT token from QR scan

    Validates the JWT token and returns table information.
    Used by the /scan page to verify QR code tokens.

    Returns table information if token is valid and table is active.
    """
    try:
        # Validate JWT token
        token_data = validate_table_token(request_data.token)

        # Get table from database
        service = TableService(db)
        table = await service.get_table_by_id(token_data["table_id"])

        if not table or not table.is_active:
            return {
                "valid": False,
                "table": None,
                "error": "Table not found or inactive"
            }

        # Calculate live occupancy
        occupied = await service.calculate_occupancy(table.id)

        # Return table info with session data
        return {
            "valid": True,
            "table": table_to_dict(table, occupied=occupied),
            "session_id": token_data["session_id"],
            "error": None
        }
    except HTTPException:
        return {
            "valid": False,
            "table": None,
            "error": "Invalid or expired token"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class QRTokenValidationRequest(BaseModel):
    """Request model for QR token validation (qr_token field)"""
    qr_token: str


@router.post("/validate-qr-token")
async def validate_qr_token(
    request_data: QRTokenValidationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate QR token (qr_token field) from QR code scan

    Request body:
    - **qr_token**: 20-character QR token from URL parameter

    Validates the qr_token and returns table information with access_code.
    The qr_token is embedded in QR codes and never shown to customers.
    The access_code is returned for session creation.

    Returns table information if token is valid and table is active.
    """
    try:
        service = TableService(db)

        # Find table by qr_token
        query = select(Table).where(
            Table.qr_token == request_data.qr_token,
            Table.is_active == True
        )
        result = await db.execute(query)
        table = result.scalar_one_or_none()

        if not table:
            return {
                "valid": False,
                "table": None,
                "error": "Invalid QR token"
            }

        # Check if QR code has expired
        if table.qr_expires_at:
            if datetime.now(timezone.utc) > table.qr_expires_at:
                return {
                    "valid": False,
                    "table": None,
                    "error": "QR code has expired"
                }

        # Calculate live occupancy
        occupied = await service.calculate_occupancy(table.id)

        # Return table info with access_code (needed for session creation)
        return {
            "valid": True,
            "table": table_to_dict(table, occupied=occupied),
            "access_code": table.access_code,
            "error": None
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-access-code")
async def validate_access_code(
    request_data: AccessCodeValidationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate access code (manual entry backup)

    Request body:
    - **access_code**: 6-character access code

    Used when customer enters access code manually.
    Returns table information if access code is valid.
    """
    try:
        service = TableService(db)
        result = await service.validate_access_code(request_data.access_code)

        if not result["valid"]:
            return {
                "valid": False,
                "table": None
            }

        # Calculate live occupancy
        occupied = await service.calculate_occupancy(result["table"].id)

        return {
            "valid": True,
            "table": table_to_dict(result["table"], occupied=occupied)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# QR Code Management Endpoints
# ============================================================

@router.post("/{table_id}/set-qr-expiration")
async def set_qr_expiration(
    table_id: int,
    expiration_data: QRExpirationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Set or clear QR code expiration date

    - **table_id**: Table ID

    Request body:
    - **expires_at**: Expiration datetime (null to clear expiration)

    Use to temporarily disable QR codes (e.g., for maintenance).
    """
    try:
        service = TableService(db)
        table = await service.set_qr_expiration(table_id, expiration_data.expires_at)

        return {
            "message": "QR expiration updated successfully",
            "table": table_to_dict(table)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{table_id}/scan-analytics")
async def get_scan_analytics(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get QR scan analytics for a table

    - **table_id**: Table ID

    Returns:
    - Total scan count
    - Last scanned datetime
    - Scans grouped by day
    - Number of unique IP addresses
    """
    try:
        service = TableService(db)
        analytics = await service.get_scan_analytics(table_id)

        return analytics
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
