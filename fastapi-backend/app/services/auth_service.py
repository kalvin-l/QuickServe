"""
Admin Authentication Service

Business logic for admin user authentication and management.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from typing import Optional

from app.models.admin import Admin
from app.schemas.auth import AdminCreate
from app.utils.security import verify_password, get_password_hash


class AuthService:
    """Service for admin authentication operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_admin_by_email(self, email: str) -> Optional[Admin]:
        """
        Get admin user by email.

        Args:
            email: Admin email address

        Returns:
            Admin object or None
        """
        result = await self.db.execute(
            select(Admin).where(Admin.email == email)
        )
        return result.scalar_one_or_none()

    async def get_admin_by_id(self, admin_id: int) -> Optional[Admin]:
        """
        Get admin user by ID.

        Args:
            admin_id: Admin database ID

        Returns:
            Admin object or None
        """
        result = await self.db.execute(
            select(Admin).where(Admin.id == admin_id)
        )
        return result.scalar_one_or_none()

    async def authenticate_admin(self, email: str, password: str) -> Optional[Admin]:
        """
        Authenticate admin user with email and password.

        Args:
            email: Admin email address
            password: Plain text password

        Returns:
            Admin object if credentials valid, None otherwise

        Raises:
            HTTPException: If credentials invalid or account inactive
        """
        admin = await self.get_admin_by_email(email)

        if not admin:
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )

        if not admin.is_active:
            raise HTTPException(
                status_code=403,
                detail="Admin account is inactive"
            )

        if not verify_password(password, admin.hashed_password):
            raise HTTPException(
                status_code=401,
                detail="Incorrect email or password"
            )

        return admin

    async def create_admin(self, data: AdminCreate) -> Admin:
        """
        Create a new admin user.

        Args:
            data: Admin creation data

        Returns:
            Created Admin object

        Raises:
            HTTPException: If email already exists
        """
        # Check if email already exists
        existing = await self.get_admin_by_email(data.email)
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Admin with email {data.email} already exists"
            )

        # Hash password
        hashed_password = get_password_hash(data.password)

        # Create admin
        admin = Admin(
            email=data.email,
            name=data.name,
            hashed_password=hashed_password,
            role=data.role
        )

        self.db.add(admin)
        await self.db.commit()
        await self.db.refresh(admin)

        return admin
