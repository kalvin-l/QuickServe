"""
Inventory Model
Represents inventory items (ingredients, supplies, etc.) for stock tracking
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.stock_unit import StockUnit


class Inventory(Base):
    """Inventory item model for stock management"""

    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Stock management fields
    stock_quantity = Column(Integer, nullable=False, default=0)  # Current stock level
    stock_unit = Column(String(20), nullable=False, default="pcs")  # Unit: pcs, l, kg, ml, g, etc.
    low_stock_threshold = Column(Integer, nullable=False, default=10)  # Alert threshold
    reorder_level = Column(Integer, nullable=False, default=5)  # When to reorder
    reorder_quantity = Column(Integer, nullable=False, default=50)  # Suggested restock amount
    last_restocked_at = Column(DateTime(timezone=True), nullable=True)  # Track restock date

    # Container tracking (optional)
    container_type = Column(String(50), nullable=True)  # e.g., "Box", "Bottle", "Sack"
    container_capacity = Column(Integer, nullable=True)  # e.g., 3000, 1, 50 (in stock_unit)
    container_count = Column(Integer, nullable=True)  # Cached container count (computed)

    # Metadata
    created_by = Column(Integer, nullable=True)  # Optional user tracking (no FK constraint)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    category = relationship("Category", back_populates="inventory_items")
    recipe_ingredients = relationship("RecipeIngredient", back_populates="inventory_item",
                                      foreign_keys="RecipeIngredient.inventory_item_id")

    def __repr__(self):
        return f"<Inventory(id={self.id}, name='{self.name}', stock={self.stock_quantity}{self.stock_unit})>"

    @property
    def stock_status(self) -> str:
        """Determine stock status: in_stock, low_stock, or out_of_stock"""
        if self.stock_quantity <= 0:
            return "out_of_stock"
        elif self.stock_quantity <= self.low_stock_threshold:
            return "low_stock"
        return "in_stock"

    @property
    def needs_reorder(self) -> bool:
        """Check if item needs to be reordered"""
        return self.stock_quantity <= self.reorder_level

    @property
    def stock_level_percentage(self) -> int:
        """Calculate stock level as percentage (for progress bars)

        Uses low_stock_threshold as reference (100% = well stocked, 0% = out of stock)
        """
        if self.low_stock_threshold <= 0:
            return 100 if self.stock_quantity > 0 else 0
        percentage = int((self.stock_quantity / self.low_stock_threshold) * 100)
        return min(max(percentage, 0), 200)  # Cap at 200%

    def get_unit_display_name(self) -> str:
        """Get human-readable name for the stock unit"""
        return StockUnit.get_display_name(self.stock_unit)

    def get_unit_type(self) -> str:
        """Get unit category: count, volume, or weight"""
        return StockUnit.get_unit_type(self.stock_unit)

    @property
    def container_count_display(self) -> float | None:
        """Calculate container count from quantity and capacity.

        Returns the number of containers based on current stock quantity
        and container capacity. Returns None if container tracking is not enabled.
        """
        if self.container_capacity and self.container_capacity > 0:
            return round(self.stock_quantity / self.container_capacity, 2)
        return None
