"""
Category Router
API endpoints for category CRUD operations
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.services.category_service import CategoryService
from app.schemas.category import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
    CategoryListResponse,
)


router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=CategoryListResponse)
async def get_categories(
    scope: Optional[str] = Query(None, description="Filter by scope (menu, inventory, both)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all categories

    - **scope**: Optional filter by scope
    """
    service = CategoryService(db)
    categories = await service.get_all(scope=scope)

    return CategoryListResponse(
        categories=categories,
        total=len(categories)
    )


@router.get("/list", response_model=list)
async def get_categories_for_select(
    scope: Optional[str] = Query("menu", description="Filter by scope"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get categories formatted for select dropdown

    Returns categories with value and label properties
    """
    service = CategoryService(db)
    categories = await service.get_all(scope=scope)

    return [
        {
            "value": str(cat.id),
            "label": cat.name
        }
        for cat in categories
    ]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single category by ID

    - **category_id**: Category ID
    """
    service = CategoryService(db)
    category = await service.get_by_id(category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return category


@router.post("", response_model=CategoryResponse, status_code=201)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new category

    Request body:
    - **name**: Category name (required)
    - **scope**: Category scope (default: "menu")
    """
    service = CategoryService(db)

    # Check if category with same name exists
    existing = await service.get_all()
    if any(cat.name.lower() == category_data.name.lower() for cat in existing):
        raise HTTPException(
            status_code=400,
            detail=f"Category '{category_data.name}' already exists"
        )

    category = await service.create(category_data)
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a category

    - **category_id**: Category ID

    All fields are optional. Only provided fields will be updated.
    """
    service = CategoryService(db)
    category = await service.update(category_id, category_data)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    return category


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a category

    - **category_id**: Category ID
    """
    service = CategoryService(db)
    success = await service.delete(category_id)

    if not success:
        raise HTTPException(status_code=404, detail="Category not found")

    return None
