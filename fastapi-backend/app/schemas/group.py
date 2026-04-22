"""
Group Schemas
Pydantic schemas for group ordering validation and responses
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.group_session import PaymentType, GroupSessionStatus


class GroupMemberResponse(BaseModel):
    """Schema for group member response"""
    id: int
    member_id: str
    session_id: Optional[str]
    participant_id: Optional[int]
    name: Optional[str]
    has_joined: bool
    has_paid: bool
    order_subtotal: int  # Stored in cents
    payment_method: Optional[str]
    joined_at: Optional[str]
    paid_at: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class GroupCreateRequest(BaseModel):
    """Schema for creating a group session"""
    table_id: int = Field(..., description="Table ID")
    session_id: str = Field(..., description="Host's session ID (from table session)")
    host_name: Optional[str] = Field(None, max_length=100, description="Host's name")
    payment_type: PaymentType = Field(..., description="Payment mode: host_pays_all, individual, or hybrid")
    auto_approve_joins: bool = Field(default=False, description="Auto-approve join requests")
    max_members: int = Field(default=6, ge=2, le=20, description="Maximum number of members")
    participant_id: Optional[int] = Field(None, description="Host's participant ID (for session pooling)")

    @field_validator('payment_type')
    @classmethod
    def validate_payment_type(cls, v):
        """Validate payment type"""
        if v not in PaymentType:
            raise ValueError(f"Invalid payment type. Must be one of: {list(PaymentType)}")
        return v


class GroupResponse(BaseModel):
    """Schema for group session response"""
    id: int
    group_id: str
    table_id: int
    host_session_id: str
    host_name: Optional[str]
    payment_type: PaymentType
    auto_approve_joins: bool
    max_members: int
    status: GroupSessionStatus
    member_count: int
    share_code: str
    share_link: Optional[str]
    created_at: str
    closed_at: Optional[str]
    paid_at: Optional[str]
    metadata: dict
    is_active: bool

    class Config:
        from_attributes = True


class GroupDetailResponse(GroupResponse):
    """Schema for group details with members"""
    members: List[GroupMemberResponse]


class GroupUpdateRequest(BaseModel):
    """Schema for updating a group session (host actions)"""
    auto_approve_joins: Optional[bool] = Field(None, description="Toggle auto-approve join requests")
    max_members: Optional[int] = Field(None, ge=2, le=20, description="Update max members")


class GroupCloseRequest(BaseModel):
    """Schema for closing a group (no new members)"""
    reason: Optional[str] = Field(None, max_length=500, description="Optional reason for closing")


class GroupStatusUpdateRequest(BaseModel):
    """Schema for updating group status"""
    status: GroupSessionStatus = Field(..., description="New status: active, closed, paid, or cancelled")


class JoinGroupRequest(BaseModel):
    """Schema for requesting to join a group"""
    session_id: Optional[str] = Field(None, description="Requester's session ID (for backward compatibility)")
    participant_id: Optional[int] = Field(None, description="Requester's participant ID (for session pooling)")
    name: Optional[str] = Field(None, max_length=100, description="Requester's name")
    message: Optional[str] = Field(None, max_length=500, description="Optional message to host")


class JoinRequestCreate(BaseModel):
    """Schema for creating a join request (internal)"""
    group_session_id: int = Field(..., description="Group session ID")
    requester_session_id: Optional[str] = Field(None, description="Requester's session ID")
    participant_id: Optional[int] = Field(None, description="Requester's participant ID")
    requester_name: Optional[str] = Field(None, max_length=100, description="Requester's name")
    message: Optional[str] = Field(None, max_length=500, description="Optional message")


class JoinRequestResponse(BaseModel):
    """Schema for join request response"""
    id: int
    request_id: str
    group_session_id: int
    requester_name: Optional[str]
    requester_session_id: str
    message: Optional[str]
    status: str
    created_at: str
    timeout_at: Optional[str]
    responded_at: Optional[str]

    class Config:
        from_attributes = True


class JoinRequestAction(BaseModel):
    """Schema for approving/declining join requests"""
    action: str = Field(..., pattern="^(approve|decline)$", description="Approve or decline the request")
    reason: Optional[str] = Field(None, max_length=500, description="Optional reason for decline")


class GroupStats(BaseModel):
    """Schema for group statistics"""
    total_groups: int
    active_groups: int
    closed_groups: int
    paid_groups: int
    total_members: int
    average_members_per_group: float
    by_payment_type: dict[str, int]


class GroupPaymentRequest(BaseModel):
    """Schema for host paying for entire group"""
    payment_method: str = Field(..., description="Payment method: gcash, cash, card, etc.")
    amount: int = Field(..., ge=0, description="Total amount in cents")


class GroupPaymentResponse(BaseModel):
    """Schema for payment response"""
    status: str
    payment_id: str
    amount: int
    message: str


class MemberPaymentRequest(BaseModel):
    """Schema for individual member payment"""
    payment_method: str = Field(..., description="Payment method: gcash, cash, card, etc.")
    amount: int = Field(..., ge=0, description="Amount in cents")


class MemberPaymentResponse(BaseModel):
    """Schema for member payment response"""
    status: str
    payment_id: str
    order_number: str
    amount: int
    message: str
