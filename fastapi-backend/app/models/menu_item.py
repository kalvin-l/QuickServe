"""
Menu Item Model
Represents cafe menu items (Coffee, Tea, Pastries, etc.)
"""

from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class Temperature(str, enum.Enum):
    """Menu item temperature options"""
    HOT = "Hot"
    COLD = "Cold"
    BOTH = "Both"


class ItemStatus(str, enum.Enum):
    """Menu item status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class MenuItem(Base):
    """Menu item model"""

    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    price = Column(Integer, nullable=False)  # Price in cents (e.g., 500 = $5.00)
    temperature = Column(SQLEnum(Temperature), nullable=True)
    prep_time = Column(String(255), nullable=True)  # e.g., "10 mins"
    size_labels = Column(JSON, nullable=True)  # {"small": "8oz", "medium": "12oz", "large": "16oz"}
    featured = Column(Boolean, default=False)
    popular = Column(Boolean, default=False)
    available = Column(Boolean, default=True)
    image_path = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)  # Internal notes
    status = Column(SQLEnum(ItemStatus), default=ItemStatus.PUBLISHED)

    created_by = Column(Integer, nullable=True)  # Optional user tracking (no FK constraint)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    category = relationship("Category", back_populates="menu_items")
    addons = relationship("Addon", secondary="menu_item_addons", backref="menu_items")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="menu_item", cascade="all, delete-orphan",
                                     foreign_keys="RecipeIngredient.menu_item_id",
                                     order_by="RecipeIngredient.priority")

    def __repr__(self):
        return f"<MenuItem(id={self.id}, name='{self.name}', price={self.price})>"

    @property
    def price_in_pesos(self):
        """Convert price from cents to pesos"""
        return self.price / 100
