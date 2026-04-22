"""
Category Model
Represents menu item categories (Coffee, Tea, Pastries, etc.)
"""

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Category(Base):
    """Menu category model"""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    scope = Column(String(255), default="menu")  # 'menu', 'inventory', or 'both'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    menu_items = relationship("MenuItem", back_populates="category")
    inventory_items = relationship("Inventory", back_populates="category")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"
