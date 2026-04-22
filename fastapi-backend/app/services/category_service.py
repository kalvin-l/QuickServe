"""
Category Service
Business logic for category operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    """Service for category CRUD operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, scope: Optional[str] = None) -> List[Category]:
        """
        Get all categories

        Args:
            scope: Optional filter by scope ('menu', 'inventory', 'both')
        """
        query = select(Category).order_by(Category.name)

        if scope:
            query = query.where(
                (Category.scope == scope) | (Category.scope == "both")
            )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_id(self, category_id: int) -> Optional[Category]:
        """Get a category by ID"""
        query = select(Category).where(Category.id == category_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, category_data: CategoryCreate) -> Category:
        """Create a new category"""
        db_category = Category(**category_data.model_dump())
        self.db.add(db_category)
        await self.db.commit()
        await self.db.refresh(db_category)
        return db_category

    async def update(self, category_id: int, category_data: CategoryUpdate) -> Optional[Category]:
        """Update a category"""
        db_category = await self.get_by_id(category_id)

        if not db_category:
            return None

        update_data = category_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_category, field, value)

        await self.db.commit()
        await self.db.refresh(db_category)
        return db_category

    async def delete(self, category_id: int) -> bool:
        """Delete a category"""
        db_category = await self.get_by_id(category_id)

        if not db_category:
            return False

        await self.db.delete(db_category)
        await self.db.commit()
        return True
