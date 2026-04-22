"""
WebSocket Router
WebSocket endpoints for real-time updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.websocket.connection_manager import manager
from app.services.session_service import SessionService
from app.services.session_pause_service import SessionPauseService
from app.utils.timezone_config import get_utc_now
from app.models.session_participant import SessionParticipant, ConnectionStatus
from sqlalchemy import select, and_

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/table/{table_id}")
async def table_websocket(
    websocket: WebSocket,
    table_id: int,
    session_id: str = None
):
    """
    Customer WebSocket endpoint.

    Customer connects from: /table/5 page
    URL: ws://localhost:8000/ws/table/5?session_id=xxx

    Args:
        table_id: ID of the table
        session_id: Unique session identifier (optional, but recommended for multi-device support)

    Receives:
    - Order confirmations
    - Order ready notifications
    - Order status updates
    - Staff call acknowledgements
    - Session pausing warnings (Phase 3)
    - Heartbeat acknowledgments (Phase 3)

    Can send (optional):
    - Activity pings (to keep session alive)
    - Staff requests
    - Heartbeat pings (Phase 3)
    - Keep alive requests (Phase 3)
    - Session resume requests (Phase 3)
    """
    await manager.connect_table(websocket, table_id, session_id)

    try:
        while True:
            # Keep connection alive, receive client messages
            data = await websocket.receive_json()

            # Handle incoming messages from client
            message_type = data.get("type")

            if message_type == "ping":
                # Respond to ping (keep-alive)
                await websocket.send_json({"type": "pong"})

            elif message_type == "activity":
                # Customer activity (update session timestamp)
                # This would need database access, so we skip it for now
                # You could inject SessionService here if needed
                await websocket.send_json({"type": "activity_acknowledged"})

            elif message_type == "staff_call":
                # Customer requests staff assistance
                reason = data.get("reason")
                await manager.broadcast_staff_call(table_id, reason)

            # ============================================================
            # Phase 3: Session Pause/Resume WebSocket Events
            # ============================================================

            elif message_type == "heartbeat_ping":
                # Client heartbeat ping (sent every 30 seconds)
                # Updates participant's last_heartbeat_at and connection_status
                await handle_heartbeat_ping(websocket, table_id, data.get("data", {}))

            elif message_type == "keep_alive_request":
                # Extend grace period for pausing session
                await handle_keep_alive_request(websocket, table_id, data.get("data", {}))

            elif message_type == "session_resume_request":
                # Resume a paused session
                await handle_session_resume_request(websocket, table_id, data.get("data", {}))

            else:
                # Unknown message type
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })

    except WebSocketDisconnect:
        manager.disconnect_table(table_id, session_id)
    except Exception as e:
        manager.disconnect_table(table_id, session_id)
        raise


# ============================================================
# Phase 3: WebSocket Event Handlers
# ============================================================

async def handle_heartbeat_ping(websocket: WebSocket, table_id: int, data: dict):
    """
    Handle heartbeat ping from client.

    Updates participant's last_heartbeat_at and connection_status.
    Sends acknowledgment back to client.

    Args:
        websocket: WebSocket connection
        table_id: ID of the table
        data: Heartbeat data containing device_id, participant_id, timestamp
    """
    from app.core.database import get_db_context

    device_id = data.get("device_id")
    participant_id = data.get("participant_id")
    timestamp = data.get("timestamp")

    # Validate required fields
    if not device_id:
        await websocket.send_json({
            "type": "error",
            "message": "Missing device_id in heartbeat_ping"
        })
        return

    try:
        async with get_db_context() as db:
            # Find participant by device_id and table_id (through session)
            from app.models.table_session import TableSession

            # Get active session for this table
            session_result = await db.execute(
                select(TableSession).where(
                    and_(
                        TableSession.table_id == table_id,
                        TableSession.status == "active",
                        TableSession.is_active == True
                    )
                ).order_by(TableSession.started_at.desc())
            )
            session = session_result.scalar_one_or_none()

            if not session:
                await websocket.send_json({
                    "type": "heartbeat_ack",
                    "data": {
                        "server_time": get_utc_now().isoformat(),
                        "session_status": "no_active_session"
                    }
                })
                return

            # Find participant
            participant_result = await db.execute(
                select(SessionParticipant).where(
                    and_(
                        SessionParticipant.device_id == device_id,
                        SessionParticipant.table_session_id == session.id,
                        SessionParticipant.is_active == True
                    )
                )
            )
            participant = participant_result.scalar_one_or_none()

            if participant:
                # Update heartbeat
                participant.last_heartbeat_at = get_utc_now()
                participant.connection_status = ConnectionStatus.CONNECTED
                await db.commit()

                # Send acknowledgment
                await websocket.send_json({
                    "type": "heartbeat_ack",
                    "data": {
                        "server_time": get_utc_now().isoformat(),
                        "session_status": session.status,
                        "warnings": []
                    }
                })
            else:
                # Participant not found
                await websocket.send_json({
                    "type": "heartbeat_ack",
                    "data": {
                        "server_time": get_utc_now().isoformat(),
                        "session_status": "participant_not_found",
                        "warnings": ["Device not associated with this session"]
                    }
                })

    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Heartbeat processing failed: {str(e)}"
        })


async def handle_keep_alive_request(websocket: WebSocket, table_id: int, data: dict):
    """
    Handle keep alive request during grace period.

    Extends the grace period for a session in PAUSING state.

    Args:
        websocket: WebSocket connection
        table_id: ID of the table
        data: Keep alive data containing session_id, device_id
    """
    from app.core.database import get_db_context

    session_id = data.get("session_id")
    device_id = data.get("device_id")

    if not session_id:
        await websocket.send_json({
            "type": "error",
            "message": "Missing session_id in keep_alive_request"
        })
        return

    try:
        async with get_db_context() as db:
            pause_service = SessionPauseService(db)
            result = await pause_service.keep_alive(session_id=session_id)

            # Broadcast to all connections at this table
            await manager.broadcast_to_table(table_id, {
                "type": "grace_period_extended",
                "data": {
                    "session_id": session_id,
                    "extended_until": result["extended_until"],
                    "grace_period_minutes": result["grace_period_minutes"]
                },
                "timestamp": get_utc_now().isoformat()
            })

    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Keep alive failed: {str(e)}"
        })


async def handle_session_resume_request(websocket: WebSocket, table_id: int, data: dict):
    """
    Handle session resume request.

    Resumes a paused session, optionally transferring to a different table.

    Args:
        websocket: WebSocket connection
        table_id: ID of the table (current or new table for transfer)
        data: Resume data containing session_id, device_id
    """
    from app.core.database import get_db_context

    session_id = data.get("session_id")
    device_id = data.get("device_id")
    new_table_id = data.get("new_table_id", table_id)

    if not session_id or not device_id:
        await websocket.send_json({
            "type": "error",
            "message": "Missing session_id or device_id in session_resume_request"
        })
        return

    try:
        async with get_db_context() as db:
            pause_service = SessionPauseService(db)
            result = await pause_service.resume_session(
                session_id=session_id,
                device_id=device_id,
                new_table_id=new_table_id if new_table_id != table_id else None
            )

            # Broadcast session resumed to all connections
            await manager.broadcast_session_resumed(
                session_id=session_id,
                table_id=result["table_id"],
                cart_restored=result["cart_restored"]
            )

            # Send confirmation to requester
            await websocket.send_json({
                "type": "session_resumed",
                "data": {
                    "session_id": session_id,
                    "table_id": result["table_id"],
                    "status": result["status"],
                    "cart_restored": result["cart_restored"],
                    "cart_items_count": result["cart_items_count"],
                    "cart_total": result["cart_total"]
                },
                "timestamp": get_utc_now().isoformat()
            })

    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": f"Session resume failed: {str(e)}"
        })


# Helper function to get database context (for use in WebSocket handlers)
async def get_db_context():
    """
    Get database session for WebSocket handlers.

    This is a helper function that creates a new database session.
    """
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        yield session


@router.websocket("/ws/admin")
async def admin_websocket(websocket: WebSocket):
    """
    Admin dashboard WebSocket.

    Admin connects from dashboard.
    URL: ws://localhost:8000/ws/admin

    Receives:
    - New order notifications
    - Order status updates
    - Session start/end notifications
    - Capacity updates
    - Staff call notifications
    """
    await manager.connect_admin(websocket)

    try:
        while True:
            # Keep connection alive
            data = await websocket.receive()

            # Admin can send commands (optional)
            if data.get("type") == "get_stats":
                # Send connection statistics
                await websocket.send_json({
                    "type": "connection_stats",
                    "stats": manager.get_connection_stats()
                })

    except WebSocketDisconnect:
        manager.disconnect_admin(websocket)
    except Exception as e:
        manager.disconnect_admin(websocket)
        raise


@router.websocket("/ws/kitchen")
async def kitchen_websocket(websocket: WebSocket):
    """
    Kitchen display WebSocket.

    Kitchen connects from display screen.
    URL: ws://localhost:8000/ws/kitchen

    Receives:
    - New order notifications
    - Order status updates
    """
    await manager.connect_kitchen(websocket)

    try:
        while True:
            # Keep connection alive
            await websocket.receive()

    except WebSocketDisconnect:
        manager.disconnect_kitchen(websocket)
    except Exception as e:
        manager.disconnect_kitchen(websocket)
        raise


@router.get("/ws/stats")
async def get_websocket_stats():
    """
    Get WebSocket connection statistics.

    Returns current connection counts.
    """
    return manager.get_connection_stats()
