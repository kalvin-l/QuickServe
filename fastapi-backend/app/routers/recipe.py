"""
Recipe Router - API endpoints for recipe/ingredient management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.services.recipe_service import RecipeService
from app.schemas.recipe_ingredient import (
    RecipeIngredientCreate,
    RecipeIngredientResponse,
    RecipeIngredientList,
    AllRecipesResponse
)


router = APIRouter(prefix="/api/recipes", tags=["Recipes"])


@router.get("/menu-items/{menu_item_id}/ingredients", response_model=List[RecipeIngredientResponse])
async def get_menu_item_ingredients(
    menu_item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all ingredients for a menu item

    - **menu_item_id**: The menu item ID
    - Returns: List of ingredients with computed stock status
    """
    service = RecipeService(db)
    try:
        ingredients = await service.get_ingredients_for_menu_item(menu_item_id)
        return ingredients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/menu-items/{menu_item_id}/ingredients", response_model=RecipeIngredientResponse, status_code=201)
async def add_ingredient_to_menu_item(
    menu_item_id: int,
    ingredient: RecipeIngredientCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Add ingredient to menu item recipe

    - **menu_item_id**: The menu item to add ingredient to
    - **ingredient**: The ingredient data (inventory_item_id, quantity, unit, priority)
    - Returns: Created ingredient
    """
    service = RecipeService(db)
    try:
        result = await service.add_ingredient(menu_item_id, ingredient)
        # Return full response with computed fields
        ingredients = await service.get_ingredients_for_menu_item(menu_item_id)
        for ing in ingredients:
            if ing.id == result.id:
                return ing
        return ingredients[-1]  # Fallback to last added
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/ingredients/{ingredient_id}", response_model=dict)
async def update_recipe_ingredient(
    ingredient_id: int,
    quantity: Optional[float] = Query(None, gt=0),
    unit: Optional[str] = Query(None, min_length=1),
    priority: Optional[int] = Query(None, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a recipe ingredient

    - **ingredient_id**: The ingredient ID to update
    - **quantity**: New quantity (optional)
    - **unit**: New unit (optional)
    - **priority**: New priority (optional)
    - Returns: Updated ingredient
    """
    service = RecipeService(db)
    result = await service.update_ingredient(ingredient_id, quantity, unit, priority)
    if not result:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return {"success": True, "id": result.id}


@router.delete("/ingredients/{ingredient_id}", status_code=204)
async def remove_recipe_ingredient(
    ingredient_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Remove ingredient from recipe

    - **ingredient_id**: The ingredient ID to remove
    - Returns: No content on success
    """
    service = RecipeService(db)
    success = await service.remove_ingredient(ingredient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return None


@router.get("/all-recipes", response_model=AllRecipesResponse)
async def get_all_recipes(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all menu items with recipes for order processing

    Returns a dictionary mapping menu_item_id to list of ingredients.
    Used internally by the order system to auto-deduct inventory.
    """
    service = RecipeService(db)
    recipes = await service.get_all_menu_items_with_recipes()
    return {"recipes": recipes}


@router.get("/menu-items/{menu_item_id}/check-inventory")
async def check_inventory_availability(
    menu_item_id: int,
    quantity: int = Query(1, ge=1, description="Number of servings to check"),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if there's sufficient inventory to make a menu item

    - **menu_item_id**: The menu item to check
    - **quantity**: How many servings to check for (default: 1)
    - Returns: Inventory availability status
    """
    service = RecipeService(db)
    result = await service.check_inventory_for_menu_item(menu_item_id, quantity)
    return result


@router.post("/menu-items/{menu_item_id}/deduct-inventory")
async def deduct_inventory_for_menu_item(
    menu_item_id: int,
    quantity: int = Query(1, ge=1, description="Number of servings"),
    db: AsyncSession = Depends(get_db)
):
    """
    Deduct inventory based on menu item recipe

    This is typically called automatically when an order is placed.
    - **menu_item_id**: The menu item being made
    - **quantity**: How many servings (default: 1)
    - Returns: Deduction result with any insufficient items
    """
    service = RecipeService(db)
    result = await service.deduct_inventory_for_order(menu_item_id, quantity)
    return result
