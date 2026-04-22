"""
Size Presets API Routes

Endpoints for managing size presets
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.size_preset import (
    SizePresetCreate,
    SizePresetUpdate,
    SizePresetResponse,
    SizePresetListResponse,
    SizePresetSelectOption
)
from app.services.size_preset_service import SizePresetService

router = APIRouter()


@router.get("/", response_model=SizePresetListResponse)
async def get_size_presets(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all size presets

    Args:
        active_only: Only return active presets (default: true)

    Returns:
        List of size presets with total count
    """
    presets = await SizePresetService.get_all_presets(db, active_only=active_only)

    # Parse JSON labels for each preset
    preset_responses = []
    for preset in presets:
        labels = SizePresetService.parse_labels(preset)
        preset_responses.append(
            SizePresetResponse(
                id=preset.id,
                name=preset.name,
                description=preset.description,
                preset_id=preset.preset_id,
                labels=labels,
                is_default=preset.is_default,
                is_active=preset.is_active,
                sort_order=preset.sort_order,
                created_at=preset.created_at,
                updated_at=preset.updated_at
            )
        )

    return SizePresetListResponse(
        presets=preset_responses,
        total=len(preset_responses)
    )


@router.get("/select-options", response_model=List[SizePresetSelectOption])
async def get_size_preset_options(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Get size presets as select options for dropdowns

    Args:
        active_only: Only return active presets (default: true)

    Returns:
        List of select options with value, label, and labels
    """
    presets = await SizePresetService.get_all_presets(
        db,
        active_only=active_only,
        include_default_first=True
    )

    options = []
    for preset in presets:
        labels = SizePresetService.parse_labels(preset)
        options.append(
            SizePresetSelectOption(
                value=preset.preset_id,
                label=f"{preset.name} ({', '.join(labels)})",
                labels=labels
            )
        )

    return options


@router.get("/{preset_id}", response_model=SizePresetResponse)
async def get_size_preset(
    preset_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single size preset by ID

    Args:
        preset_id: Size preset ID

    Returns:
        Size preset details

    Raises:
        HTTPException 404 if preset not found
    """
    preset = await SizePresetService.get_preset_by_id(db, preset_id)

    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Size preset with ID {preset_id} not found"
        )

    labels = SizePresetService.parse_labels(preset)

    return SizePresetResponse(
        id=preset.id,
        name=preset.name,
        description=preset.description,
        preset_id=preset.preset_id,
        labels=labels,
        is_default=preset.is_default,
        is_active=preset.is_active,
        sort_order=preset.sort_order,
        created_at=preset.created_at,
        updated_at=preset.updated_at
    )


@router.post("/", response_model=SizePresetResponse, status_code=status.HTTP_201_CREATED)
async def create_size_preset(
    preset_data: SizePresetCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new size preset

    Args:
        preset_data: Size preset creation data

    Returns:
        Created size preset
    """
    # Check if preset_id already exists
    existing = await SizePresetService.get_preset_by_preset_id(db, preset_data.preset_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Preset ID '{preset_data.preset_id}' already exists"
        )

    new_preset = await SizePresetService.create_preset(db, preset_data)

    labels = SizePresetService.parse_labels(new_preset)

    return SizePresetResponse(
        id=new_preset.id,
        name=new_preset.name,
        description=new_preset.description,
        preset_id=new_preset.preset_id,
        labels=labels,
        is_default=new_preset.is_default,
        is_active=new_preset.is_active,
        sort_order=new_preset.sort_order,
        created_at=new_preset.created_at,
        updated_at=new_preset.updated_at
    )


@router.put("/{preset_id}", response_model=SizePresetResponse)
async def update_size_preset(
    preset_id: int,
    preset_data: SizePresetUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing size preset

    Args:
        preset_id: Size preset ID
        preset_data: Size preset update data

    Returns:
        Updated size preset

    Raises:
        HTTPException 404 if preset not found
    """
    updated_preset = await SizePresetService.update_preset(db, preset_id, preset_data)

    if not updated_preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Size preset with ID {preset_id} not found"
        )

    labels = SizePresetService.parse_labels(updated_preset)

    return SizePresetResponse(
        id=updated_preset.id,
        name=updated_preset.name,
        description=updated_preset.description,
        preset_id=updated_preset.preset_id,
        labels=labels,
        is_default=updated_preset.is_default,
        is_active=updated_preset.is_active,
        sort_order=updated_preset.sort_order,
        created_at=updated_preset.created_at,
        updated_at=updated_preset.updated_at
    )


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_size_preset(
    preset_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a size preset

    Args:
        preset_id: Size preset ID

    Raises:
        HTTPException 404 if preset not found
    """
    deleted = await SizePresetService.delete_preset(db, preset_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Size preset with ID {preset_id} not found"
        )

    return None
