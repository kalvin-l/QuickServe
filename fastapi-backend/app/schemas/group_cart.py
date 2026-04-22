"""
Pydantic schemas for Group Cart system.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List


class GroupCartAddonCreate(BaseModel):
    """Addon for a group cart item"""
    id: int = Field(..., description="Addon ID")
    name: str = Field(..., description="Addon name")
    price: int = Field(..., ge=0, description="Addon price in cents")
    quantity: int = Field(1, ge=1, le=10, description="Addon quantity")


class GroupCartItemCreate(BaseModel):
    """Schema for adding item to group cart"""
    session_id: str = Field(..., description="Session ID for permission verification")
    menu_item_id: int = Field(..., description="Menu item ID")
    participant_id: Optional[int] = Field(None, description="Who is adding this item")
    participant_name: Optional[str] = Field(None, max_length=100, description="Participant name")
    quantity: int = Field(1, ge=1, le=50, description="Item quantity")
    size_key: Optional[str] = Field(None, description="Size key")
    size_label: Optional[str] = Field(None, description="Size label")
    size_price: int = Field(0, ge=0, description="Size price in cents")
    temperature: Optional[str] = Field(None, description="Temperature preference")
    addons: Optional[List[GroupCartAddonCreate]] = Field(default=[], description="Selected addons")
    special_instructions: Optional[str] = Field(None, max_length=500, description="Special instructions")

    @field_validator('addons', mode='before')
    @classmethod
    def ensure_addons_list(cls, v):
        if v is None:
            return []
        return v


class GroupCartItemUpdate(BaseModel):
    """Schema for updating group cart item"""
    session_id: str = Field(..., description="Session ID for permission verification")
    participant_id: Optional[int] = Field(None, description="Participant ID for permission verification (preferred over session_id)")
    quantity: Optional[int] = Field(None, ge=1, le=50, description="New quantity")
    size_key: Optional[str] = Field(None, description="Size key")
    size_label: Optional[str] = Field(None, description="Size label")
    size_price: Optional[int] = Field(None, ge=0, description="Size price")
    temperature: Optional[str] = Field(None, description="Temperature")
    addons: Optional[List[GroupCartAddonCreate]] = Field(None, description="Updated addons")
    special_instructions: Optional[str] = Field(None, max_length=500, description="Special instructions")


class GroupCartItemResponse(BaseModel):
    """Schema for group cart item response"""
    id: int
    group_session_id: int
    participant_id: Optional[int]
    participant_name: Optional[str]
    menu_item_id: int
    item_name: str
    item_image: Optional[str]
    base_price: int
    base_price_in_pesos: float
    quantity: int
    size_key: Optional[str]
    size_label: Optional[str]
    size_price: int
    size_price_in_pesos: float
    temperature: Optional[str]
    addons: Optional[List[dict]]
    item_total: int
    item_total_in_pesos: float
    special_instructions: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


class GroupCartResponse(BaseModel):
    """Full group cart with all items"""
    group_session_id: int
    items: List[GroupCartItemResponse]
    subtotal: int
    subtotal_in_pesos: float
    tax: int
    tax_in_pesos: float
    total: int
    total_in_pesos: float
    item_count: int
    participant_count: int


class GroupCheckoutRequest(BaseModel):
    """Schema for group checkout (host pays)"""
    session_id: str = Field(..., description="Session ID for permission verification")
    participant_id: Optional[int] = Field(None, description="Participant ID for permission verification (preferred over session_id)")
    customer_name: Optional[str] = Field(None, max_length=100, description="Customer name")
    payment_method: str = Field(..., description="Payment method")
    notes: Optional[str] = Field(None, max_length=500, description="Order notes")
