"""
Authentication and Staff Management Schemas

Pydantic schemas for admin authentication, user management, and staff operations.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal
from app.models.admin import AdminRole, AdminDepartment, AdminStatus
import re


# ============================================================================
# Base Schemas
# ============================================================================

class AdminBase(BaseModel):
    """Base admin schema with common fields."""
    email: EmailStr = Field(..., description="Admin email address")
    name: str = Field(..., min_length=2, max_length=255, description="Full name")

    @field_validator('name')
    @classmethod
    def name_must_be_valid(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        if len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters')
        # Check for at least first and last name
        if len(v.strip().split()) < 2:
            raise ValueError('Please enter both first and last name')
        return v.strip()


# ============================================================================
# Request Schemas
# ============================================================================

class AdminCreate(AdminBase):
    """Schema for creating a new admin user.

    All fields are validated before creation. Password will be hashed.
    """
    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="Password (min 6 characters)"
    )
    role: Optional[AdminRole] = Field(
        AdminRole.STAFF,
        description="Admin role level"
    )
    department: Optional[AdminDepartment] = Field(
        None,
        description="Department assignment (deprecated: use departments)"
    )
    departments: Optional[List[AdminDepartment]] = Field(
        None,
        description="Multiple department assignments (e.g., [barista, kitchen])"
    )
    status: Optional[AdminStatus] = Field(
        AdminStatus.ACTIVE,
        description="Initial staff status"
    )
    hire_date: Optional[date] = Field(
        None,
        description="Date of hire"
    )
    hourly_rate: Optional[Decimal] = Field(
        None,
        ge=0,
        le=Decimal('9999.99'),
        description="Hourly wage rate (non-negative, max 9999.99)"
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Contact phone number"
    )
    avatar_url: Optional[str] = Field(
        None,
        max_length=500,
        description="Profile image URL"
    )

    @field_validator('password')
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        if not v:
            raise ValueError('Password is required')
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        if len(v) > 100:
            raise ValueError('Password must not exceed 100 characters')
        # Password strength requirements
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

    @field_validator('phone')
    @classmethod
    def phone_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            phone_regex = r'^[\d\s\-\+\(\)]+$'
            if not re.match(phone_regex, v):
                raise ValueError('Phone number contains invalid characters')
            digits_only = re.sub(r'\D', '', v)
            if len(digits_only) < 10:
                raise ValueError('Phone number must be at least 10 digits')
        return v.strip() if v else None

    @field_validator('hire_date')
    @classmethod
    def hire_date_cannot_be_future(cls, v: Optional[date]) -> Optional[date]:
        if v:
            today = date.today()
            if v > today:
                raise ValueError('Hire date cannot be in the future')
        return v

    @model_validator(mode='after')
    def validate_departments_for_role(self) -> 'AdminCreate':
        """Staff role must have at least one department assigned."""
        if self.role == AdminRole.STAFF:
            # Check both departments (new) and department (legacy)
            has_departments = (
                (self.departments and len(self.departments) > 0) or
                self.department is not None
            )
            if not has_departments:
                raise ValueError('Staff role must have at least one department assigned')
        return self


class AdminUpdate(BaseModel):
    """Schema for updating admin user information.

    All fields are optional - only provided fields will be updated.
    """
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[AdminRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    department: Optional[AdminDepartment] = None  # @deprecated: use departments
    departments: Optional[List[AdminDepartment]] = None
    status: Optional[AdminStatus] = None
    hire_date: Optional[date] = None
    hourly_rate: Optional[Decimal] = Field(None, ge=0, le=Decimal('9999.99'))
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=500)

    @field_validator('name')
    @classmethod
    def name_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError('Name cannot be empty or whitespace')
            if len(v.strip()) < 2:
                raise ValueError('Name must be at least 2 characters')
            if len(v.strip().split()) < 2:
                raise ValueError('Please enter both first and last name')
            return v.strip()
        return v

    @field_validator('password')
    @classmethod
    def password_must_be_strong(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) < 6:
                raise ValueError('Password must be at least 6 characters')
            if len(v) > 100:
                raise ValueError('Password must not exceed 100 characters')
            if not re.search(r'[a-z]', v):
                raise ValueError('Password must contain at least one lowercase letter')
            if not re.search(r'[A-Z]', v):
                raise ValueError('Password must contain at least one uppercase letter')
            if not re.search(r'\d', v):
                raise ValueError('Password must contain at least one number')
        return v

    @field_validator('phone')
    @classmethod
    def phone_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            phone_regex = r'^[\d\s\-\+\(\)]+$'
            if not re.match(phone_regex, v):
                raise ValueError('Phone number contains invalid characters')
            digits_only = re.sub(r'\D', '', v)
            if len(digits_only) < 10:
                raise ValueError('Phone number must be at least 10 digits')
        return v.strip() if v else None

    @field_validator('hire_date')
    @classmethod
    def hire_date_cannot_be_future(cls, v: Optional[date]) -> Optional[date]:
        if v:
            today = date.today()
            if v > today:
                raise ValueError('Hire date cannot be in the future')
        return v


class AdminLogin(BaseModel):
    """Schema for admin login request."""
    email: EmailStr = Field(..., description="Admin email address")
    password: str = Field(..., description="Admin password")


class StaffSearchParams(BaseModel):
    """Query parameters for staff list filtering and pagination.

    Supports filtering by department, status, role, and text search.
    All parameters are optional for flexible querying.
    """
    department: Optional[str] = Field(None, description="Filter by department")
    status: Optional[str] = Field(None, description="Filter by status")
    role: Optional[str] = Field(None, description="Filter by role")
    search: Optional[str] = Field(
        None,
        min_length=1,
        description="Search by name or email"
    )
    page: int = Field(1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(
        20,
        ge=1,
        le=100,
        description="Items per page (max 100)"
    )

    @field_validator("department", "status", "role", mode="before")
    @classmethod
    def normalize_enum_values(cls, v: Optional[str]) -> Optional[str]:
        """Normalize enum values to lowercase for case-insensitive matching."""
        return v.lower() if v else None

    @property
    def department_enum(self) -> Optional[AdminDepartment]:
        """Convert department string to AdminDepartment enum."""
        if self.department:
            try:
                return AdminDepartment(self.department)
            except ValueError:
                return None
        return None

    @property
    def status_enum(self) -> Optional[AdminStatus]:
        """Convert status string to AdminStatus enum."""
        if self.status:
            try:
                return AdminStatus(self.status)
            except ValueError:
                return None
        return None

    @property
    def role_enum(self) -> Optional[AdminRole]:
        """Convert role string to AdminRole enum."""
        if self.role:
            try:
                return AdminRole(self.role)
            except ValueError:
                return None
        return None


class StaffStatusUpdate(BaseModel):
    """Schema for updating staff status only (quick toggle)."""
    status: AdminStatus = Field(..., description="New staff status")


# ============================================================================
# Response Schemas
# ============================================================================

class AdminResponse(AdminBase):
    """Schema for admin response (public info, excludes password)."""
    id: int
    email: str
    name: str
    role: AdminRole
    is_active: bool
    department: Optional[AdminDepartment] = None  # @deprecated: use departments
    departments: Optional[List[AdminDepartment]] = None
    status: Optional[AdminStatus] = None
    hire_date: Optional[date] = None
    hourly_rate: Optional[Decimal] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    user: AdminResponse = Field(..., description="Authenticated user info")


class StaffListResponse(BaseModel):
    """Paginated response for staff list."""
    items: List[AdminResponse]
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Items per page")
    total_pages: int = Field(..., ge=0, description="Total number of pages")

    @field_validator("total_pages")
    @classmethod
    def validate_total_pages(cls, v: int, info: Any) -> int:
        """Ensure total_pages is non-negative."""
        return max(0, v)
