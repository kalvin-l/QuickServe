"""
Pydantic schemas for Order system.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

from app.models.order import OrderStatus, OrderType
from app.models.payment import PaymentMethod


# ============== Addon Schemas ==============

class OrderAddonCreate(BaseModel):
    """Addon for an order item"""
    id: int = Field(..., description="Addon ID")
    name: str = Field(..., description="Addon name")
    price: int = Field(..., ge=0, description="Addon price in cents")
    quantity: int = Field(1, ge=1, le=10, description="Addon quantity")


# ============== Order Item Schemas ==============

class OrderItemCreate(BaseModel):
    """Schema for creating an order item"""
    menu_item_id: int = Field(..., description="Menu item ID")
    quantity: int = Field(..., ge=1, le=50, description="Item quantity")
    size_key: Optional[str] = Field(None, description="Size key (e.g., 'small', 'medium')")
    size_label: Optional[str] = Field(None, description="Size label (e.g., '8oz', '12oz')")
    size_price: int = Field(0, ge=0, description="Additional price for size in cents")
    temperature: Optional[str] = Field(None, description="Temperature preference")
    addons: Optional[List[OrderAddonCreate]] = Field(default=[], description="Selected addons")
    special_instructions: Optional[str] = Field(None, max_length=500, description="Special instructions")

    @field_validator('addons', mode='before')
    @classmethod
    def ensure_addons_list(cls, v):
        if v is None:
            return []
        return v


class OrderItemResponse(BaseModel):
    """Schema for order item response"""
    id: int
    order_id: int
    menu_item_id: int
    added_by_participant_id: Optional[int]
    added_by_name: Optional[str]
    item_name: str
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

    class Config:
        from_attributes = True


# ============== Order Schemas ==============

class OrderCreate(BaseModel):
    """Schema for creating an order"""
    table_id: Optional[int] = Field(None, description="Table ID")
    table_session_id: Optional[int] = Field(None, description="Table session ID")
    order_type: OrderType = Field(OrderType.INDIVIDUAL, description="Order type")
    group_session_id: Optional[int] = Field(None, description="Group session ID (for group orders)")
    participant_id: Optional[int] = Field(None, description="Participant ID")
    customer_name: Optional[str] = Field(None, max_length=100, description="Customer name")
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Order items")
    notes: Optional[str] = Field(None, max_length=500, description="Order notes")
    payment_method: PaymentMethod = Field(..., description="Payment method")

    @field_validator('items')
    @classmethod
    def validate_items(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Order must contain at least one item")
        return v


class OrderResponse(BaseModel):
    """Schema for order response"""
    id: int
    order_number: str
    table_id: Optional[int]
    table_number: Optional[int]
    table_session_id: Optional[int]
    order_type: str
    group_session_id: Optional[int]
    participant_id: Optional[int]
    customer_name: Optional[str]
    status: str
    subtotal: int
    tax: int
    total: int
    subtotal_in_pesos: float
    total_in_pesos: float
    notes: Optional[str]
    items: Optional[List[OrderItemResponse]]
    payment: Optional[dict]
    created_at: Optional[str]
    updated_at: Optional[str]
    confirmed_at: Optional[str]
    ready_at: Optional[str]
    served_at: Optional[str]
    cancelled_at: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    """Schema for updating order status"""
    status: OrderStatus = Field(..., description="New order status")


class OrderListResponse(BaseModel):
    """Schema for paginated order list"""
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
    pages: int


class OrderSummary(BaseModel):
    """Brief order summary for lists"""
    id: int
    order_number: str
    table_number: Optional[int]
    order_type: str
    customer_name: Optional[str]
    status: str
    total: int
    total_in_pesos: float
    item_count: int
    created_at: Optional[str]


# ============== Calculate Total Schemas ==============

class CalculateTotalRequest(BaseModel):
    """Request to calculate order total before submission"""
    items: List[OrderItemCreate] = Field(..., min_length=1)


class CalculateTotalResponse(BaseModel):
    """Response with calculated totals"""
    subtotal: int
    tax: int
    total: int
    subtotal_in_pesos: float
    tax_in_pesos: float
    total_in_pesos: float
    item_count: int
