"""
Inventory Service
Business logic for inventory management operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, case, literal_column
from sqlalchemy.orm import selectinload
from typing import Optional, Literal
from datetime import datetime, timedelta
from app.models.inventory import Inventory
from app.models.category import Category
from app.models.stock_unit import StockUnit
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse, StockLevel


class InventoryService:
    """Service for inventory management operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_items(
        self,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        stock_status: Optional[Literal["in_stock", "low_stock", "out_of_stock"]] = None,
        unit_type: Optional[Literal["count", "volume", "weight"]] = None,
        page: int = 1,
        page_size: int = 20
    ) -> dict:
        """
        Get inventory items with filters and pagination
        Returns: {items: [], total: X, page: X, page_size: X, total_pages: X}
        """
        # Build query - now uses Inventory table directly
        query = select(Inventory)

        # Apply filters
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Inventory.name.ilike(search_pattern),
                    Inventory.description.ilike(search_pattern)
                )
            )

        if category_id == 0:
            # Filter for items without a category
            query = query.where(Inventory.category_id == None)
        elif category_id:
            query = query.where(Inventory.category_id == category_id)

        if stock_status:
            if stock_status == "out_of_stock":
                query = query.where(Inventory.stock_quantity <= 0)
            elif stock_status == "low_stock":
                query = query.where(
                    and_(
                        Inventory.stock_quantity > 0,
                        Inventory.stock_quantity <= Inventory.low_stock_threshold
                    )
                )
            elif stock_status == "in_stock":
                query = query.where(Inventory.stock_quantity > Inventory.low_stock_threshold)

        if unit_type:
            # Filter by unit type using the StockUnit helper
            valid_units = [u["value"] for u in StockUnit.get_units_by_type(unit_type)]
            query = query.where(Inventory.stock_unit.in_(valid_units))

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination and load relations
        query = query.options(selectinload(Inventory.category))
        query = query.order_by(Inventory.name.asc())
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

    async def get_by_id(self, item_id: int) -> Optional[Inventory]:
        """Get a single inventory item by ID with relations"""
        query = select(Inventory).where(Inventory.id == item_id)
        query = query.options(selectinload(Inventory.category))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, item_data: InventoryCreate) -> Inventory:
        """Create a new inventory item"""
        # Create inventory item with explicit fields
        db_item = Inventory(
            name=item_data.name,
            description=item_data.description,
            category_id=item_data.category_id,
            stock_quantity=item_data.stock_quantity,
            stock_unit=item_data.stock_unit,
            low_stock_threshold=item_data.low_stock_threshold,
            reorder_level=item_data.reorder_level,
            reorder_quantity=item_data.reorder_quantity,
            # Container tracking
            container_type=item_data.container_type,
            container_capacity=item_data.container_capacity,
        )

        # Calculate container count if container tracking is enabled
        if db_item.container_capacity and db_item.container_type:
            db_item.container_count = round(
                db_item.stock_quantity / db_item.container_capacity, 2
            )

        self.db.add(db_item)
        await self.db.commit()
        await self.db.refresh(db_item)

        return db_item

    async def update(self, item_id: int, item_data: InventoryUpdate) -> Optional[Inventory]:
        """Update an existing inventory item"""
        # Get existing item
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return None

        # Update fields
        update_data = item_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_item, field, value)

        # Recalculate container count if container tracking fields or quantity changed
        recalc_container = any(
            field in update_data for field in ["container_capacity", "container_type", "stock_quantity"]
        )
        if recalc_container and db_item.container_capacity and db_item.container_type:
            db_item.container_count = round(db_item.stock_quantity / db_item.container_capacity, 2)

        await self.db.commit()
        await self.db.refresh(db_item)

        # Load relations before returning
        return await self.get_by_id(item_id)

    async def delete(self, item_id: int) -> bool:
        """Delete an inventory item"""
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return False

        await self.db.delete(db_item)
        await self.db.commit()
        return True

    async def get_low_stock_items(
        self,
        threshold: Optional[int] = None,
        category_id: Optional[int] = None
    ) -> list[Inventory]:
        """
        Get items below their low stock threshold
        Args:
            threshold: Override default low_stock_threshold with custom value
            category_id: Filter by category
        Returns:
            List of items that need restocking
        """
        query = select(Inventory).options(selectinload(Inventory.category))

        if threshold is not None:
            # Use custom threshold
            query = query.where(Inventory.stock_quantity <= threshold)
        else:
            # Use each item's own low_stock_threshold
            query = query.where(Inventory.stock_quantity <= Inventory.low_stock_threshold)

        if category_id:
            query = query.where(Inventory.category_id == category_id)

        query = query.order_by(Inventory.stock_quantity.asc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def adjust_stock(
        self,
        item_id: int,
        quantity: int,
        reason: str,
        reference: Optional[str] = None
    ) -> Optional[Inventory]:
        """
        Adjust stock quantity (add or remove)
        Args:
            item_id: The inventory item ID
            quantity: Quantity to add (positive) or remove (negative)
            reason: Reason for adjustment
            reference: Optional reference number
        Returns:
            Updated Inventory or None if not found
        """
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return None

        # Validate new quantity won't go negative
        new_quantity = db_item.stock_quantity + quantity
        if new_quantity < 0:
            raise ValueError(f"Insufficient stock. Current: {db_item.stock_quantity}, Attempted to remove: {-quantity}")

        # Update stock
        db_item.stock_quantity = new_quantity

        # Update last_restocked_at if adding stock
        if quantity > 0:
            db_item.last_restocked_at = datetime.utcnow()

        # Recalculate container count if container tracking is enabled
        if db_item.container_capacity and db_item.container_type:
            db_item.container_count = round(db_item.stock_quantity / db_item.container_capacity, 2)

        # Note: In a full implementation, you would also log this adjustment
        # to a StockMovement table for audit trail

        await self.db.commit()
        await self.db.refresh(db_item)

        return await self.get_by_id(item_id)

    async def restock_item(
        self,
        item_id: int,
        quantity: Optional[int] = None
    ) -> Optional[Inventory]:
        """
        Restock item to its reorder_quantity level or custom amount
        Args:
            item_id: The inventory item ID
            quantity: Custom restock quantity (if None, uses reorder_quantity)
        Returns:
            Updated Inventory or None if not found
        """
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return None

        # Determine restock amount
        restock_amount = quantity if quantity is not None else db_item.reorder_quantity

        # Add to current stock
        db_item.stock_quantity += restock_amount
        db_item.last_restocked_at = datetime.utcnow()

        # Recalculate container count if container tracking is enabled
        if db_item.container_capacity and db_item.container_type:
            db_item.container_count = round(db_item.stock_quantity / db_item.container_capacity, 2)

        await self.db.commit()
        await self.db.refresh(db_item)

        return await self.get_by_id(item_id)

    async def bulk_restock(
        self,
        item_ids: list[int],
        quantity: Optional[int] = None
    ) -> dict[int, bool]:
        """
        Restock multiple items at once
        Args:
            item_ids: List of item IDs to restock
            quantity: Custom restock quantity (if None, uses each item's reorder_quantity)
        Returns:
            Dict mapping item_id to success status
        """
        results = {}

        for item_id in item_ids:
            try:
                item = await self.get_by_id(item_id)
                if not item:
                    results[item_id] = False
                    continue

                # Determine restock amount
                restock_amount = quantity if quantity is not None else item.reorder_quantity

                # Add to current stock
                item.stock_quantity += restock_amount
                item.last_restocked_at = datetime.utcnow()

                # Recalculate container count if container tracking is enabled
                if item.container_capacity and item.container_type:
                    item.container_count = round(item.stock_quantity / item.container_capacity, 2)

                results[item_id] = True

            except Exception:
                results[item_id] = False

        await self.db.commit()

        return results

    async def get_inventory_stats(self) -> dict:
        """
        Get inventory statistics for dashboard
        Returns:
            Dict with total_items, in_stock_count, low_stock_count, out_of_stock_count,
            total_value, and categories breakdown
        """
        # Get total count
        total_query = select(func.count()).select_from(Inventory)
        total_result = await self.db.execute(total_query)
        total_items = total_result.scalar()

        # Get in-stock count (above low_stock_threshold)
        in_stock_query = select(func.count()).select_from(Inventory).where(
            Inventory.stock_quantity > Inventory.low_stock_threshold
        )
        in_stock_result = await self.db.execute(in_stock_query)
        in_stock_count = in_stock_result.scalar()

        # Get low stock count (between 0 and low_stock_threshold)
        low_stock_query = select(func.count()).select_from(Inventory).where(
            and_(
                Inventory.stock_quantity > 0,
                Inventory.stock_quantity <= Inventory.low_stock_threshold
            )
        )
        low_stock_result = await self.db.execute(low_stock_query)
        low_stock_count = low_stock_result.scalar()

        # Get out of stock count
        out_of_stock_query = select(func.count()).select_from(Inventory).where(
            Inventory.stock_quantity <= 0
        )
        out_of_stock_result = await self.db.execute(out_of_stock_query)
        out_of_stock_count = out_of_stock_result.scalar()

        # Calculate total value (0 for inventory since no price field)
        total_value = 0.0

        # Get breakdown by category
        category_query = (
            select(
                Category.name,
                func.count(Inventory.id).label('count')
            )
            .outerjoin(Inventory, Category.id == Inventory.category_id)
            .group_by(Category.id, Category.name)
            .order_by(func.count(Inventory.id).desc())
        )
        category_result = await self.db.execute(category_query)
        categories = [{"name": row.name or "Uncategorized", "count": row.count} for row in category_result]

        return {
            "total_items": total_items,
            "in_stock_count": in_stock_count,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "total_value": total_value,
            "categories": categories
        }

    def _get_stock_status(self, item: Inventory) -> str:
        """
        Determine stock status: in_stock, low_stock, out_of_stock
        This is also available as a property on the model
        """
        if item.stock_quantity <= 0:
            return "out_of_stock"
        elif item.stock_quantity <= item.low_stock_threshold:
            return "low_stock"
        return "in_stock"

    def _build_stock_level(self, item: Inventory) -> StockLevel:
        """
        Build StockLevel object for API response
        """
        return StockLevel(
            current=item.stock_quantity,
            unit=item.stock_unit,
            unit_display=StockUnit.get_display_name(item.stock_unit),
            status=self._get_stock_status(item),
            threshold=item.low_stock_threshold,
            percentage=item.stock_level_percentage
        )

    def _build_inventory_response(self, item: Inventory) -> dict:
        """
        Build inventory item response with all computed fields
        """
        # Calculate days since restock
        days_since_restock = None
        if item.last_restocked_at:
            days = (datetime.utcnow() - item.last_restocked_at).days
            days_since_restock = days

        return {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "category": {
                "id": item.category.id,
                "name": item.category.name
            } if item.category else None,
            # Inventory fields
            "stock_quantity": item.stock_quantity,
            "stock_unit": item.stock_unit,
            "low_stock_threshold": item.low_stock_threshold,
            "reorder_level": item.reorder_level,
            "reorder_quantity": item.reorder_quantity,
            "last_restocked_at": item.last_restocked_at.isoformat() if item.last_restocked_at else None,
            # Computed fields
            "stock_level": self._build_stock_level(item),
            "needs_reorder": item.needs_reorder,
            "days_since_restock": days_since_restock,
            # Container tracking
            "container_type": item.container_type,
            "container_capacity": item.container_capacity,
            "container_count": item.container_count_display
        }

    async def get_categories_with_inventory(self) -> list[dict]:
        """
        Get all categories with item count for filtering
        Returns list of {value: str, label: str} for select dropdowns
        """
        query = select(Category).order_by(Category.name)
        result = await self.db.execute(query)
        categories = result.scalars().all()

        return [
            {"value": str(cat.id), "label": cat.name}
            for cat in categories
        ]

    async def set_stock_levels(
        self,
        item_id: int,
        stock_quantity: int,
        low_stock_threshold: Optional[int] = None,
        reorder_level: Optional[int] = None,
        reorder_quantity: Optional[int] = None
    ) -> Optional[Inventory]:
        """
        Set stock levels for an item
        Args:
            item_id: The inventory item ID
            stock_quantity: New stock quantity
            low_stock_threshold: New low stock threshold (optional)
            reorder_level: New reorder level (optional)
            reorder_quantity: New reorder quantity (optional)
        Returns:
            Updated Inventory or None if not found
        """
        db_item = await self.get_by_id(item_id)
        if not db_item:
            return None

        db_item.stock_quantity = stock_quantity
        if low_stock_threshold is not None:
            db_item.low_stock_threshold = low_stock_threshold
        if reorder_level is not None:
            db_item.reorder_level = reorder_level
        if reorder_quantity is not None:
            db_item.reorder_quantity = reorder_quantity

        # Recalculate container count if container tracking is enabled
        if db_item.container_capacity and db_item.container_type:
            db_item.container_count = round(db_item.stock_quantity / db_item.container_capacity, 2)

        await self.db.commit()
        await self.db.refresh(db_item)

        return await self.get_by_id(item_id)
