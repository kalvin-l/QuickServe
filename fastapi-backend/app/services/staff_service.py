"""
Staff Management Service

Business logic for staff CRUD operations with filtering and pagination.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from fastapi import HTTPException, status
from typing import Optional, Tuple, List
from datetime import date
import logging

from app.models.admin import Admin, AdminRole, AdminDepartment, AdminStatus
from app.schemas.auth import AdminCreate, AdminUpdate, StaffSearchParams
from app.utils.security import verify_password, get_password_hash

logger = logging.getLogger(__name__)


# ============================================================================
# Exceptions
# ============================================================================

class StaffNotFoundError(HTTPException):
    """Raised when a staff member is not found."""

    def __init__(self, staff_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff with ID {staff_id} not found"
        )


class EmailAlreadyExistsError(HTTPException):
    """Raised when attempting to create/update with an existing email."""

    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Staff with email {email} already exists"
        )


# ============================================================================
# Service Class
# ============================================================================

class StaffService:
    """Service for staff management operations.

    Provides methods for CRUD operations, filtering, and pagination
    of staff members with proper error handling and validation.
    """

    def __init__(self, db: AsyncSession):
        """Initialize the staff service with a database session.

        Args:
            db: Async SQLAlchemy database session
        """
        self.db = db

    # ========================================================================
    # Query Methods
    # ========================================================================

    async def get_staff_list(
        self,
        params: StaffSearchParams
    ) -> Tuple[List[Admin], int]:
        """Get paginated list of staff with optional filtering.

        Supports filtering by department, status, role, and text search.
        Results are ordered by creation date (newest first).

        Args:
            params: Search and pagination parameters

        Returns:
            Tuple of (staff list, total count)

        Example:
            ```python
            params = StaffSearchParams(
                department="kitchen",
                status="active",
                page=1,
                page_size=20
            )
            staff, total = await service.get_staff_list(params)
            ```
        """
        # Build base query with filters
        query = self._build_filtered_query(params)

        # Get total count before pagination
        total = await self._get_count(query)

        # Apply pagination and ordering
        query = query.order_by(Admin.created_at.desc())
        query = query.offset((params.page - 1) * params.page_size)
        query = query.limit(params.page_size)

        result = await self.db.execute(query)
        staff_list = result.scalars().all()

        logger.info(
            f"Retrieved {len(staff_list)} staff members (total: {total}, "
            f"page: {params.page})"
        )

        return list(staff_list), total

    async def get_staff_by_id(self, staff_id: int) -> Admin:
        """Get staff member by ID.

        Args:
            staff_id: Admin database ID

        Returns:
            Admin object

        Raises:
            StaffNotFoundError: If staff member not found
        """
        result = await self.db.execute(
            select(Admin).where(Admin.id == staff_id)
        )
        staff = result.scalar_one_or_none()

        if not staff:
            raise StaffNotFoundError(staff_id)

        return staff

    async def get_by_email(self, email: str) -> Optional[Admin]:
        """Get staff member by email address.

        Args:
            email: Email address to search for

        Returns:
            Admin object or None if not found
        """
        result = await self.db.execute(
            select(Admin).where(Admin.email == email)
        )
        return result.scalar_one_or_none()

    async def check_email_exists(
        self,
        email: str,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if an email already exists in the database.

        Args:
            email: Email to check
            exclude_id: Optional ID to exclude from check (for updates)

        Returns:
            True if email exists, False otherwise
        """
        conditions = [Admin.email == email]
        if exclude_id:
            conditions.append(Admin.id != exclude_id)

        result = await self.db.execute(
            select(Admin).where(and_(*conditions))
        )
        return result.scalar_one_or_none() is not None

    # ========================================================================
    # Mutation Methods
    # ========================================================================

    async def create_staff(self, data: AdminCreate) -> Admin:
        """Create a new staff member.

        Validates email uniqueness and hashes password before creation.

        Args:
            data: Staff creation data

        Returns:
            Created Admin object

        Raises:
            EmailAlreadyExistsError: If email already exists
        """
        # Check email uniqueness
        if await self.check_email_exists(data.email):
            raise EmailAlreadyExistsError(data.email)

        # Hash password
        hashed_password = get_password_hash(data.password)

        # Create staff instance
        staff = Admin(
            email=data.email,
            name=data.name,
            hashed_password=hashed_password,
            role=data.role,
            department=data.department,  # Legacy single department
            departments=data.departments,  # New multiple departments support
            status=data.status,
            hire_date=data.hire_date,
            hourly_rate=data.hourly_rate,
            phone=data.phone,
            avatar_url=data.avatar_url
        )

        self.db.add(staff)
        await self.db.commit()
        await self.db.refresh(staff)

        logger.info(f"Created new staff member: {staff.email} (ID: {staff.id})")

        return staff

    async def update_staff(
        self,
        staff_id: int,
        data: AdminUpdate
    ) -> Admin:
        """Update staff member information.

        Only updates fields that are provided. Validates email uniqueness
        if email is being changed. Hashes new password if provided.

        Args:
            staff_id: Staff database ID
            data: Update data (all fields optional)

        Returns:
            Updated Admin object

        Raises:
            StaffNotFoundError: If staff not found
            EmailAlreadyExistsError: If new email already exists
        """
        staff = await self.get_staff_by_id(staff_id)

        # Check email uniqueness if being updated
        if data.email and data.email != staff.email:
            if await self.check_email_exists(data.email, exclude_id=staff_id):
                raise EmailAlreadyExistsError(data.email)
            staff.email = data.email

        # Update provided fields
        update_fields = [
            ("name", data.name),
            ("role", data.role),
            ("is_active", data.is_active),
            ("department", data.department),  # Legacy single department
            ("departments", data.departments),  # New multiple departments
            ("status", data.status),
            ("hire_date", data.hire_date),
            ("hourly_rate", data.hourly_rate),
            ("phone", data.phone),
            ("avatar_url", data.avatar_url),
        ]

        for field_name, value in update_fields:
            if value is not None:
                setattr(staff, field_name, value)

        # Update password if provided
        if data.password:
            staff.hashed_password = get_password_hash(data.password)

        await self.db.commit()
        await self.db.refresh(staff)

        logger.info(f"Updated staff member: {staff.email} (ID: {staff.id})")

        return staff

    async def delete_staff(self, staff_id: int) -> Admin:
        """Soft delete staff member by setting is_active=False.

        The staff record remains in the database but is marked as inactive.

        Args:
            staff_id: Staff database ID

        Returns:
            Deactivated Admin object

        Raises:
            StaffNotFoundError: If staff not found
        """
        staff = await self.get_staff_by_id(staff_id)

        staff.is_active = False
        await self.db.commit()
        await self.db.refresh(staff)

        logger.info(f"Deactivated staff member: {staff.email} (ID: {staff_id})")

        return staff

    async def update_staff_status(
        self,
        staff_id: int,
        new_status: AdminStatus
    ) -> Admin:
        """Quick update for staff status only.

        Updates the work status of a staff member (active, on_break, etc.).

        Args:
            staff_id: Staff database ID
            new_status: New status to set

        Returns:
            Updated Admin object

        Raises:
            StaffNotFoundError: If staff not found
        """
        staff = await self.get_staff_by_id(staff_id)

        old_status = staff.status
        staff.status = new_status
        await self.db.commit()
        await self.db.refresh(staff)

        logger.info(
            f"Updated status for {staff.email} (ID: {staff_id}): "
            f"{old_status} -> {new_status}"
        )

        return staff

    # ========================================================================
    # Private Helper Methods
    # ========================================================================

    def _build_filtered_query(self, params: StaffSearchParams) -> select:
        """Build a SQLAlchemy query with filters applied.

        Args:
            params: Search parameters with filter criteria

        Returns:
            SQLAlchemy select object with filters
        """
        query = select(Admin)

        # Apply filters using enum conversion
        if params.department_enum:
            query = query.where(Admin.department == params.department_enum)
        if params.status_enum:
            query = query.where(Admin.status == params.status_enum)
        if params.role_enum:
            query = query.where(Admin.role == params.role_enum)

        # Text search on name and email
        if params.search:
            search_term = f"%{params.search}%"
            query = query.where(
                or_(
                    Admin.name.ilike(search_term),
                    Admin.email.ilike(search_term)
                )
            )

        return query

    async def _get_count(self, query: select) -> int:
        """Get the count of results for a query.

        Args:
            query: SQLAlchemy select query

        Returns:
            Count of matching records
        """
        count_query = select(func.count()).select_from(query.subquery())
        result = await self.db.execute(count_query)
        return result.scalar() or 0
