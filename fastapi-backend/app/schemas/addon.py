"""
Addon Schemas
Pydantic schemas for addon validation
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AddonBase(BaseModel):
    """Base addon schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Addon name")
    description: Optional[str] = Field(None, max_length=500, description="Addon description")
    price: int = Field(..., ge=0, description="Price in cents (e.g., 100 = ₱1.00)")
    category: str = Field(default="Extras", description="Addon category (Extras, Milk, Toppings, Syrups)")
    available: bool = Field(default=True, description="Is addon available")
    max_quantity: int = Field(default=1, ge=1, le=10, description="Max quantity per order")


class AddonCreate(AddonBase):
    """Schema for creating an addon"""
    pass


class AddonUpdate(BaseModel):
    """Schema for updating an addon"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None
    available: Optional[bool] = None
    max_quantity: Optional[int] = Field(None, ge=1, le=10)


class AddonResponse(AddonBase):
    """Schema for addon response"""
    id: int
    created_at: datetime
    updated_at: datetime

    # Optional: Computed field for display
    price_in_pesos: float = 0

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_price(cls, obj):
        """Create response with price in pesos"""
        data = cls.from_orm(obj)
        data.price_in_pesos = obj.price / 100
        return data


class AddonListResponse(BaseModel):
    """Schema for list of addons"""
    addons: list[AddonResponse]
    total: int
