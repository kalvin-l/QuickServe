"""
Sessions Router
API endpoints for table session management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.services.session_service import SessionService, SessionAlreadyExistsError, SessionNotFoundError
from app.services.session_pause_service import SessionPauseService, CannotPauseError, CannotResumeError
from app.services.capacity_service import CapacityService
from app.websocket.connection_manager import manager
from app.models.table import Table
from app.models.table_session import TableSession

router = APIRouter(prefix="/sessions", tags=["sessions"])


# Pydantic Models for Request/Response
class CreateSessionRequest(BaseModel):
    table_number: int = Field(..., description="Table number (customer-facing identifier)")
    access_code: str = Field(..., min_length=6, max_length=6, description="6-character access code")
    customer_count: int = Field(default=1, ge=1, le=20, description="Number of customers")
    customer_name: Optional[str] = Field(None, max_length=100, description="Optional customer name")


class SessionResponse(BaseModel):
    id: int
    table_id: int
    table_number: Optional[int] = None  # Customer-facing table number
    session_id: str
    access_code: str
    customer_count: int
    customer_name: Optional[str]
    status: str
    started_at: str
    last_activity_at: str
    ended_at: Optional[str]
    metadata: dict
    is_active: bool


class CapacitySummaryResponse(BaseModel):
    total_tables: int
    available_tables: int
    occupied_tables: int
    active_sessions: int
    total_capacity: int
    current_occupancy: int
    occupancy_percent: float


class TableStatusResponse(BaseModel):
    table_id: int
    table_number: int
    location: str
    capacity: int
    status: str
    is_occupied: bool
    available_seats: int
    session: Optional[SessionResponse]


class StatisticsResponse(BaseModel):
    total_sessions: int
    active_sessions: int
    ended_sessions: int
    abandoned_sessions: int
    total_customers: int
    average_customers_per_session: float
    period_start: str
    period_end: str


# =========================
# Phase 2: Session Pause/Resume Models
# =========================

class PauseSessionRequest(BaseModel):
    reason: Optional[str] = Field("inactivity", description="Reason for pause (inactivity, checkout_complete, manual)")
    preserve_cart: bool = Field(True, description="Whether to preserve cart data")
    grace_period_minutes: int = Field(5, ge=1, le=30, description="Grace period before hard pause")


class PauseSessionResponse(BaseModel):
    success: bool
    session: dict
    cart_preserved: bool
    preserved_cart_id: Optional[str]
    grace_period_end: Optional[str]
    can_resume_until: str


class ResumeSessionRequest(BaseModel):
    device_id: str = Field(..., min_length=1, description="Device ID requesting resume")
    new_table_id: Optional[int] = Field(None, description="New table ID for transfer")


class ResumeSessionResponse(BaseModel):
    success: bool
    session: dict
    cart_restored: bool
    cart_items_count: int
    cart_total: float


class KeepAliveResponse(BaseModel):
    success: bool
    session_status: str
    extended_until: str


class HeartbeatRequest(BaseModel):
    device_id: str = Field(..., min_length=1, description="Device ID sending heartbeat")
    participant_id: Optional[str] = Field(None, description="Participant ID (optional)")
    timestamp: Optional[str] = Field(None, description="Client timestamp (ISO format)")


class HeartbeatResponse(BaseModel):
    success: bool
    session_status: str
    server_time: str
    warnings: List[str] = []


class CanEndSessionResponse(BaseModel):
    can_end: bool
    reason: Optional[str] = None
    blocking_items: Optional[dict] = None


class ResumableSessionResponse(BaseModel):
    sessions: List[dict]


class ResumableSessionItem(BaseModel):
    session_id: int
    session_uuid: str
    table_id: int
    paused_at: str
    can_resume_until: str
    has_cart: bool
    cart_item_count: int
    cart_total: float
    participant_id: str


# API Endpoints
@router.post("/start", status_code=201)
async def start_session(
    request_data: CreateSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Start a new session at a table.

    This endpoint is called when:
    - Customer scans QR code
    - Customer enters access code

    Request body:
    - **table_number**: Table number (customer-facing identifier)
    - **access_code**: 6-character access code
    - **customer_count**: Number of customers (default: 1)
    - **customer_name**: Optional customer name

    Returns the created session information with table_number.
    """
    from app.services.table_service import TableService

    service = SessionService(db)
    table_service = TableService(db)

    try:
        # Look up table by table_number to get database id
        tables_result = await db.execute(
            select(Table).where(Table.table_number == request_data.table_number)
        )
        table = tables_result.scalar_one_or_none()

        if not table:
            raise HTTPException(status_code=404, detail=f"Table {request_data.table_number} not found")

        # Create session using the database id
        session = await service.create_session(
            table_id=table.id,
            access_code=request_data.access_code,
            customer_count=request_data.customer_count,
            customer_name=request_data.customer_name
        )

        # Get session dict and add table_number
        session_dict = session.to_dict()
        session_dict["table_number"] = table.table_number

        # Broadcast session started
        await manager.broadcast_session_started(
            table_id=session.table_id,
            session_data=session_dict
        )

        return session_dict

    except SessionAlreadyExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/active/all", response_model=List[SessionResponse])
