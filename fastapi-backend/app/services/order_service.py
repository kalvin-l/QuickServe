"""
Order Service - Business logic for order operations.
"""
import logging
import secrets
import string
from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, and_, or_, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem, OrderStatus, OrderType
from app.models.menu_item import MenuItem
from app.models.table import Table
from app.schemas.order import OrderCreate, OrderItemCreate
from app.utils.timezone_config import get_utc_now

logger = logging.getLogger(__name__)


class OrderNotFoundError(Exception):
    """Raised when an order is not found"""
    pass


class InvalidOrderStatusTransition(Exception):
    """Raised when an invalid status transition is attempted"""
    pass


class MenuItemNotFoundError(Exception):
    """Raised when a menu item is not found"""
    pass


class OrderService:
    """Service for order business logic"""

    # Valid status transitions
    VALID_TRANSITIONS = {
        OrderStatus.PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        OrderStatus.CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
        OrderStatus.READY: [OrderStatus.SERVED, OrderStatus.CANCELLED],
        OrderStatus.SERVED: [],  # Final state
        OrderStatus.CANCELLED: [],  # Final state
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_order(self, order_data: OrderCreate) -> Order:
        """
        Create a new order with items.

        - Generates unique order number
        - Fetches menu items to snapshot prices
        - Calculates totals
        - Creates order and order items
        """
        # Generate unique order number
        order_number = await self._generate_order_number()

        # Get menu items and validate
        menu_items = await self._get_menu_items([item.menu_item_id for item in order_data.items])

        # Calculate totals
        subtotal = 0
        order_items = []

        for item_data in order_data.items:
            menu_item = menu_items.get(item_data.menu_item_id)
            if not menu_item:
                raise MenuItemNotFoundError(f"Menu item {item_data.menu_item_id} not found")

            # Calculate item total
            item_total = self._calculate_item_total(
                base_price=menu_item.price,
                size_price=item_data.size_price,
                addons=item_data.addons,
                quantity=item_data.quantity
            )

            subtotal += item_total

            # Create order item with snapshot
            order_item = OrderItem(
                menu_item_id=item_data.menu_item_id,
                item_name=menu_item.name,
                base_price=menu_item.price,
                quantity=item_data.quantity,
                size_key=item_data.size_key,
                size_label=item_data.size_label,
                size_price=item_data.size_price,
                temperature=item_data.temperature,
                addons=[addon.model_dump() for addon in item_data.addons] if item_data.addons else None,
                item_total=item_total,
                special_instructions=item_data.special_instructions,
            )
            order_items.append(order_item)

        # Calculate tax (currently 0, can be configured)
        tax = 0
        total = subtotal + tax

        # Create order
        order = Order(
            order_number=order_number,
            table_id=order_data.table_id,
            table_session_id=order_data.table_session_id,
            order_type=order_data.order_type,
            group_session_id=order_data.group_session_id,
            participant_id=order_data.participant_id,
            customer_name=order_data.customer_name,
            status=OrderStatus.PENDING,
            subtotal=subtotal,
            tax=tax,
            total=total,
            notes=order_data.notes,
            created_at=get_utc_now(),
        )

        self.db.add(order)
        await self.db.flush()

        # Add items to order
        for order_item in order_items:
            order_item.order_id = order.id
            self.db.add(order_item)

        await self.db.commit()
        await self.db.refresh(order)

        logger.info(f"Created order {order_number} with {len(order_items)} items, total: {total}")

        return order

    async def get_order_by_id(self, order_id: int) -> Optional[Order]:
        """Get order by ID with all relationships loaded"""
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.payment),
                selectinload(Order.table),
                selectinload(Order.table_session),  # Load table_session for session_id
            )
            .where(Order.id == order_id)
            .where(Order.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_order_by_number(self, order_number: str) -> Optional[Order]:
        """Get order by order number"""
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.payment),
                selectinload(Order.table),
            )
            .where(Order.order_number == order_number)
            .where(Order.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_orders(
        self,
        status: Optional[OrderStatus] = None,
        order_type: Optional[OrderType] = None,
        table_id: Optional[int] = None,
        group_session_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20
    ) -> dict:
        """Get orders with filters and pagination"""
        query = select(Order).options(
            selectinload(Order.items),
            selectinload(Order.payment),
            selectinload(Order.table),
        )

        # Apply filters
        filters = [Order.is_active == True]

        if status:
            filters.append(Order.status == status)
        if order_type:
            filters.append(Order.order_type == order_type)
        if table_id:
            filters.append(Order.table_id == table_id)
        if group_session_id:
            filters.append(Order.group_session_id == group_session_id)
        if date_from:
            filters.append(Order.created_at >= date_from)
        if date_to:
            filters.append(Order.created_at <= date_to)

        query = query.where(and_(*filters))

        # Count total
        count_query = select(func.count(Order.id)).where(and_(*filters))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply pagination and ordering
        query = query.order_by(Order.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        orders = result.scalars().all()

        return {
            "items": orders,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size if total > 0 else 0
        }

    async def update_order_status(
        self,
        order_id: int,
        new_status: OrderStatus
    ) -> Order:
        """
        Update order status with validation.

        - Validates status transition
        - Updates relevant timestamps
        - Returns updated order
        """
        order = await self.get_order_by_id(order_id)
        if not order:
            raise OrderNotFoundError(f"Order {order_id} not found")

        # Validate transition
        valid_next_states = self.VALID_TRANSITIONS.get(order.status, [])
        if new_status not in valid_next_states:
            raise InvalidOrderStatusTransition(
                f"Cannot transition from {order.status.value} to {new_status.value}"
            )

        old_status = order.status
        order.status = new_status

        # Update timestamps based on status
        now = get_utc_now()
        if new_status == OrderStatus.CONFIRMED:
            order.confirmed_at = now
        elif new_status == OrderStatus.READY:
            order.ready_at = now
        elif new_status == OrderStatus.SERVED:
            order.served_at = now
        elif new_status == OrderStatus.CANCELLED:
            order.cancelled_at = now

        await self.db.commit()

        # Refresh and reload relationships
        await self.db.refresh(order)
        # Reload relationships after refresh
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.payment),
                selectinload(Order.table),
                selectinload(Order.table_session),
            )
            .where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()

        logger.info(f"Order {order.order_number} status changed: {old_status.value} -> {new_status.value}")

        return order

    async def get_kitchen_queue(self) -> List[Order]:
        """
        Get orders that are in the kitchen queue (PENDING, CONFIRMED, PREPARING, READY).

        Orders are sorted:
        - CONFIRMED: newest confirmed first (so barista sees new orders at top)
        - PENDING: newest created first (new orders)
        - PREPARING: oldest created first (orders waiting longest)
        - READY: oldest created first (orders waiting longest for pickup)
        """
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.table),
            )
            .where(Order.is_active == True)
            .where(Order.status.in_([
                OrderStatus.PENDING,
                OrderStatus.CONFIRMED,
                OrderStatus.PREPARING,
                OrderStatus.READY
            ]))
            .order_by(
                # Sort by confirmed_at DESC (newest first), NULLs at end
                # This puts confirmed orders (with confirmed_at) at top
                Order.confirmed_at.desc().nulls_last(),
                # Then by created_at DESC (newest first for pending)
                Order.created_at.desc()
            )
        )
        return result.scalars().all()

    async def get_group_orders(self, group_session_id: int) -> List[Order]:
        """Get all orders for a specific group session"""
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.items),
                selectinload(Order.payment),
            )
            .where(Order.group_session_id == group_session_id)
            .where(Order.is_active == True)
            .order_by(Order.created_at.asc())
        )
        return result.scalars().all()

    async def calculate_order_total(self, items: List[OrderItemCreate]) -> dict:
        """Calculate order totals before creation (preview)"""
        menu_items = await self._get_menu_items([item.menu_item_id for item in items])

        subtotal = 0
        item_count = 0

        for item_data in items:
            menu_item = menu_items.get(item_data.menu_item_id)
            if not menu_item:
                continue

            item_total = self._calculate_item_total(
                base_price=menu_item.price,
                size_price=item_data.size_price,
                addons=item_data.addons,
                quantity=item_data.quantity
            )
            subtotal += item_total
            item_count += item_data.quantity

        tax = 0
        total = subtotal + tax

        return {
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "subtotal_in_pesos": subtotal / 100,
            "tax_in_pesos": tax / 100,
            "total_in_pesos": total / 100,
            "item_count": item_count
        }

    async def cancel_order(self, order_id: int, reason: Optional[str] = None) -> Order:
        """Cancel an order"""
        return await self.update_order_status(order_id, OrderStatus.CANCELLED)

    async def _generate_order_number(self) -> str:
        """Generate unique order number in format QS-YYYYMMDD-XXX"""
        today = get_utc_now().strftime("%Y%m%d")

        while True:
            # Generate 3-digit random number
            random_part = ''.join(secrets.choice(string.digits) for _ in range(3))
            order_number = f"QS-{today}-{random_part}"

            # Check if exists
            result = await self.db.execute(
                select(Order).where(Order.order_number == order_number)
            )
            if not result.scalar_one_or_none():
                return order_number

    async def _get_menu_items(self, menu_item_ids: List[int]) -> dict:
        """Fetch menu items by IDs and return as dict"""
        result = await self.db.execute(
            select(MenuItem).where(MenuItem.id.in_(menu_item_ids))
        )
        items = result.scalars().all()
        return {item.id: item for item in items}

    def _calculate_item_total(
        self,
        base_price: int,
        size_price: int,
        addons: Optional[List],
        quantity: int
    ) -> int:
        """Calculate total price for a single item"""
        addon_total = 0
        if addons:
            for addon in addons:
                if hasattr(addon, 'price'):
                    addon_price = addon.price
                    addon_qty = addon.quantity if hasattr(addon, 'quantity') else 1
                else:
                    addon_price = addon.get("price", 0)
                    addon_qty = addon.get("quantity", 1)
                addon_total += addon_price * addon_qty

        return (base_price + size_price + addon_total) * quantity

    async def deduct_inventory_for_order(self, order_id: int) -> dict:
        """
        Deduct inventory items based on menu item recipes in an order.

        This is called after order confirmation to track ingredient usage.
        Menu items will be automatically marked out-of-stock if inventory is insufficient.
        Size-specific quantities are used when available.

        Args:
            order_id: The order ID

        Returns:
            Dict with success status and any items that couldn't be fulfilled
        """
        from app.services.recipe_service import RecipeService

        recipe_service = RecipeService(self.db)

        # Get the order with items
        order = await self.get_order_by_id(order_id)
        if not order:
            raise OrderNotFoundError(f"Order {order_id} not found")

        insufficient_items = []

        # Process each order item
        for order_item in order.items:
            try:
                # Determine size from order_item (size_key or default to medium)
                size = 'medium'
                if order_item.size_key:
                    # Map size_key to our size names
                    # Common patterns: 'small', 'sm', 's' -> 'small'
                    #                'medium', 'md', 'm', 'regular' -> 'medium'
                    #                'large', 'lg', 'l' -> 'large'
                    size_lower = order_item.size_key.lower()
                    if size_lower in ['small', 'sm', 's', 'xs', 'xsmall']:
                        size = 'small'
                    elif size_lower in ['large', 'lg', 'l', 'xl', 'xlarge']:
                        size = 'large'

                # Use size-aware deduction
                result = await recipe_service.deduct_inventory_for_order_with_size(
                    menu_item_id=order_item.menu_item_id,
                    size=size,
                    quantity=order_item.quantity
                )

                if result.get('insufficient_items'):
                    insufficient_items.extend(result['insufficient_items'])

            except Exception as e:
                logger.error(f"Failed to process ingredients for menu item {order_item.menu_item_id}: {e}")

        return {
            'success': len(insufficient_items) == 0,
            'insufficient_items': insufficient_items
        }
