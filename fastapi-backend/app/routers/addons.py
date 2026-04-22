"""
Addons API Routes

Endpoints for managing addons
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.addon import (
    AddonCreate,
    AddonUpdate,
    AddonResponse,
    AddonListResponse,
    AddonBase
)
from app.services.addon_service import AddonService

router = APIRouter(prefix="/api/addons", tags=["addons"])


@router.get("/", response_model=AddonListResponse)
async def get_addons(
    available_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all addons

    Args:
        available_only: Only return available addons (default: true)

    Returns:
        List of addons with total count
    """
    addons = await AddonService.get_all_addons(db, available_only=available_only)

    # Convert to response format with price in pesos
    addon_responses = []
    for addon in addons:
        addon_responses.append(
            AddonResponse(
                id=addon.id,
                name=addon.name,
                description=addon.description,
                price=addon.price,  # Price in cents (stored)
                category=addon.category,
                available=addon.available,
                max_quantity=addon.max_quantity,
                created_at=addon.created_at,
                updated_at=addon.updated_at,
                price_in_pesos=addon.price / 100  # For display
            )
        )

    return AddonListResponse(
        addons=addon_responses,
        total=len(addon_responses)
    )


@router.get("/{addon_id}", response_model=AddonResponse)
async def get_addon(
    addon_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single addon by ID

    Args:
        addon_id: Addon ID

    Returns:
        Addon details

    Raises:
        HTTPException 404 if addon not found
    """
    addon = await AddonService.get_addon_by_id(db, addon_id)

    if not addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Addon with ID {addon_id} not found"
        )

    return AddonResponse(
        id=addon.id,
        name=addon.name,
        description=addon.description,
        price=addon.price,
        category=addon.category,
        available=addon.available,
        max_quantity=addon.max_quantity,
        created_at=addon.created_at,
        updated_at=addon.updated_at,
        price_in_pesos=addon.price / 100
    )


@router.post("/", response_model=AddonResponse, status_code=status.HTTP_201_CREATED)
async def create_addon(
    addon_data: AddonBase,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new addon

    Args:
        addon_data: Addon creation data (price in pesos)

    Returns:
        Created addon
    """
    new_addon = await AddonService.create_addon(db, addon_data)

    return AddonResponse(
        id=new_addon.id,
        name=new_addon.name,
        description=new_addon.description,
        price=new_addon.price,
        category=new_addon.category,
        available=new_addon.available,
        max_quantity=new_addon.max_quantity,
        created_at=new_addon.created_at,
        updated_at=new_addon.updated_at,
        price_in_pesos=new_addon.price / 100
    )


@router.put("/{addon_id}", response_model=AddonResponse)
async def update_addon(
    addon_id: int,
    addon_data: AddonUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing addon

    Args:
        addon_id: Addon ID
        addon_data: Addon update data

    Returns:
        Updated addon

    Raises:
        HTTPException 404 if addon not found
    """
    updated_addon = await AddonService.update_addon(db, addon_id, addon_data)

    if not updated_addon:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Addon with ID {addon_id} not found"
        )

    return AddonResponse(
        id=updated_addon.id,
        name=updated_addon.name,
        description=updated_addon.description,
        price=updated_addon.price,
        category=updated_addon.category,
        available=updated_addon.available,
        max_quantity=updated_addon.max_quantity,
        created_at=updated_addon.created_at,
        updated_at=updated_addon.updated_at,
        price_in_pesos=updated_addon.price / 100
    )


@router.delete("/{addon_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_addon(
    addon_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an addon

    Args:
        addon_id: Addon ID

    Raises:
        HTTPException 404 if addon not found
    """
    deleted = await AddonService.delete_addon(db, addon_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Addon with ID {addon_id} not found"
        )

    return None
