"""
Size Preset Service

Business logic for size preset operations
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.size_preset import SizePreset
from app.schemas.size_preset import SizePresetCreate, SizePresetUpdate


class SizePresetService:
    """Service for size preset operations"""

    @staticmethod
    async def get_all_presets(
        db: AsyncSession,
        active_only: bool = True,
        include_default_first: bool = True
    ) -> List[SizePreset]:
        """
        Get all size presets

        Args:
            db: Database session
            active_only: Only return active presets
            include_default_first: Put default preset first in list

        Returns:
            List of SizePreset objects
        """
        query = select(SizePreset)

        if active_only:
            query = query.where(SizePreset.is_active == True)

        query = query.order_by(SizePreset.sort_order, SizePreset.name)

        result = await db.execute(query)
        presets = result.scalars().all()

        # Move default preset to front if requested
        if include_default_first:
            default_presets = [p for p in presets if p.is_default]
            other_presets = [p for p in presets if not p.is_default]
            presets = default_presets + other_presets

        return list(presets)

    @staticmethod
    async def get_preset_by_id(db: AsyncSession, preset_id: int) -> Optional[SizePreset]:
        """Get a single size preset by ID"""
        query = select(SizePreset).where(SizePreset.id == preset_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_preset_by_preset_id(db: AsyncSession, preset_id: str) -> Optional[SizePreset]:
        """Get a size preset by its preset_id field (e.g., '1', '2', '3')"""
        query = select(SizePreset).where(SizePreset.preset_id == preset_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_preset(db: AsyncSession, preset_data: SizePresetCreate) -> SizePreset:
        """
        Create a new size preset

        Args:
            db: Database session
            preset_data: Size preset creation data

        Returns:
            Created SizePreset object
        """
        # If this is set as default, unset other defaults
        if preset_data.is_default:
            await SizePresetService._unset_other_defaults(db)

        new_preset = SizePreset(
            name=preset_data.name,
            description=preset_data.description,
            preset_id=preset_data.preset_id,
            labels=preset_data.labels,  # JSON column stores directly
            is_default=preset_data.is_default,
            is_active=preset_data.is_active,
            sort_order=preset_data.sort_order
        )

        db.add(new_preset)
        await db.commit()
        await db.refresh(new_preset)

        return new_preset

    @staticmethod
    async def update_preset(
        db: AsyncSession,
        preset_id: int,
        preset_data: SizePresetUpdate
    ) -> Optional[SizePreset]:
        """
        Update an existing size preset

        Args:
            db: Database session
            preset_id: Size preset ID
            preset_data: Size preset update data

        Returns:
            Updated SizePreset object or None if not found
        """
        preset = await SizePresetService.get_preset_by_id(db, preset_id)

        if not preset:
            return None

        # If setting as default, unset other defaults
        if preset_data.is_default is True:
            await SizePresetService._unset_other_defaults(db, exclude_id=preset_id)

        # Update fields
        update_data = preset_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(preset, field, value)  # JSON column handles lists directly

        await db.commit()
        await db.refresh(preset)

        return preset

    @staticmethod
    async def delete_preset(db: AsyncSession, preset_id: int) -> bool:
        """
        Delete a size preset

        Args:
            db: Database session
            preset_id: Size preset ID

        Returns:
            True if deleted, False if not found
        """
        preset = await SizePresetService.get_preset_by_id(db, preset_id)

        if not preset:
            return False

        await db.delete(preset)
        await db.commit()

        return True

    @staticmethod
    async def _unset_other_defaults(
        db: AsyncSession,
        exclude_id: Optional[int] = None
    ) -> None:
        """
        Unset is_default for all presets except the specified one

        Args:
            db: Database session
            exclude_id: ID to exclude from unsetting
        """
        query = select(SizePreset).where(SizePreset.is_default == True)

        if exclude_id is not None:
            query = query.where(SizePreset.id != exclude_id)

        result = await db.execute(query)
        presets = result.scalars().all()

        for preset in presets:
            preset.is_default = False

        await db.commit()

    @staticmethod
    def parse_labels(preset: SizePreset) -> List[str]:
        """
        Parse labels from SizePreset

        Args:
            preset: SizePreset object

        Returns:
            List of size labels
        """
        try:
            # JSON column stores data directly as list
            if isinstance(preset.labels, list):
                return preset.labels
            return ['Small', 'Medium', 'Large']
        except (TypeError, AttributeError):
            return ['Small', 'Medium', 'Large']


# Singleton instance
size_preset_service = SizePresetService()
