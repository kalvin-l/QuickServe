"""
Addon Service

Business logic for addon operations
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.addon import Addon
from app.schemas.addon import AddonCreate, AddonUpdate


class AddonService:
    """Service for addon operations"""

    @staticmethod
    async def get_all_addons(
        db: AsyncSession,
        available_only: bool = True
    ) -> List[Addon]:
        """
        Get all addons

        Args:
            db: Database session
            available_only: Only return available addons

        Returns:
            List of Addon objects
        """
        query = select(Addon)

        if available_only:
            query = query.where(Addon.available == True)

        query = query.order_by(Addon.category, Addon.name)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_addon_by_id(db: AsyncSession, addon_id: int) -> Optional[Addon]:
        """Get a single addon by ID"""
        query = select(Addon).where(Addon.id == addon_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_addon(db: AsyncSession, addon_data: AddonCreate) -> Addon:
        """
        Create a new addon

        Args:
            db: Database session
            addon_data: Addon creation data (price is in pesos)

        Returns:
            Created Addon object
        """
        # Convert price from pesos to cents for storage
        price_in_cents = int(addon_data.price * 100)

        new_addon = Addon(
            name=addon_data.name,
            description=addon_data.description,
            price=price_in_cents,
            category=addon_data.category,
            available=addon_data.available,
            max_quantity=addon_data.max_quantity
        )

        db.add(new_addon)
        await db.commit()
        await db.refresh(new_addon)

        return new_addon

    @staticmethod
    async def update_addon(
        db: AsyncSession,
        addon_id: int,
        addon_data: AddonUpdate
    ) -> Optional[Addon]:
        """
        Update an existing addon

        Args:
            db: Database session
            addon_id: Addon ID
            addon_data: Addon update data (price is in pesos)

        Returns:
            Updated Addon object or None if not found
        """
        addon = await AddonService.get_addon_by_id(db, addon_id)

        if not addon:
            return None

        # Update fields
        if addon_data.name is not None:
            addon.name = addon_data.name
        if addon_data.description is not None:
            addon.description = addon_data.description
        if addon_data.price is not None:
            addon.price = int(addon_data.price * 100)  # Convert to cents
        if addon_data.category is not None:
            addon.category = addon_data.category
        if addon_data.available is not None:
            addon.available = addon_data.available
        if addon_data.max_quantity is not None:
            addon.max_quantity = addon_data.max_quantity

        await db.commit()
        await db.refresh(addon)

        return addon

    @staticmethod
    async def delete_addon(db: AsyncSession, addon_id: int) -> bool:
        """
        Delete an addon

        Args:
            db: Database session
            addon_id: Addon ID

        Returns:
            True if deleted, False if not found
        """
        addon = await AddonService.get_addon_by_id(db, addon_id)

        if not addon:
            return False

        await db.delete(addon)
        await db.commit()

        return True


# Singleton instance
addon_service = AddonService()
