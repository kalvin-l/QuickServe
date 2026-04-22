"""
Addon Model
Represents add-ons for menu items (Extra shot, Syrup, Milk, etc.)
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Addon(Base):
    """Menu add-on model"""

    __tablename__ = "addons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    price = Column(Integer, nullable=False, default=0)  # Price in cents
    category = Column(String(50), default="Extras")  # Extras, Milk, Toppings, Syrups
    available = Column(Boolean, default=True)
    max_quantity = Column(Integer, default=1)  # Max per order
    created_by = Column(Integer, nullable=True)  # Optional user tracking (no FK constraint)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Addon(id={self.id}, name='{self.name}', price={self.price})>"
