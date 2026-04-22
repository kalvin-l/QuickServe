"""
Category Schemas
Pydantic schemas for category validation
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    """Base category schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Category name")
    scope: str = Field(default="menu", description="Category scope (menu, inventory, both)")


class CategoryCreate(CategoryBase):
    """Schema for creating a category"""
    pass


class CategoryUpdate(BaseModel):
    """Schema for updating a category"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    scope: Optional[str] = None


class CategoryResponse(CategoryBase):
    """Schema for category response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Enable ORM mode


class CategoryListResponse(BaseModel):
    """Schema for list of categories"""
    categories: list[CategoryResponse]
    total: int
