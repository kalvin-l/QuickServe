"""
Menu Service
Business logic for menu item operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from app.models.menu_item import MenuItem
from app.models.category import Category
from app.models.addon import Addon
from app.models.menu_addon import MenuItemAddon
from app.schemas.menu_item import MenuItemCreate, MenuItemUpdate, MenuItemSearchParams


class MenuService:
    """Service for menu item business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        available_only: bool = False,
        featured_only: bool = False,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 12
    ) -> dict:
        """
        Get all menu items with filters and pagination
        Returns: {items: [], total: X, page: X, page_size: X, total_pages: X}
        """
        # Build query
        query = select(MenuItem)

        # Apply filters
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    MenuItem.name.ilike(search_pattern),
                    MenuItem.description.ilike(search_pattern)
                )
            )

        if category_id == 0:
            # Filter for items without a category
            query = query.where(MenuItem.category_id == None)
        elif category_id:
            query = query.where(MenuItem.category_id == category_id)

        if available_only:
            query = query.where(MenuItem.available == True)

        if featured_only:
            query = query.where(MenuItem.featured == True)

        if status:
            query = query.where(MenuItem.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination and load relations
        query = query.options(
            selectinload(MenuItem.category),
            selectinload(MenuItem.addons)
        )
        query = query.order_by(MenuItem.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        # Execute query
        result = await self.db.execute(query)
        items = result.scalars().all()

        # Calculate total pages
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }

    async def get_by_id(self, item_id: int) -> Optional[MenuItem]:
        """
        Get a single menu item by ID with relations
        """
        query = select(MenuItem).where(MenuItem.id == item_id)
        query = query.options(
            selectinload(MenuItem.category),
            selectinload(MenuItem.addons)
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, item_data: MenuItemCreate) -> MenuItem:
        """
        Create a new menu item
        """
        # Extract addon_ids from data
        addon_ids = item_data.addon_ids or []
        item_dict = item_data.model_dump(exclude={"addon_ids"})

        # Create menu item
        db_item = MenuItem(**item_dict)
        self.db.add(db_item)
        await self.db.flush()  # Get the ID without committing

        # Attach addons
        if addon_ids:
            await self._attach_addons(db_item.id, addon_ids)

        await self.db.commit()
        await self.db.refresh(db_item)

        # Load relations before returning
        return await self.get_by_id(db_item.id)

    async def update(self, item_id: int, item_data: MenuItemUpdate) -> Optional[MenuItem]:
        """
        Update an existing menu item
        """
        # Get existing item
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return None

        # Extract addon_ids if provided
        addon_ids = item_data.addon_ids if item_data.addon_ids is not None else None
        update_data = item_data.model_dump(exclude_unset=True, exclude={"addon_ids"})

        # Update fields
        for field, value in update_data.items():
            setattr(db_item, field, value)

        # Update addons if provided
        if addon_ids is not None:
            await self._update_addons(item_id, addon_ids)

        await self.db.commit()
        await self.db.refresh(db_item)

        # Load relations before returning
        return await self.get_by_id(item_id)

    async def delete(self, item_id: int) -> bool:
        """
        Delete a menu item (soft delete by setting status to archived)
        """
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return False

        # Soft delete
        db_item.status = "archived"
        db_item.available = False

        await self.db.commit()
        return True

    async def toggle_availability(self, item_id: int) -> Optional[MenuItem]:
        """
        Toggle item availability
        """
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return None

        db_item.available = not db_item.available
        await self.db.commit()
        await self.db.refresh(db_item)

        return await self.get_by_id(item_id)

    async def _attach_addons(self, item_id: int, addon_ids: list[int]) -> None:
        """Attach addons to a menu item"""
        for addon_id in addon_ids:
            association = MenuItemAddon(
                menu_item_id=item_id,
                addon_id=addon_id
            )
            self.db.add(association)

        await self.db.commit()

    async def _update_addons(self, item_id: int, addon_ids: list[int]) -> None:
        """Update addons for a menu item (replace all)"""
        from sqlalchemy import delete

        # Delete existing associations
        delete_stmt = delete(MenuItemAddon).where(
            MenuItemAddon.menu_item_id == item_id
        )
        await self.db.execute(delete_stmt)

        # Add new associations
        await self._attach_addons(item_id, addon_ids)

    async def get_addons(self, available_only: bool = False) -> list[Addon]:
        """Get all addons"""
        query = select(Addon)
        if available_only:
            query = query.where(Addon.available == True)
        query = query.order_by(Addon.category, Addon.name)
        result = await self.db.execute(query)
        return result.scalars().all()
