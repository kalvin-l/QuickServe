"""
Recipe Service - Business logic for recipes/ingredients
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict
from datetime import datetime
from app.models.recipe_ingredient import RecipeIngredient
from app.models.menu_item import MenuItem
from app.models.inventory import Inventory
from app.models.stock_unit import StockUnit
from app.schemas.recipe_ingredient import RecipeIngredientCreate, RecipeIngredientResponse


class RecipeService:
    """Service for recipe and ingredient management"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_ingredients_for_menu_item(self, menu_item_id: int) -> List[RecipeIngredientResponse]:
        """Get all ingredients for a menu item with computed fields"""
        query = (
            select(RecipeIngredient)
            .options(selectinload(RecipeIngredient.inventory_item))
            .where(RecipeIngredient.menu_item_id == menu_item_id)
            .order_by(RecipeIngredient.priority.asc())
        )
        result = await self.db.execute(query)
        ingredients = result.scalars().all()

        # Build response with computed fields
        response = []
        for ing in ingredients:
            inv_item = ing.inventory_item

            # Get all size-specific quantities
            all_quantities = ing.get_all_quantities()

            # Check stock using medium quantity (most common)
            needed_in_stock_unit = self._convert_unit(all_quantities['medium'], ing.unit, inv_item.stock_unit)

            response.append(RecipeIngredientResponse(
                id=ing.id,
                menu_item_id=ing.menu_item_id,
                inventory_item_id=ing.inventory_item_id,
                quantity=ing.quantity,
                unit=ing.unit,
                priority=ing.priority,
                multiplier_small=ing.multiplier_small,
                multiplier_medium=ing.multiplier_medium,
                multiplier_large=ing.multiplier_large,
                inventory_item_name=inv_item.name,
                inventory_item_unit=inv_item.stock_unit,
                current_stock=inv_item.stock_quantity,
                stock_unit=inv_item.stock_unit,
                stock_sufficient=inv_item.stock_quantity >= needed_in_stock_unit,
                quantity_small=all_quantities['small'],
                quantity_medium=all_quantities['medium'],
                quantity_large=all_quantities['large']
            ))

        return response

    async def add_ingredient(
        self,
        menu_item_id: int,
        ingredient: RecipeIngredientCreate
    ) -> RecipeIngredient:
        """Add ingredient to menu item recipe"""
        # Check if menu item exists
        menu_query = select(MenuItem).where(MenuItem.id == menu_item_id)
        menu_result = await self.db.execute(menu_query)
        menu_item = menu_result.scalar_one_or_none()
        if not menu_item:
            raise ValueError(f"Menu item {menu_item_id} not found")

        # Check if inventory item exists (now uses Inventory table directly)
        inv_query = select(Inventory).where(Inventory.id == ingredient.inventory_item_id)
        inv_result = await self.db.execute(inv_query)
        inv_item = inv_result.scalar_one_or_none()
        if not inv_item:
            raise ValueError(f"Inventory item {ingredient.inventory_item_id} not found")

        # Check for duplicate ingredient
        existing_query = select(RecipeIngredient).where(
            and_(
                RecipeIngredient.menu_item_id == menu_item_id,
                RecipeIngredient.inventory_item_id == ingredient.inventory_item_id
            )
        )
        existing_result = await self.db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise ValueError(f"This ingredient is already added to the recipe")

        # Create recipe ingredient
        db_ingredient = RecipeIngredient(
            menu_item_id=menu_item_id,
            inventory_item_id=ingredient.inventory_item_id,
            quantity=ingredient.quantity,
            unit=ingredient.unit,
            priority=ingredient.priority,
            multiplier_small=ingredient.multiplier_small if ingredient.multiplier_small is not None else 0.8,
            multiplier_medium=ingredient.multiplier_medium if ingredient.multiplier_medium is not None else 1.0,
            multiplier_large=ingredient.multiplier_large if ingredient.multiplier_large is not None else 1.2
        )
        self.db.add(db_ingredient)
        await self.db.commit()
        await self.db.refresh(db_ingredient)

        return db_ingredient

    async def update_ingredient(
        self,
        ingredient_id: int,
        quantity: Optional[float] = None,
        unit: Optional[str] = None,
        priority: Optional[int] = None
    ) -> Optional[RecipeIngredient]:
        """Update an existing ingredient"""
        query = select(RecipeIngredient).where(RecipeIngredient.id == ingredient_id)
        result = await self.db.execute(query)
        ingredient = result.scalar_one_or_none()

        if not ingredient:
            return None

        if quantity is not None:
            ingredient.quantity = quantity
        if unit is not None:
            ingredient.unit = unit
        if priority is not None:
            ingredient.priority = priority

        await self.db.commit()
        await self.db.refresh(ingredient)
        return ingredient

    async def remove_ingredient(self, ingredient_id: int) -> bool:
        """Remove ingredient from recipe"""
        query = select(RecipeIngredient).where(RecipeIngredient.id == ingredient_id)
        result = await self.db.execute(query)
        ingredient = result.scalar_one_or_none()
        if ingredient:
            await self.db.delete(ingredient)
            await self.db.commit()
            return True
        return False

    async def get_all_menu_items_with_recipes(self) -> Dict[int, List[Dict]]:
        """Get all menu items with their recipes for order processing

        Returns:
            Dict mapping menu_item_id to list of ingredient dicts
        """
        query = (
            select(MenuItem)
            .options(selectinload(MenuItem.recipe_ingredients).selectinload(RecipeIngredient.inventory_item))
            .where(MenuItem.available == True)
        )
        result = await self.db.execute(query)
        menu_items = result.scalars().all()

        # Build dictionary for quick lookup during orders
        recipes = {}
        for item in menu_items:
            recipes[item.id] = [
                {
                    'inventory_item_id': ing.inventory_item_id,
                    'inventory_item_name': ing.inventory_item.name,
                    'quantity': ing.quantity,
                    'unit': ing.unit,
                    'priority': ing.priority,
                    'multiplier_small': ing.multiplier_small,
                    'multiplier_medium': ing.multiplier_medium,
                    'multiplier_large': ing.multiplier_large
                }
                for ing in item.recipe_ingredients
            ]

        return recipes

    async def check_inventory_for_menu_item(
        self,
        menu_item_id: int,
        quantity: int = 1
    ) -> Dict[str, any]:
        """Check if there's sufficient inventory to make a menu item

        Args:
            menu_item_id: The menu item to check
            quantity: How many servings to check for

        Returns:
            Dict with 'can_make' (bool) and 'insufficient_items' (list)
        """
        ingredients = await self.get_ingredients_for_menu_item(menu_item_id)
        insufficient_items = []

        for ing in ingredients:
            if not ing.stock_sufficient:
                # Calculate how many can be made
                can_make = int(ing.current_stock // ing.quantity) if ing.quantity > 0 else 0
                insufficient_items.append({
                    'ingredient_name': ing.inventory_item_name,
                    'available': ing.current_stock,
                    'needed': ing.quantity * quantity,
                    'unit': ing.unit
                })

        return {
            'can_make': len(insufficient_items) == 0,
            'insufficient_items': insufficient_items
        }

    async def deduct_inventory_for_order(
        self,
        menu_item_id: int,
        quantity: int = 1
    ) -> Dict[str, any]:
        """Deduct inventory items based on menu item recipe

        Args:
            menu_item_id: The menu item being ordered
            quantity: How many servings

        Returns:
            Dict with success status and any items that couldn't be fulfilled
        """
        from app.services.inventory_service import InventoryService

        inventory_service = InventoryService(self.db)
        ingredients = await self.get_ingredients_for_menu_item(menu_item_id)
        insufficient_items = []

        for ing in ingredients:
            inv_item = ing.inventory_item
            needed_qty = ing.quantity * quantity

            # Convert recipe unit to stock unit
            needed_in_stock_unit = self._convert_unit(needed_qty, ing.unit, inv_item.stock_unit)

            # Check if sufficient stock
            if inv_item.stock_quantity < needed_in_stock_unit:
                insufficient_items.append({
                    'menu_item': inv_item.name,
                    'ingredient': ing.inventory_item_name,
                    'available': inv_item.stock_quantity,
                    'needed': needed_in_stock_unit,
                    'unit': inv_item.stock_unit
                })

                # Mark menu item as out of stock
                await self._mark_menu_item_out_of_stock(menu_item_id)
                continue

            # Deduct from inventory (use negative for deduction)
            # Use round() instead of int() to handle small quantities properly
            try:
                await inventory_service.adjust_stock(
                    item_id=inv_item.id,
                    quantity=-int(round(needed_in_stock_unit)),
                    reason="sale",
                    reference=f"Menu item #{menu_item_id}"
                )
            except ValueError as e:
                # Stock went negative during deduction
                insufficient_items.append({
                    'menu_item': inv_item.name,
                    'ingredient': ing.inventory_item_name,
                    'error': str(e)
                })
                await self._mark_menu_item_out_of_stock(menu_item_id)

        return {
            'success': len(insufficient_items) == 0,
            'insufficient_items': insufficient_items
        }

    async def deduct_inventory_for_order_with_size(
        self,
        menu_item_id: int,
        size: str = 'medium',
        quantity: int = 1
    ) -> Dict[str, any]:
        """Deduct inventory items based on menu item recipe and size

        Args:
            menu_item_id: The menu item being ordered
            size: Size of the item (small, medium, large)
            quantity: How many servings

        Returns:
            Dict with success status and any items that couldn't be fulfilled
        """
        from app.services.inventory_service import InventoryService

        inventory_service = InventoryService(self.db)

        # Get ingredients directly from database to access size-specific quantities
        query = (
            select(RecipeIngredient)
            .options(selectinload(RecipeIngredient.inventory_item))
            .where(RecipeIngredient.menu_item_id == menu_item_id)
            .order_by(RecipeIngredient.priority.asc())
        )
        result = await self.db.execute(query)
        ingredients = result.scalars().all()

        insufficient_items = []

        for ing in ingredients:
            inv_item = ing.inventory_item

            # Get quantity for this specific size using multipliers
            quantity_for_size = ing.get_quantity_for_size(size)
            needed_qty = quantity_for_size * quantity

            # Convert recipe unit to stock unit
            needed_in_stock_unit = self._convert_unit(needed_qty, ing.unit, inv_item.stock_unit)

            # Check if sufficient stock
            if inv_item.stock_quantity < needed_in_stock_unit:
                insufficient_items.append({
                    'menu_item': inv_item.name,
                    'ingredient': inv_item.name,
                    'available': inv_item.stock_quantity,
                    'needed': needed_in_stock_unit,
                    'unit': inv_item.stock_unit,
                    'size': size
                })

                # Mark menu item as out of stock
                await self._mark_menu_item_out_of_stock(menu_item_id)
                continue

            # Deduct from inventory (use negative for deduction)
            # Use round() instead of int() to handle small quantities properly
            try:
                await inventory_service.adjust_stock(
                    item_id=inv_item.id,
                    quantity=-int(round(needed_in_stock_unit)),
                    reason="sale",
                    reference=f"Menu item #{menu_item_id} ({size})"
                )
            except ValueError as e:
                # Stock went negative during deduction
                insufficient_items.append({
                    'menu_item': inv_item.name,
                    'ingredient': inv_item.name,
                    'error': str(e),
                    'size': size
                })
                await self._mark_menu_item_out_of_stock(menu_item_id)

        return {
            'success': len(insufficient_items) == 0,
            'insufficient_items': insufficient_items
        }

    async def _mark_menu_item_out_of_stock(self, menu_item_id: int):
        """Mark a menu item as unavailable due to insufficient stock"""
        query = select(MenuItem).where(MenuItem.id == menu_item_id)
        result = await self.db.execute(query)
        menu_item = result.scalar_one_or_none()
        if menu_item:
            menu_item.available = False
            await self.db.commit()

    def _convert_unit(self, quantity: float, from_unit: str, to_unit: str) -> float:
        """Convert quantity from one unit to another

        This is a simplified conversion. In production, you'd want a more
        sophisticated unit conversion system.

        Common conversions:
        - g <-> kg: multiply/divide by 1000
        - ml <-> l: multiply/divide by 1000
        """
        # Same unit, no conversion needed
        if from_unit == to_unit:
            return quantity

        # Weight conversions
        weight_units = {
            'g': 1,
            'kg': 1000,
            'oz': 28.35,
            'lb': 453.59
        }

        # Volume conversions
        volume_units = {
            'ml': 1,
            'l': 1000,
            'oz_fl': 29.57,
            'gal': 3785.41
        }

        # Count units don't convert
        count_units = ['pcs', 'pack', 'box', 'dozen']

        # Check if both units are weight
        if from_unit in weight_units and to_unit in weight_units:
            from_base = quantity * weight_units[from_unit]
            return from_base / weight_units[to_unit]

        # Check if both units are volume
        if from_unit in volume_units and to_unit in volume_units:
            from_base = quantity * volume_units[from_unit]
            return from_base / volume_units[to_unit]

        # If units are incompatible or count units, return as-is
        # (in production, you'd want to raise an error here)
        return quantity
