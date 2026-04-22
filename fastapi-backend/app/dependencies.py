"""
Authentication Dependencies

Shared authentication dependencies for use across routers.
This file is imported by both auth.py and permissions.py to avoid circular imports.
"""

from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import AdminResponse
from app.utils.jwt_handler import validate_admin_token


async def get_current_admin(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> AdminResponse:
    """
    Dependency to get current authenticated admin from JWT token.

    This dependency:
    1. Extracts the JWT token from the Authorization header
    2. Validates the token and extracts the admin_id
    3. Fetches the admin from the database
    4. Returns the admin user if valid

    Args:
        authorization: Authorization header (Bearer token)
        db: Database session

    Returns:
        AdminResponse with current admin info

    Raises:
        HTTPException: 401 if token invalid or missing
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    # Extract token from "Bearer <token>"
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format"
        )

    token = authorization.split(" ")[1]

    # Validate token and get payload
    payload = validate_admin_token(token)

    # Get admin from database
    service = AuthService(db)
    admin = await service.get_admin_by_id(payload["admin_id"])

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Admin user not found"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive"
        )

    return AdminResponse.model_validate(admin)
