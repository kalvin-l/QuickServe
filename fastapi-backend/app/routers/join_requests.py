"""
Join Requests Router
API endpoints for managing group join requests
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.services.group_service import GroupService, GroupNotFoundError
from app.models.group_session import GroupSession


logger = logging.getLogger(__name__)
router = APIRouter(tags=["join-requests"])


# =========================
# SCHEMAS
# =========================

class CreateJoinRequestBody(BaseModel):
    """Request body for creating a join request"""
    group_id: str
    session_id: Optional[str] = None  # For backward compatibility
    participant_id: Optional[int] = None  # For session pooling
    name: Optional[str] = None
    message: Optional[str] = None


class DeclineRequestBody(BaseModel):
    """Request body for declining a join request"""
    reason: Optional[str] = None


class JoinRequestResponse(BaseModel):
    """Response for a join request"""
    id: int
    request_id: str
    group_session_id: int
    participant_id: Optional[int]
    requester_session_id: str
    requester_name: Optional[str]
    message: Optional[str]
    status: str
    created_at: str
    responded_at: Optional[str]
    timeout_at: Optional[str]
    response_reason: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


def request_to_dict(request) -> dict:
    """Convert JoinRequest to dictionary"""
    return {
        "id": request.id,
        "request_id": request.request_id,
        "group_session_id": request.group_session_id,
        "participant_id": request.participant_id,
        "requester_session_id": request.requester_session_id,
        "requester_name": request.requester_name,
        "message": request.message,
        "status": request.status.value if hasattr(request.status, 'value') else request.status,
        "created_at": request.created_at.isoformat() if request.created_at else None,
        "responded_at": request.responded_at.isoformat() if request.responded_at else None,
        "timeout_at": request.timeout_at.isoformat() if request.timeout_at else None,
        "response_reason": request.response_reason,
        "is_active": request.is_active
    }


async def verify_host_permission_for_join_request(
    request_id: str,
    session_id: str,
    db: AsyncSession
) -> bool:
    """
    Verify that the session_id belongs to the host of the group
    that the join request is for.

    Args:
        request_id: The join request ID
        session_id: The session ID of the user making the request
        db: Database session

    Returns:
        bool: True if the user is the host

    Raises:
        HTTPException: If request not found or user is not the host
    """
    service = GroupService(db)

    # Get the join request first
    request = await service.get_join_request_by_id(request_id)
    if not request:
        raise HTTPException(status_code=404, detail=f"Join request {request_id} not found")

    # Get the group by numeric ID (group_session_id is the foreign key to GroupSession.id)
    result = await db.execute(
        select(GroupSession).where(GroupSession.id == request.group_session_id)
    )
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail=f"Group with ID {request.group_session_id} not found")

    # Log the comparison for debugging
    logger.info(
        f"[JOIN_REQUESTS] Permission check: "
        f"request_id={request_id}, "
        f"group_id={group.group_id}, "
        f"host_session_id='{group.host_session_id}' (type: {type(group.host_session_id)}), "
        f"request_session_id='{session_id}' (type: {type(session_id)}), "
        f"match={group.host_session_id == session_id}"
    )

    # Check if the session_id matches the host's session_id
    is_host = group.host_session_id == session_id

    if not is_host:
        logger.warning(
            f"[JOIN_REQUESTS] Non-host attempted to approve/decline join request: "
            f"request_id={request_id}, session_id={session_id}, "
            f"host_session_id={group.host_session_id}"
        )
        raise HTTPException(
            status_code=403,
            detail="Only the host can approve or decline join requests"
        )

    return True


# =========================
# ENDPOINTS
# =========================

@router.post("/create", status_code=201)
async def create_join_request(
    body: CreateJoinRequestBody,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a join request to join a group.

    If the group has auto_approve_joins enabled, the request will be
    automatically approved and the requester will be added as a member.

    Request body:
    - **group_id**: Group ID (UUID) to join
    - **session_id**: Requester's session ID (for backward compatibility)
    - **participant_id**: Requester's participant ID (for session pooling)
    - **name**: Optional requester name
    - **message**: Optional message to host
    """
    service = GroupService(db)

    try:
        # Create join request with participant_id for session pooling
        request = await service.create_join_request(
            group_id=body.group_id,
            requester_session_id=body.session_id,
            requester_name=body.name,
            message=body.message,
            requester_participant_id=body.participant_id
        )

        return request_to_dict(request)

    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/group/{group_id}/pending")
async def get_pending_requests(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all pending join requests for a group.

    Used by the host to see who wants to join their group.
    """
    service = GroupService(db)

    try:
        requests = await service.get_pending_requests(group_id)
        return [request_to_dict(r) for r in requests]

    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.patch("/{request_id}/approve")
async def approve_request(
    request_id: str,
    session_id: str = Query(..., description="Host's session ID for permission verification"),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a join request.

    This will add the requester as a member of the group.

    Only the host of the group can approve join requests.
    """
    # Verify host permission before proceeding
    await verify_host_permission_for_join_request(request_id, session_id, db)

    service = GroupService(db)

    try:
        request = await service.approve_join_request(request_id)
        return request_to_dict(request)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.patch("/{request_id}/decline")
async def decline_request(
    request_id: str,
    body: DeclineRequestBody = None,
    session_id: str = Query(..., description="Host's session ID for permission verification"),
    db: AsyncSession = Depends(get_db)
):
    """
    Decline a join request.

    Only the host of the group can decline join requests.
    """
    # Verify host permission before proceeding
    await verify_host_permission_for_join_request(request_id, session_id, db)

    service = GroupService(db)

    try:
        reason = body.reason if body else None
        request = await service.decline_join_request(request_id, reason)
        return request_to_dict(request)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/my/{session_id}")
async def get_my_request(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the current user's pending join request status.

    Used by joiners to check if their request has been approved/declined.
    """
    service = GroupService(db)

    try:
        request = await service.get_join_request_by_session(session_id)
        if not request:
            raise HTTPException(status_code=404, detail="No join request found")
        return request_to_dict(request)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{request_id}")
async def get_request_by_id(
    request_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a join request by its ID.
    """
    service = GroupService(db)

    try:
        request = await service.get_join_request_by_id(request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        return request_to_dict(request)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
