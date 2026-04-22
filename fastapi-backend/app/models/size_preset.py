"""
Size Preset Model

Defines predefined size configurations for menu items.
Allows administrators to create custom size presets with labels.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SizePreset(Base):
    """Size Preset model for storing predefined size configurations"""
    __tablename__ = "size_presets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "Coffee Sizes", "Pastry Sizes"
    description = Column(String(255), nullable=True)  # Optional description
    preset_id = Column(String(10), nullable=False, unique=True)  # e.g., "1", "2", "3"
    labels = Column(JSON, nullable=False)  # JSON array: ["Small", "Medium", "Large"]
    is_default = Column(Boolean, default=False)  # Mark as default preset
    is_active = Column(Boolean, default=True)  # Enable/disable preset
    sort_order = Column(Integer, default=0)  # For display order
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<SizePreset(id={self.id}, name='{self.name}', preset_id='{self.preset_id}')>"
