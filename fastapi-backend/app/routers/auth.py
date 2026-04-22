"""
Admin Authentication Router

Endpoints for admin login and authentication.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import AdminLogin, AdminCreate, AdminResponse, TokenResponse
from app.utils.jwt_handler import generate_admin_token, validate_admin_token
from app.utils.permissions import require_admin_or_above
from app.dependencies import get_current_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def admin_login(
    credentials: AdminLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate admin user and return JWT token.

    Args:
        credentials: Email and password
        db: Database session

    Returns:
        TokenResponse with access_token and user info

    Raises:
        HTTPException: 401 if credentials invalid
        HTTPException: 403 if account inactive
    """
    service = AuthService(db)

    # Authenticate admin
    admin = await service.authenticate_admin(
        email=credentials.email,
        password=credentials.password
    )

    # Get departments list from admin
    departments_list = [d.value for d in admin.department_list] if admin.department_list else []

    # Generate JWT token with departments
    token = generate_admin_token(
        admin_id=admin.id,
        email=admin.email,
        role=admin.role.value,
        departments=departments_list
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=AdminResponse.model_validate(admin)
    )


@router.post("/register", response_model=AdminResponse)
async def register_admin(
    admin_data: AdminCreate,
    current_admin: AdminResponse = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new admin user.

    Requires: Admin role only (for security)

    Args:
        admin_data: Admin creation data
        current_admin: Current authenticated admin (must be admin role)
        db: Database session

    Returns:
        Created Admin object

    Raises:
        HTTPException: 400 if email already exists
        HTTPException: 403 if not admin role
    """
    service = AuthService(db)

    # Hash password and create admin
    admin = await service.create_admin(admin_data)

    return AdminResponse.model_validate(admin)