async def get_all_active_sessions(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active sessions.

    Used for admin dashboard.
    """
    service = SessionService(db)
    sessions = await service.get_all_active_sessions()
    return [session.to_dict() for session in sessions]


@router.get("/active/{table_id}", response_model=SessionResponse)
async def get_active_session(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the active session for a specific table.

    Returns the session if one exists, 404 otherwise.
    """
    service = SessionService(db)
    session = await service.get_active_session(table_id)

    if not session:
        raise HTTPException(status_code=404, detail=f"No active session for table {table_id}")

    return session.to_dict()


@router.get("/access-code/{access_code}", response_model=SessionResponse)
async def get_session_by_access_code(
    access_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get session by access code.

    Used when customer enters access code manually.
    """
    service = SessionService(db)
    session = await service.get_session_by_access_code(access_code)

    if not session:
        raise HTTPException(status_code=404, detail=f"No session found for access code {access_code}")

    # Get table_number from table
    table_result = await db.execute(
        select(Table).where(Table.id == session.table_id)
    )
    table = table_result.scalar_one_or_none()
    
    session_dict = session.to_dict()
    session_dict["table_number"] = table.table_number if table else None
    return session_dict


@router.get("/session-id/{session_id}", response_model=SessionResponse)
async def get_session_by_session_id(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get session by session_id (UUID).

    Used for JWT token validation.
    """
    service = SessionService(db)
    session = await service.get_session_by_session_id(session_id)

    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Get table_number from table
    table_result = await db.execute(
        select(Table).where(Table.id == session.table_id)
    )
    table = table_result.scalar_one_or_none()
    
    session_dict = session.to_dict()
    session_dict["table_number"] = table.table_number if table else None
    return session_dict


@router.post("/end/{table_id}")
async def end_session(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    End all active sessions for a table (customer leaves, pays, etc.).

    Updates all sessions status to 'ended' and records end time.
    Note: Multiple sessions can exist per table. This ends all of them.
    """
    service = SessionService(db)

    try:
        sessions = await service.end_session_by_table(table_id)

        if not sessions:
            raise HTTPException(status_code=404, detail=f"No active sessions for table {table_id}")

        # Broadcast session ended for each session
        for session in sessions:
            await manager.broadcast_session_ended(
                table_id=table_id,
                session_data=session.to_dict()
            )

        return {
            "message": f"Ended {len(sessions)} session(s)",
            "sessions": [s.to_dict() for s in sessions]
        }

    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/end-session/{session_id}")
async def end_session_by_id(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    End a specific session by session ID.

    Updates session status to 'ended' and records end time.
    """
    service = SessionService(db)

    try:
        session = await service.end_session(session_id)

        # Broadcast session ended
        await manager.broadcast_session_ended(
            table_id=session.table_id,
            session_data=session.to_dict()
        )

        return session.to_dict()

    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/update-activity/{table_id}")
async def update_activity(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Update session activity timestamp.

    Call this when customer:
    - Adds item to cart
    - Places order
    - Any interaction
    """
    service = SessionService(db)
    await service.update_activity(table_id)

    return {"message": "Activity updated"}


@router.post("/cleanup")
async def cleanup_abandoned_sessions(
    db: AsyncSession = Depends(get_db)
):
    """
    Cleanup abandoned sessions (20min inactivity).

    This is typically called as a background task every 10 minutes.
    """
    service = SessionService(db)
    abandoned_count = await service.cleanup_abandoned_sessions()

    return {
        "message": f"Cleaned up {abandoned_count} abandoned sessions",
        "abandoned_count": abandoned_count
    }


@router.get("/statistics", response_model=StatisticsResponse)
async def get_session_statistics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get session statistics for analytics.

    Optional date range filtering (ISO format strings).
    """
    service = SessionService(db)

    # Parse dates if provided
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    stats = await service.get_session_statistics(start_dt, end_dt)
    return stats


# Capacity Endpoints
@router.get("/capacity/summary", response_model=CapacitySummaryResponse)
async def get_capacity_summary(
    db: AsyncSession = Depends(get_db)
):
    """
    Get capacity summary for admin dashboard.

    Returns total tables, available tables, occupied tables, etc.
    """
    service = CapacityService(db)
    summary = await service.get_capacity_summary()
    return summary


@router.get("/capacity/by-location")
async def get_capacity_by_location(
    db: AsyncSession = Depends(get_db)
):
    """
    Get capacity breakdown by location.

    Returns metrics for Indoor, Outdoor, Bar, etc.
    """
    service = CapacityService(db)
    data = await service.get_capacity_by_location()
    return data


@router.get("/capacity/available")
async def get_available_tables(
    location: Optional[str] = None,
    min_capacity: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get available tables (not occupied).

    Optional filters:
    - location: Filter by location (Indoor, Outdoor, etc.)
    - min_capacity: Minimum capacity required
    """
    service = CapacityService(db)
    tables = await service.get_available_tables(location, min_capacity)

    return {
        "count": len(tables),
        "tables": [
            {
                "id": t.id,
                "table_number": t.table_number,
                "location": str(t.location),
                "capacity": t.capacity
            }
            for t in tables
        ]
    }


@router.get("/capacity/table/{table_id}", response_model=TableStatusResponse)
async def get_table_status(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed status of a specific table.

    Returns table info and active session if any.
    """
    service = CapacityService(db)
    status = await service.get_table_status(table_id)

    if not status:
        raise HTTPException(status_code=404, detail=f"Table {table_id} not found")

    return status


@router.get("/capacity/can-seat/{party_size}")
async def can_seat_party(
    party_size: int,
    location: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if there's a table available for a party of X people.

    Returns true/false and recommended table if available.
    """
    service = CapacityService(db)

    can_seat = await service.can_seat_party(party_size, location)
    recommended_table = await service.recommend_table(party_size, location)

    return {
        "can_seat": can_seat,
        "recommended_table": {
            "id": recommended_table.id,
            "table_number": recommended_table.table_number,
            "location": str(recommended_table.location),
            "capacity": recommended_table.capacity
        } if recommended_table else None
    }


@router.get("/capacity/all-tables")
async def get_all_tables_status(
    db: AsyncSession = Depends(get_db)
):
    """
    Get status of all tables for dashboard display.

    Returns array of table statuses with session info.
    """
    service = CapacityService(db)
    statuses = await service.get_all_tables_status()
    return statuses


@router.post("/metadata/{table_id}")
async def update_session_metadata(
    table_id: int,
    metadata: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Update session metadata (cart, preferences, etc.).

    Merges provided metadata with existing metadata.
    """
    service = SessionService(db)
    await service.update_session_metadata(table_id, metadata)

    return {"message": "Metadata updated"}


# =========================
# Session Pooling Endpoints
# =========================

class JoinSessionRequest(BaseModel):
    access_code: str = Field(..., min_length=6, max_length=6, description="6-character access code")
    device_id: str = Field(..., min_length=1, description="Unique device identifier from localStorage")
    device_name: Optional[str] = Field(None, max_length=100, description="Optional device name")
    customer_count: int = Field(default=1, ge=1, le=20, description="Number of customers")


class JoinSessionResponse(BaseModel):
    session: SessionResponse
    participant: dict


@router.post("/join")
async def join_session(
    request_data: JoinSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new session for a device at a table.

    Each device/customer gets their own session.
    Multiple sessions can exist for the same table (one per device).
    The table's occupied count is the sum of all active sessions' customer_count.

    Request body:
    - **access_code**: 6-character access code
    - **device_id**: Unique device identifier from localStorage
    - **device_name**: Optional device name (e.g., "Mobile Device")
    - **customer_count**: Number of customers (default: 1)

    Returns the session and participant information.
    """
    import logging
    logger = logging.getLogger(__name__)
    from app.services.table_service import TableService
    from app.models.table import Table

    service = SessionService(db)
    table_service = TableService(db)

    try:
        logger.info(f"[DEBUG join_session] access_code={request_data.access_code}, device_id={request_data.device_id}")

        # Get table from access_code
        table_result = await db.execute(
            select(Table).where(Table.access_code == request_data.access_code.upper())
        )
        table = table_result.scalar_one_or_none()

        if not table:
            raise HTTPException(status_code=404, detail=f"No table found with access code {request_data.access_code}")

        logger.info(f"[DEBUG join_session] Found table: {table.id}")

        # Always create a NEW session for this device (multiple sessions per table allowed)
        session = await service.create_session(
            table_id=table.id,
            access_code=request_data.access_code,
            customer_count=request_data.customer_count  # Set the actual customer count
        )

        logger.info(f"[DEBUG join_session] Created new session: {session.id}, session_id={session.session_id}, customer_count={session.customer_count}")

        # Add the device as the first participant (HOST of this session)
        logger.info(f"[DEBUG join_session] Calling add_participant_to_session with customer_count={request_data.customer_count}")
        participant = await service.add_participant_to_session(
            table_session_id=session.id,
            device_id=request_data.device_id,
            device_name=request_data.device_name,
            customer_count=request_data.customer_count,
            role="host"
        )

        logger.info(f"[DEBUG join_session] Added participant: {participant.participant_id}, customer_count={participant.customer_count}")

        # Refresh session to see updated customer_count
        await db.refresh(session)
        logger.info(f"[DEBUG join_session] Session customer_count after add_participant: {session.customer_count}")

        # Build response
        session_dict = session.to_dict()
        session_dict["table_number"] = table.table_number

        participant_dict = participant.to_dict()

        logger.info(f"[DEBUG join_session] Returning response")

        return {
            "session": session_dict,
            "participant": participant_dict
        }

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"[DEBUG join_session] ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except SessionAlreadyExistsError as e:
        logger.error(f"[DEBUG join_session] SessionAlreadyExistsError: {e}")
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        logger.error(f"[DEBUG join_session] Unexpected error: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


class GetParticipantByDeviceResponse(BaseModel):
    participant: Optional[dict]
    session: Optional[SessionResponse]


@router.get("/participant/device/{device_id}", response_model=GetParticipantByDeviceResponse)
async def get_participant_by_device(
    device_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get participant and session by device_id.

    Returns the participant and session if found, null otherwise.
    Used to check if a device is already in a session.
    """
    service = SessionService(db)

    result = await service.get_participant_by_device_id(device_id)

    if not result:
        return {"participant": None, "session": None}

    participant = result["participant"]
    session = result["session"]

    # Get table_number
    table_result = await db.execute(
        select(Table).where(Table.id == session.table_id)
    )
    table = table_result.scalar_one_or_none()

    session_dict = session.to_dict()
    session_dict["table_number"] = table.table_number if table else None

    return {
        "participant": participant.to_dict(),
        "session": session_dict
    }


class GetParticipantsResponse(BaseModel):
    participants: List[dict]


@router.get("/{table_session_id}/participants")
async def get_session_participants(
    table_session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active participants for a session.

    Returns list of participants with their device info.
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        service = SessionService(db)

        participants = await service.get_session_participants(table_session_id)

        logger.info(f"[DEBUG] Found {len(participants)} participants for session {table_session_id}")

        result = {
            "participants": [p.to_dict() for p in participants]
        }

        logger.info(f"[DEBUG] Returning participants: {len(result['participants'])}")

        return result
    except Exception as e:
        logger.error(f"[DEBUG] Error getting participants: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# =========================
# Phase 2: Session Pause/Resume Endpoints
# =========================

@router.post("/{session_id}/pause", response_model=PauseSessionResponse)
async def pause_session(
    session_id: int,
    request_data: PauseSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Pause a session with grace period.

    This initiates a graceful pause sequence:
    1. Checks if session can be paused (no pending orders/payments)
    2. Preserves cart data if requested
    3. Sets grace period (user can resume without penalty)
    4. Marks session as PAUSING

    After grace period expires, session transitions to PAUSED and table is freed.

    Request body:
    - **reason**: Reason for pause (default: "inactivity")
    - **preserve_cart**: Whether to preserve cart (default: true)
    - **grace_period_minutes**: Grace period in minutes (default: 5, max: 30)
    """
    import logging
    logger = logging.getLogger(__name__)

    pause_service = SessionPauseService(db)

    try:
        result = await pause_service.pause_session(
            session_id=session_id,
            reason=request_data.reason,
            grace_period_minutes=request_data.grace_period_minutes,
            preserve_cart=request_data.preserve_cart,
            ended_by="user"
        )

        # Broadcast session pausing event via WebSocket
        await manager.broadcast_session_pausing(
            session_id=session_id,
            grace_period_end=result["grace_period_end"],
            reason=request_data.reason
        )

        logger.info(f"Session {session_id} paused successfully")

        return PauseSessionResponse(
            success=True,
            session={
                "id": result["session_id"],
                "status": result["status"]
            },
            cart_preserved=result["cart_preserved"],
            preserved_cart_id=result.get("preserved_cart_id"),
            grace_period_end=result.get("grace_period_end"),
            can_resume_until=result["can_resume_until"]
        )

    except CannotPauseError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error pausing session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{session_id}/resume", response_model=ResumeSessionResponse)
async def resume_session(
    session_id: int,
    request_data: ResumeSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Resume a paused session.

    Restores a paused session to ACTIVE state.
    Can optionally transfer to a different table.

    Request body:
    - **device_id**: Device ID requesting resume (required)
    - **new_table_id**: Optional new table ID for transfer
    """
    import logging
    logger = logging.getLogger(__name__)

    pause_service = SessionPauseService(db)

    try:
        result = await pause_service.resume_session(
            session_id=session_id,
            device_id=request_data.device_id,
            new_table_id=request_data.new_table_id
        )

        # Get table info for response
        table_result = await db.execute(
            select(Table).where(Table.id == result["table_id"])
        )
        table = table_result.scalar_one_or_none()

        session_dict = {
            "id": result["session_id"],
            "status": result["status"],
            "table_id": result["table_id"],
            "table_number": table.table_number if table else None,
            "session_id": result["session_id_uuid"],
            "access_code": result["access_code"]
        }

        # Broadcast session resumed event via WebSocket
        await manager.broadcast_session_resumed(
            session_id=session_id,
            table_id=result["table_id"],
            cart_restored=result["cart_restored"]
        )

        logger.info(f"Session {session_id} resumed successfully by device {request_data.device_id}")

        return ResumeSessionResponse(
            success=True,
            session=session_dict,
            cart_restored=result["cart_restored"],
            cart_items_count=result["cart_items_count"],
            cart_total=result["cart_total"]
        )

    except CannotResumeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error resuming session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{session_id}/keep-alive", response_model=KeepAliveResponse)
async def keep_session_alive(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Extend grace period for a session in PAUSING state.

    This allows user to keep their session active without it transitioning to PAUSED.
    Extends the grace period by the original grace_period_minutes amount.
    """
    import logging
    logger = logging.getLogger(__name__)

    pause_service = SessionPauseService(db)

    try:
        result = await pause_service.keep_alive(session_id=session_id)

        logger.info(f"Session {session_id} grace period extended to {result['extended_until']}")

        return KeepAliveResponse(
            success=True,
            session_status=result["status"],
            extended_until=result["extended_until"]
        )

    except CannotResumeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error extending grace period for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{session_id}/heartbeat", response_model=HeartbeatResponse)
async def send_heartbeat(
    session_id: int,
    request_data: HeartbeatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Send heartbeat ping from client to server.

    This should be called every 30 seconds while session is active.
    Updates participant's last_heartbeat_at and connection_status.
    """
    # Local imports to avoid circular dependency
    from app.models.session_participant import SessionParticipant, ConnectionStatus
    from app.utils.timezone_config import get_utc_now
    from sqlalchemy import and_

    # Find participant by device_id and session_id
    result = await db.execute(
        select(SessionParticipant).where(
            and_(
                SessionParticipant.device_id == request_data.device_id,
                SessionParticipant.table_session_id == session_id,
                SessionParticipant.is_active == True
            )
        )
    )
    participant = result.scalar_one_or_none()

    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    # Update heartbeat
    participant.last_heartbeat_at = get_utc_now()
    participant.connection_status = ConnectionStatus.CONNECTED
    await db.commit()

    # Get session status
    session_result = await db.execute(
        select(TableSession).where(TableSession.id == session_id)
    )
    session = session_result.scalar_one_or_none()

    return HeartbeatResponse(
        success=True,
        session_status=session.status if session else "unknown",
        server_time=get_utc_now().isoformat(),
        warnings=[]
    )


@router.get("/{session_id}/can-end", response_model=CanEndSessionResponse)
async def check_session_can_end(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a session can be ended safely.

    Returns whether there are any blocking conditions that prevent
    the session from ending (pending orders, unpaid amounts, etc.).
    """
    import logging
    logger = logging.getLogger(__name__)

    pause_service = SessionPauseService(db)

    try:
        can_pause = await pause_service.can_pause_session(session_id)

        # Invert logic for "can end" (same checks as can_pause)
        can_end = can_pause["can_pause"]
        reason = can_pause["reason"]

        return CanEndSessionResponse(
            can_end=can_end,
            reason=reason if not can_end else None,
            blocking_items=can_pause.get("blocking_items") if not can_end else None
        )

    except Exception as e:
        logger.error(f"Error checking if session {session_id} can end: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/device/{device_id}/resumable", response_model=ResumableSessionResponse)
async def get_resumable_sessions(
    device_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all resumable (paused) sessions for a device.

    Returns sessions that are in PAUSED or PAUSING state and haven't expired.
    These sessions can be resumed by the device.
    """
    import logging
    logger = logging.getLogger(__name__)

    pause_service = SessionPauseService(db)

    try:
        sessions = await pause_service.get_resumable_sessions(device_id)

        # Enrich with table numbers
        for session in sessions:
            table_result = await db.execute(
                select(Table).where(Table.id == session["table_id"])
            )
            table = table_result.scalar_one_or_none()
            session["table_number"] = table.table_number if table else None

        logger.info(f"Found {len(sessions)} resumable sessions for device {device_id}")

        return ResumableSessionResponse(sessions=sessions)

    except Exception as e:
        logger.error(f"Error getting resumable sessions for device {device_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/end/{table_id}")
async def end_session_enhanced(
    table_id: int,
    force: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    End all active sessions for a table with blocking checks.

    Enhanced version of the original end_session endpoint.
    Checks for blocking conditions (pending orders, unpaid amounts) before ending.

    Query params:
    - **force**: If true, ends session even with blocking conditions
    """
    import logging
    logger = logging.getLogger(__name__)

    service = SessionService(db)
    pause_service = SessionPauseService(db)

    try:
        # Get all active sessions for this table
        sessions = await service.get_active_sessions_for_table(table_id)

        if not sessions:
            raise HTTPException(status_code=404, detail=f"No active sessions for table {table_id}")

        # Check if sessions can be ended (no blocking conditions)
        blocking_sessions = []
        for session in sessions:
            can_pause = await pause_service.can_pause_session(session.id)
            if not can_pause["can_pause"]:
                blocking_sessions.append({
                    "session_id": session.id,
                    "reason": can_pause["reason"],
                    "blocking_items": can_pause.get("blocking_items", {})
                })

        # If there are blocking conditions and force is false, return error
        if blocking_sessions and not force:
            raise HTTPException(
                status_code=409,
                detail={
                    "error": "cannot_end",
                    "message": "Some sessions have pending orders or payments. Use ?force=true to end anyway.",
                    "blocking_sessions": blocking_sessions
                }
            )

        # End all sessions
        ended_sessions = []
        for session in sessions:
            ended = await service.end_session(session.id)

            # Broadcast session ended
            await manager.broadcast_session_ended(
                table_id=table_id,
                session_data=ended.to_dict()
            )

            ended_sessions.append(ended)

        logger.info(f"Ended {len(ended_sessions)} session(s) for table {table_id}")

        return {
            "message": f"Ended {len(ended_sessions)} session(s)",
            "sessions": [s.to_dict() for s in ended_sessions],
            "forced": force
        }

    except SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending sessions for table {table_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
