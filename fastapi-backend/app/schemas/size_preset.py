"""
Size Preset Schemas

Request and response models for size preset API endpoints
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class SizePresetBase(BaseModel):
    """Base size preset schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Name of the size preset")
    description: Optional[str] = Field(None, max_length=255, description="Optional description")
    preset_id: str = Field(..., min_length=1, max_length=10, description="Unique preset identifier")
    labels: List[str] = Field(..., min_length=1, description="List of size labels")
    is_default: bool = Field(False, description="Mark as default preset")
    is_active: bool = Field(True, description="Enable/disable preset")
    sort_order: int = Field(0, description="Display order")


class SizePresetCreate(SizePresetBase):
    """Schema for creating a new size preset"""
    pass


class SizePresetUpdate(BaseModel):
    """Schema for updating an existing size preset"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    preset_id: Optional[str] = Field(None, min_length=1, max_length=10)
    labels: Optional[List[str]] = Field(None, min_length=1)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class SizePresetResponse(SizePresetBase):
    """Schema for size preset response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SizePresetListResponse(BaseModel):
    """Schema for list of size presets"""
    presets: List[SizePresetResponse]
    total: int


class SizePresetSelectOption(BaseModel):
    """Schema for size preset as select option (for dropdowns)"""
    value: str
    label: str
    labels: List[str]
