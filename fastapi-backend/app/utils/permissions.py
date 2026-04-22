"""
Role-Based Access Control Dependencies

FastAPI dependencies for enforcing role-based permissions.
"""

from fastapi import Depends, HTTPException, status

from app.models.admin import AdminRole
from app.dependencies import get_current_admin
from app.dependencies import AdminResponse as CurrentAdmin


async def require_role(*allowed_roles: AdminRole) -> CurrentAdmin:
    """Dependency that requires user to have at least one of the specified roles.

    Args:
        *allowed_roles: One or more AdminRole values that are allowed

    Returns:
        CurrentAdmin if authorized

    Raises:
        HTTPException: 403 if user's role is not in allowed_roles

    Example:
        ```python
        @router.get("/admin-only")
        async def admin_endpoint(
            current_admin: CurrentAdmin = Depends(require_role(AdminRole.ADMIN))
        ):
            ...

        @router.get("/manager-or-admin")
        async def manager_endpoint(
            current_admin: CurrentAdmin = Depends(
                require_role(AdminRole.ADMIN, AdminRole.MANAGER)
            )
        ):
            ...
        ```
    """
    current_admin: CurrentAdmin = await get_current_admin()

    if current_admin.role not in allowed_roles:
        allowed_str = ", ".join([r.value for r in allowed_roles])
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role: one of [{allowed_str}]"
        )

    return current_admin


async def require_admin_or_above(
    current_admin: CurrentAdmin = Depends(get_current_admin)
) -> CurrentAdmin:
    """Dependency that requires admin role (highest level).

    Use for sensitive operations like:
        - Deleting staff
        - Promoting to admin role
        - Viewing system-wide settings

    Args:
        current_admin: The authenticated admin user from dependency chain

    Returns:
        CurrentAdmin if admin

    Raises:
        HTTPException: 403 if not admin
    """
    if current_admin.role != AdminRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_admin


async def require_manager_or_above(
    current_admin: CurrentAdmin = Depends(get_current_admin)
) -> CurrentAdmin:
    """Dependency that requires manager or admin role.

    Use for management operations like:
        - Creating/editing staff
        - Managing menu items
        - Viewing reports

    Args:
        current_admin: The authenticated admin user from dependency chain

    Returns:
        CurrentAdmin if manager or admin

    Raises:
        HTTPException: 403 if not manager or admin
    """
    if current_admin.role not in (AdminRole.ADMIN, AdminRole.MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access or higher required"
        )
    return current_admin


async def require_staff_or_above(
    current_admin: CurrentAdmin = Depends(get_current_admin)
) -> CurrentAdmin:
    """Dependency that requires any authenticated staff role.

    Use for general staff operations like:
        - Updating order status
        - Viewing tables
        - Processing payments

    Note: get_current_admin already handles authentication and active check.

    Args:
        current_admin: The authenticated admin user from dependency chain

    Returns:
        CurrentAdmin (any authenticated staff)
    """
    return current_admin


def can_modify_user(actor_role: AdminRole, target_role: AdminRole) -> bool:
    """Check if a user with actor_role can modify a user with target_role.

    Modification rules:
        - Admins can modify anyone (including other admins)
        - Managers can modify staff only
        - Staff cannot modify anyone

    Args:
        actor_role: The role of the user attempting the modification
        target_role: The role of the user being modified

    Returns:
        True if modification is allowed, False otherwise
    """
    return actor_role.can_manage(target_role)


def can_promote_to_role(actor_role: AdminRole, target_role: AdminRole) -> bool:
    """Check if a user with actor_role can promote someone to target_role.

    Promotion rules:
        - Only admins can assign admin role
        - Only admins can assign manager role
        - Managers and admins can assign staff role
        - No one can promote above their own level

    Args:
        actor_role: The role of the user attempting the promotion
        target_role: The role being assigned

    Returns:
        True if promotion is allowed, False otherwise
    """
    if target_role == AdminRole.ADMIN:
        return actor_role == AdminRole.ADMIN
    if target_role == AdminRole.MANAGER:
        return actor_role == AdminRole.ADMIN
    if target_role == AdminRole.STAFF:
        return actor_role in (AdminRole.ADMIN, AdminRole.MANAGER)
    return False


def can_set_leave_status(actor_role: AdminRole, target_role: AdminRole) -> bool:
    """Check if a user can set ON_LEAVE status for another user.

    Only managers and admins can set ON_LEAVE status.

    Args:
        actor_role: The role of the user attempting to set leave status
        target_role: The role of the target user

    Returns:
        True if leave status can be set, False otherwise
    """
    return actor_role in (AdminRole.ADMIN, AdminRole.MANAGER)
