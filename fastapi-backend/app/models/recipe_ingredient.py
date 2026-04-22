"""
Recipe/Ingredient Model
Links menu items to inventory items with quantities
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class RecipeIngredient(Base):
    """Ingredient for recipes - links menu items to inventory items"""
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    inventory_item_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)

    # Base quantity (for Regular/Medium serving)
    quantity = Column(Float, nullable=False, default=1.0)  # e.g., 200 (for Medium)

    # Unit of measurement for this ingredient
    # This can be different from the inventory item's stock unit
    # e.g., inventory stored in kg, but recipe uses grams
    unit = Column(String(20), nullable=False, default="g")  # g, ml, l, kg, pcs

    # Priority order (for multi-stage preparation)
    priority = Column(Integer, nullable=False, default=0)

    # Size multipliers (applied to base quantity)
    # Small: 0.8x, Medium: 1.0x, Large: 1.2x
    multiplier_small = Column(Float, nullable=False, default=0.8)  # e.g., 160ml = 200 * 0.8
    multiplier_medium = Column(Float, nullable=False, default=1.0)  # e.g., 200ml = 200 * 1.0
    multiplier_large = Column(Float, nullable=False, default=1.2)  # e.g., 240ml = 200 * 1.2

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    menu_item = relationship("MenuItem", foreign_keys=[menu_item_id], back_populates="recipe_ingredients")
    inventory_item = relationship("Inventory", foreign_keys=[inventory_item_id])

    def get_quantity_for_size(self, size: str) -> float:
        """Get the quantity for a specific size using multipliers

        Args:
            size: Size key ('small', 'medium', 'large', or default)

        Returns:
            Quantity to use for that size (base quantity * multiplier)
        """
        size_lower = size.lower() if size else ""

        # Get the appropriate multiplier
        if size_lower == 'small':
            multiplier = self.multiplier_small
        elif size_lower == 'large':
            multiplier = self.multiplier_large
        else:  # medium or default
            multiplier = self.multiplier_medium

        # Calculate quantity: base * multiplier
        return self.quantity * multiplier

    def get_all_quantities(self) -> dict:
        """Get all size-specific quantities for display

        Returns:
            Dict with 'small', 'medium', 'large' quantities
        """
        return {
            'small': self.quantity * self.multiplier_small,
            'medium': self.quantity * self.multiplier_medium,
            'large': self.quantity * self.multiplier_large
        }

    def __repr__(self):
        return f"<RecipeIngredient(id={self.id}, menu_item_id={self.menu_item_id}, inventory_item_id={self.inventory_item_id}, quantity={self.quantity}{self.unit})>"
