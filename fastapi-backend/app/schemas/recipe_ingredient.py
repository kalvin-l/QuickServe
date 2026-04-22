"""
Recipe/Ingredient Schemas
Pydantic schemas for recipe ingredient validation
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


class RecipeIngredientBase(BaseModel):
    """Base recipe ingredient schema"""
    inventory_item_id: int = Field(..., gt=0, description="Inventory item ID")
    quantity: float = Field(..., gt=0, description="Base quantity (for Regular/Medium serving)")
    unit: str = Field(..., min_length=1, max_length=20, description="Unit for this ingredient (g, ml, l, kg, pcs)")
    priority: int = Field(default=0, ge=0, description="Preparation order (lower = earlier)")

    # Size multipliers (applied to base quantity)
    multiplier_small: Optional[float] = Field(0.8, ge=0, description="Multiplier for Small size (e.g., 0.8 = 80%)")
    multiplier_medium: Optional[float] = Field(1.0, ge=0, description="Multiplier for Medium size (default 1.0 = 100%)")
    multiplier_large: Optional[float] = Field(1.2, ge=0, description="Multiplier for Large size (e.g., 1.2 = 120%)")


class RecipeIngredientCreate(RecipeIngredientBase):
    """Schema for creating recipe ingredient"""
    pass


class RecipeIngredientUpdate(BaseModel):
    """Schema for updating recipe ingredient"""
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    priority: Optional[int] = Field(None, ge=0)
    multiplier_small: Optional[float] = Field(None, ge=0)
    multiplier_medium: Optional[float] = Field(None, ge=0)
    multiplier_large: Optional[float] = Field(None, ge=0)


class RecipeIngredientResponse(RecipeIngredientBase):
    """Recipe ingredient response with computed fields"""
    id: int
    menu_item_id: int
    inventory_item_id: int

    # Computed fields
    inventory_item_name: str
    inventory_item_unit: str
    current_stock: float
    stock_unit: str
    stock_sufficient: bool

    # Include size multipliers and calculated quantities
    multiplier_small: Optional[float] = None
    multiplier_medium: Optional[float] = None
    multiplier_large: Optional[float] = None

    # Calculated quantities for display
    quantity_small: Optional[float] = None
    quantity_medium: Optional[float] = None
    quantity_large: Optional[float] = None

    class Config:
        from_attributes = True


class RecipeIngredientList(BaseModel):
    """List of recipe ingredients for a menu item"""
    menu_item_id: int
    menu_item_name: str
    ingredients: list[RecipeIngredientResponse]


class MenuItemRecipeSummary(BaseModel):
    """Summary of menu item recipe for order processing"""
    menu_item_id: int
    menu_item_name: str
    ingredients: list[dict]  # Simplified format for internal use


class AllRecipesResponse(BaseModel):
    """Response containing all recipes for order processing"""
    recipes: dict[int, list[dict]]  # menu_item_id -> list of ingredient dicts
