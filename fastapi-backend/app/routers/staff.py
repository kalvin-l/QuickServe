"""
Staff Management Router

Endpoints for staff CRUD operations with role-based access control.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.services.staff_service import StaffService
from app.schemas.auth import (
    AdminCreate, AdminUpdate, AdminResponse,
    StaffListResponse, StaffSearchParams, StaffStatusUpdate
)
from app.dependencies import get_current_admin
from app.dependencies import AdminResponse as CurrentAdmin
from app.models.admin import AdminRole, AdminStatus
from app.utils.permissions import (
    require_admin_or_above,
    require_manager_or_above,
    can_promote_to_role,
    can_modify_user,
    can_set_leave_status
)

router = APIRouter(prefix="/staff", tags=["Staff Management"])


# ============================================================================
# List & View Endpoints
# ============================================================================

@router.get("", response_model=StaffListResponse)
async def get_staff_list(
    department: Optional[str] = Query(None, description="Filter by department"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_admin: CurrentAdmin = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated list of staff with filtering.

    Requires: Manager or Admin role

    Filters:
        - department: Filter by department (kitchen, barista, service, management)
        - status: Filter by status (active, on_break, off_duty, on_leave)
        - role: Filter by role (admin, manager, staff)
        - search: Search in name and email fields
    """
    service = StaffService(db)

    params = StaffSearchParams(
        department=department,
        status=status_filter,
        role=role,
        search=search,
        page=page,
        page_size=page_size
    )

    staff_list, total = await service.get_staff_list(params)

    return StaffListResponse(
        items=[AdminResponse.model_validate(s) for s in staff_list],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{staff_id}", response_model=AdminResponse)
async def get_staff(
    staff_id: int,
    current_admin: CurrentAdmin = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db)
):
    """Get staff member by ID.

    Requires: Manager or Admin role
    """
    service = StaffService(db)
    staff = await service.get_staff_by_id(staff_id)
    return AdminResponse.model_validate(staff)


# ============================================================================
# Create Endpoint
# ============================================================================

@router.post("", response_model=AdminResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    data: AdminCreate,
    current_admin: CurrentAdmin = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db)
):
    """Create a new staff member.

    Requires: Manager or Admin role

    Role assignment rules:
        - Only admins can create other admins
        - Only admins can create managers
        - Managers and admins can create staff
    """
    # Check role permissions
    if not can_promote_to_role(current_admin.role, data.role or AdminRole.STAFF):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only admins can create {data.role.value if data.role else 'staff'} users"
        )

    service = StaffService(db)
    staff = await service.create_staff(data)

    return AdminResponse.model_validate(staff)


# ============================================================================
# Update Endpoints
# ============================================================================

@router.put("/{staff_id}", response_model=AdminResponse)
async def update_staff(
    staff_id: int,
    data: AdminUpdate,
    current_admin: CurrentAdmin = Depends(require_manager_or_above),
    db: AsyncSession = Depends(get_db)
):
    """Update staff member information.

    Requires: Manager or Admin role

    Modification rules:
        - Only admins can modify admins
        - Managers can only modify staff
        - Role changes require appropriate permissions
    """
    service = StaffService(db)
    target_staff = await service.get_staff_by_id(staff_id)

    # Check if current user can modify target
    if not can_modify_user(current_admin.role, target_staff.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify users with higher or equal role"
        )

    # Check role promotion permissions
    if data.role and not can_promote_to_role(current_admin.role, data.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot promote to {data.role.value} role"
        )

    staff = await service.update_staff(staff_id, data)
    return AdminResponse.model_validate(staff)


@router.patch("/{staff_id}/status", response_model=AdminResponse)
async def update_staff_status(
    staff_id: int,
    data: StaffStatusUpdate,
    current_admin: CurrentAdmin = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update staff status (active, on_break, off_duty, on_leave).

    Requires: Any authenticated user

    Status rules:
        - Staff can only update their own status (active, on_break, off_duty)
        - Staff cannot set themselves to on_leave
        - Managers and Admins can update any staff status
    """
    service = StaffService(db)
    target_staff = await service.get_staff_by_id(staff_id)

    # Staff can only update their own status
    if current_admin.role == AdminRole.STAFF and staff_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff can only update their own status"
        )

    # Staff cannot set themselves to ON_LEAVE
    if current_admin.role == AdminRole.STAFF:
        if data.status == AdminStatus.ON_LEAVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff cannot set themselves to on_leave. Contact a manager."
            )
        if target_staff.status == AdminStatus.ON_LEAVE and data.status != AdminStatus.ON_LEAVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff cannot return from leave. Contact a manager."
            )

    staff = await service.update_staff_status(staff_id, data.status)
    return AdminResponse.model_validate(staff)


# ============================================================================
# Delete Endpoint
# ============================================================================

@router.delete("/{staff_id}", response_model=AdminResponse)
async def delete_staff(
    staff_id: int,
    current_admin: CurrentAdmin = Depends(require_admin_or_above),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a staff member (soft delete).

    Requires: Admin role only

    Note: Cannot delete your own account
    """
    if staff_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    service = StaffService(db)
    staff = await service.delete_staff(staff_id)

    return AdminResponse.model_validate(staff)
