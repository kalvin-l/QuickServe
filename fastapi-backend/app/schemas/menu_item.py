"""
Menu Item Schemas
Pydantic schemas for menu item validation
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Dict, List
from datetime import datetime
from app.models.menu_item import Temperature, ItemStatus
import re


class MenuItemBase(BaseModel):
    """Base menu item schema"""
    name: str = Field(..., min_length=2, max_length=255, description="Item name")
    description: str = Field(..., min_length=10, max_length=1000, description="Item description")
    category_id: Optional[int] = Field(None, description="Category ID")
    price: int = Field(..., ge=0, le=9999999, description="Price in cents (e.g., 500 = ₱5.00)")
    temperature: Optional[Temperature] = Field(None, description="Temperature (Hot, Cold, Both)")
    prep_time: Optional[str] = Field(None, max_length=50, description="Preparation time (e.g., '10 mins')")
    size_labels: Optional[dict] = Field(None, description="Size labels (e.g., {'preset': '3', 'labels': ['Small', 'Medium', 'Large']})")
    featured: bool = Field(default=False, description="Is this a featured item")
    popular: bool = Field(default=False, description="Is this a popular item")
    available: bool = Field(default=True, description="Is item available for ordering")
    notes: Optional[str] = Field(None, max_length=1000, description="Internal notes")
    status: ItemStatus = Field(default=ItemStatus.PUBLISHED, description="Item status")

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty_or_whitespace(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip()

    @field_validator('description')
    @classmethod
    def description_must_not_be_empty_or_whitespace(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Description cannot be empty or whitespace')
        return v.strip()

    @field_validator('prep_time')
    @classmethod
    def prep_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            # Allow formats like "5-10 mins", "3-5 minutes", "10 mins", etc.
            pattern = r'^\d+(\s*-\s*\d+)?(\s*(mins?|minutes?|hrs?|hours?))?$'
            if not re.match(pattern, v.strip()):
                raise ValueError('Invalid preparation time format. Use: "5-10 mins" or "3-5 minutes"')
        return v.strip() if v else None

    @field_validator('size_labels')
    @classmethod
    def size_labels_must_be_valid(cls, v: Optional[dict]) -> Optional[dict]:
        if v:
            if not isinstance(v, dict):
                raise ValueError('Size labels must be a dictionary')
            if 'labels' in v:
                labels = v['labels']
                if not isinstance(labels, list):
                    raise ValueError('Size labels must be a list')
                if len(labels) < 1 or len(labels) > 5:
                    raise ValueError('Size labels must contain between 1 and 5 items')
                for label in labels:
                    if not isinstance(label, str) or not label.strip():
                        raise ValueError('Each size label must be a non-empty string')
        return v

    @model_validator(mode='after')
    def validate_price_and_category(self) -> 'MenuItemBase':
        # If price is 0, item must have a category (free items need categorization)
        if self.price == 0 and not self.category_id:
            raise ValueError('Free items (price = 0) must have a category assigned')
        return self


class MenuItemCreate(MenuItemBase):
    """Schema for creating a menu item"""
    addon_ids: Optional[list[int]] = Field(default=[], description="List of addon IDs to attach")


class MenuItemUpdate(BaseModel):
    """Schema for updating a menu item"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, min_length=10, max_length=1000)
    category_id: Optional[int] = None
    price: Optional[int] = Field(None, ge=0, le=9999999)
    temperature: Optional[Temperature] = None
    prep_time: Optional[str] = Field(None, max_length=50)
    size_labels: Optional[dict] = None
    featured: Optional[bool] = None
    popular: Optional[bool] = None
    available: Optional[bool] = None
    image_path: Optional[str] = Field(None, description="Path to uploaded image")
    notes: Optional[str] = Field(None, max_length=1000)
    status: Optional[ItemStatus] = None
    addon_ids: Optional[list[int]] = None

    @field_validator('name')
    @classmethod
    def name_must_not_be_empty_or_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError('Name cannot be empty or whitespace')
            return v.strip()
        return v

    @field_validator('description')
    @classmethod
    def description_must_not_be_empty_or_whitespace(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError('Description cannot be empty or whitespace')
            return v.strip()
        return v

    @field_validator('prep_time')
    @classmethod
    def prep_time_format(cls, v: Optional[str]) -> Optional[str]:
        if v and v.strip():
            pattern = r'^\d+(\s*-\s*\d+)?(\s*(mins?|minutes?|hrs?|hours?))?$'
            if not re.match(pattern, v.strip()):
                raise ValueError('Invalid preparation time format. Use: "5-10 mins" or "3-5 minutes"')
        return v.strip() if v else None

    @field_validator('size_labels')
    @classmethod
    def size_labels_must_be_valid(cls, v: Optional[dict]) -> Optional[dict]:
        if v:
            if not isinstance(v, dict):
                raise ValueError('Size labels must be a dictionary')
            if 'labels' in v:
                labels = v['labels']
                if not isinstance(labels, list):
                    raise ValueError('Size labels must be a list')
                if len(labels) < 1 or len(labels) > 5:
                    raise ValueError('Size labels must contain between 1 and 5 items')
                for label in labels:
                    if not isinstance(label, str) or not label.strip():
                        raise ValueError('Each size label must be a non-empty string')
        return v


class MenuItemResponse(MenuItemBase):
    """Schema for menu item response"""
    id: int
    image_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_restocked_at: Optional[datetime] = None
    category: Optional[dict] = None
    addons: list[dict] = []

    # Computed fields
    price_in_pesos: float = 0

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_relations(cls, obj, category=None, addons=None):
        """Create response with relations"""
        data = cls.from_orm(obj)
        data.price_in_pesos = obj.price / 100

        # Add category info
        if category:
            data.category = {
                "id": category.id,
                "name": category.name
            }

        # Add addons info
        if addons:
            data.addons = [
                {
                    "id": addon.id,
                    "name": addon.name,
                    "price": addon.price,
                    "price_in_pesos": addon.price / 100,
                    "category": addon.category
                }
                for addon in addons
            ]

        return data


class MenuItemListResponse(BaseModel):
    """Schema for list of menu items"""
    items: list[MenuItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class MenuItemSearchParams(BaseModel):
    """Schema for menu item search parameters"""
    search: Optional[str] = Field(None, description="Search in name and description")
    category_id: Optional[int] = Field(None, description="Filter by category")
    available_only: bool = Field(False, description="Show only available items")
    featured_only: bool = Field(False, description="Show only featured items")
    status: Optional[ItemStatus] = Field(None, description="Filter by status")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(12, ge=1, le=100, description="Items per page")
