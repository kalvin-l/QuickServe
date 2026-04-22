"""
Admin User Model

Represents administrative staff who can access the admin portal.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Numeric, Enum as SQLEnum, JSON
from sqlalchemy.sql import func
from app.core.database import Base
import enum
from typing import TYPE_CHECKING, List, Optional

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


class AdminRole(str, enum.Enum):
    """Admin role levels with hierarchical access control.

    Hierarchy (highest to lowest):
        - ADMIN: Full system access, can manage all users
        - MANAGER: Can create/edit staff, view reports
        - STAFF: Basic operational access, can update own status
    """
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"

    @property
    def level(self) -> int:
        """Returns the hierarchical level of the role (higher = more privileges)."""
        return {self.ADMIN: 3, self.MANAGER: 2, self.STAFF: 1}[self]

    def can_manage(self, other_role: "AdminRole") -> bool:
        """Check if this role can manage another role."""
        return self.level > other_role.level


class AdminDepartment(str, enum.Enum):
    """Department assignments for operational organization.

    Used for filtering and organizing staff by their primary work area.
    """
    KITCHEN = "kitchen"
    BARISTA = "barista"
    SERVICE = "service"
    MANAGEMENT = "management"


class AdminStatus(str, enum.Enum):
    """Staff work status for tracking availability and attendance.

    Status flow:
        - ACTIVE: Currently working and available
        - ON_BREAK: Temporary break (lunch, rest)
        - OFF_DUTY: Not working (shift ended, day off)
        - ON_LEAVE: Extended leave (vacation, sick leave) - requires manager approval

    Staff can only toggle between ACTIVE, ON_BREAK, and OFF_DUTY.
    Only managers/admins can set ON_LEAVE status.
    """
    ACTIVE = "active"
    ON_BREAK = "on_break"
    OFF_DUTY = "off_duty"
    ON_LEAVE = "on_leave"

    @property
    def is_working(self) -> bool:
        """Returns True if staff is considered working (active or on break)."""
        return self in (self.ACTIVE, self.ON_BREAK)


class Admin(Base):
    """Admin user model for administrative access and staff management.

    This model represents all staff members who can access the admin portal,
    including administrators, managers, and regular staff. Each user has
    authentication credentials, role-based permissions, and employment details.

    Attributes:
        id: Unique database identifier
        email: Unique email address for login
        name: Full display name of the staff member
        hashed_password: Bcrypt hashed password
        role: Permission level (admin/manager/staff)
        is_active: Account status flag (soft delete)
        department: Operational department assignment
        status: Current work status (active/on_break/off_duty/on_leave)
        hire_date: Date of employment start
        hourly_rate: Hourly wage for payroll
        phone: Contact phone number
        avatar_url: Profile image URL
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "admins"

    # Identity & Authentication
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # Authorization
    role = Column(SQLEnum(AdminRole), default=AdminRole.STAFF, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Employment Details
    department = Column(SQLEnum(AdminDepartment), nullable=True, index=True)  # @deprecated: Use departments instead
    departments = Column(JSON, nullable=True)  # List[AdminDepartment] - Multiple departments support
    status = Column(SQLEnum(AdminStatus), default=AdminStatus.ACTIVE, nullable=True, index=True)
    hire_date = Column(Date, nullable=True)
    hourly_rate = Column(Numeric(10, 2), nullable=True)
    phone = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Audit Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Admin(id={self.id}, email={self.email}, role={self.role.value})>"

    def __str__(self) -> str:
        """Human-readable string representation."""
        dept_str = self.get_departments_str()
        return f"{self.name} ({self.role.value}) - {dept_str if dept_str else 'No Department'}"

    @property
    def is_working(self) -> bool:
        """Check if the staff member is currently working."""
        return self.status.is_working if self.status else False

    @property
    def department_list(self) -> List[AdminDepartment]:
        """Get the list of departments for this user.

        Returns the departments array if available, otherwise falls back
        to the legacy single department field.
        """
        if self.departments:
            # Parse JSON array of departments
            return [AdminDepartment(d) for d in self.departments if d in AdminDepartment.__members__.values()]
        elif self.department:
            # Legacy single department
            return [self.department]
        return []

    def get_departments_str(self) -> str:
        """Get a formatted string representation of departments."""
        depts = self.department_list
        if not depts:
            return ""
        return ", ".join(d.value.upper() for d in depts)

    def has_department(self, department: AdminDepartment) -> bool:
        """Check if user has access to a specific department."""
        return department in self.department_list

    @property
    def full_name(self) -> str:
        """Alias for name property for better readability."""
        return self.name

    def can_be_modified_by(self, other_role: AdminRole) -> bool:
        """Check if a user with other_role can modify this admin."""
        if not self.is_active:
            return True
        return other_role.can_manage(self.role) if self.role else True
