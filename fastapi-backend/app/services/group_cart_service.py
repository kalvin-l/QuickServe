"""
Group Cart Service - Business logic for shared group cart operations.
"""
import logging
from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.group_cart import GroupCartItem
from app.models.group_session import GroupSession, GroupSessionStatus
from app.models.menu_item import MenuItem
from app.schemas.group_cart import GroupCartItemCreate, GroupCartItemUpdate

logger = logging.getLogger(__name__)

# Import WebSocket manager (will be used after Phase 2)
try:
    from app.websocket.connection_manager import (
        broadcast_group_cart_item_added,
        broadcast_group_cart_item_updated,
        broadcast_group_cart_item_removed,
        broadcast_group_cart_cleared
    )
    WEBSOCKET_AVAILABLE = True
except ImportError:
    logger.warning("[GROUP_CART] WebSocket broadcast functions not available, real-time updates disabled")
    WEBSOCKET_AVAILABLE = False


class GroupCartNotFoundError(Exception):
    """Raised when a group cart item is not found"""
    pass


class GroupSessionNotFoundError(Exception):
    """Raised when a group session is not found"""
    pass


class GroupSessionNotActiveError(Exception):
    """Raised when trying to modify cart for inactive group"""
    pass


class MenuItemNotFoundError(Exception):
    """Raised when a menu item is not found"""
    pass


class GroupCartService:
    """Service for group cart operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_item(
        self,
        group_session_id: int,
        item_data: GroupCartItemCreate
    ) -> GroupCartItem:
        """Add an item to the group cart"""
        # Validate group session
        group_session = await self._get_group_session(group_session_id)
        if not group_session:
            raise GroupSessionNotFoundError(f"Group session {group_session_id} not found")

        if group_session.status != GroupSessionStatus.ACTIVE:
            raise GroupSessionNotActiveError("Cannot add items to inactive group")

        # Get menu item
        menu_item = await self._get_menu_item(item_data.menu_item_id)
        if not menu_item:
            raise MenuItemNotFoundError(f"Menu item {item_data.menu_item_id} not found")

        # Calculate item total
        item_total = GroupCartItem.calculate_item_total(
            base_price=menu_item.price,
            size_price=item_data.size_price,
            addons=[addon.model_dump() for addon in item_data.addons] if item_data.addons else [],
            quantity=item_data.quantity
        )

        # Create cart item
        cart_item = GroupCartItem(
            group_session_id=group_session_id,
            participant_id=item_data.participant_id,
            participant_name=item_data.participant_name,
            menu_item_id=item_data.menu_item_id,
            item_name=menu_item.name,
            item_image=menu_item.image_path,
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

        self.db.add(cart_item)
        await self.db.commit()
        await self.db.refresh(cart_item)

        logger.info(f"Added item {menu_item.name} to group {group_session_id} cart")

        # Emit WebSocket event for real-time updates
        if WEBSOCKET_AVAILABLE:
            try:
                await broadcast_group_cart_item_added(
                    table_id=group_session.table_id,
                    group_id=group_session.group_id,
                    item=cart_item.to_dict(),
                    participant_name=cart_item.participant_name or 'Guest'
                )
                logger.info(f"[GROUP_CART] Emitted WebSocket event: item_added for group {group_session.group_id}")
            except Exception as e:
                logger.warning(f"[GROUP_CART] Failed to emit WebSocket event: {str(e)}")

        return cart_item

    async def update_item(
        self,
        item_id: int,
        update_data: GroupCartItemUpdate
    ) -> GroupCartItem:
        """Update a group cart item"""
        cart_item = await self.get_item_by_id(item_id)
        if not cart_item:
            raise GroupCartNotFoundError(f"Cart item {item_id} not found")

        # Check if group is still active
        group_session = await self._get_group_session(cart_item.group_session_id)
        if group_session.status != GroupSessionStatus.ACTIVE:
            raise GroupSessionNotActiveError("Cannot modify items in inactive group")

        # Update fields
        if update_data.quantity is not None:
            cart_item.quantity = update_data.quantity
        if update_data.size_key is not None:
            cart_item.size_key = update_data.size_key
        if update_data.size_label is not None:
            cart_item.size_label = update_data.size_label
        if update_data.size_price is not None:
            cart_item.size_price = update_data.size_price
        if update_data.temperature is not None:
            cart_item.temperature = update_data.temperature
        if update_data.addons is not None:
            cart_item.addons = [addon.model_dump() for addon in update_data.addons]
        if update_data.special_instructions is not None:
            cart_item.special_instructions = update_data.special_instructions

        # Recalculate total
        cart_item.item_total = GroupCartItem.calculate_item_total(
            base_price=cart_item.base_price,
            size_price=cart_item.size_price or 0,
            addons=cart_item.addons or [],
            quantity=cart_item.quantity
        )

        await self.db.commit()
        await self.db.refresh(cart_item)

        logger.info(f"Updated cart item {item_id}")

        # Emit WebSocket event for real-time updates
        if WEBSOCKET_AVAILABLE:
            try:
                await broadcast_group_cart_item_updated(
                    table_id=group_session.table_id,
                    group_id=group_session.group_id,
                    item=cart_item.to_dict()
                )
                logger.info(f"[GROUP_CART] Emitted WebSocket event: item_updated for group {group_session.group_id}")
            except Exception as e:
                logger.warning(f"[GROUP_CART] Failed to emit WebSocket event: {str(e)}")

        return cart_item

    async def remove_item(self, item_id: int) -> bool:
        """Remove an item from the group cart"""
        cart_item = await self.get_item_by_id(item_id)
        if not cart_item:
            raise GroupCartNotFoundError(f"Cart item {item_id} not found")

        # Check if group is still active
        group_session = await self._get_group_session(cart_item.group_session_id)
        if group_session.status != GroupSessionStatus.ACTIVE:
            raise GroupSessionNotActiveError("Cannot remove items from inactive group")

        await self.db.delete(cart_item)
        await self.db.commit()

        logger.info(f"Removed cart item {item_id}")

        # Emit WebSocket event for real-time updates
        if WEBSOCKET_AVAILABLE:
            try:
                await broadcast_group_cart_item_removed(
                    table_id=group_session.table_id,
                    group_id=group_session.group_id,
                    item_id=item_id
                )
                logger.info(f"[GROUP_CART] Emitted WebSocket event: item_removed for group {group_session.group_id}")
            except Exception as e:
                logger.warning(f"[GROUP_CART] Failed to emit WebSocket event: {str(e)}")

        return True

    async def get_item_by_id(self, item_id: int) -> Optional[GroupCartItem]:
        """Get a cart item by ID"""
        result = await self.db.execute(
            select(GroupCartItem)
            .where(GroupCartItem.id == item_id)
        )
        return result.scalar_one_or_none()

    async def get_cart(self, group_session_id: int) -> dict:
        """Get all items in a group cart with totals"""
        # Get all items
        result = await self.db.execute(
            select(GroupCartItem)
            .where(GroupCartItem.group_session_id == group_session_id)
            .order_by(GroupCartItem.created_at.asc())
        )
        items = result.scalars().all()

        # Calculate totals
        subtotal = sum(item.item_total for item in items)
        tax = 0
        total = subtotal + tax

        # Count unique participants
        participant_ids = set(item.participant_id for item in items if item.participant_id)

        return {
            "group_session_id": group_session_id,
            "items": [item.to_dict() for item in items],
            "subtotal": subtotal,
            "subtotal_in_pesos": subtotal / 100,
            "tax": tax,
            "tax_in_pesos": tax / 100,
            "total": total,
            "total_in_pesos": total / 100,
            "item_count": sum(item.quantity for item in items),
            "participant_count": len(participant_ids),
        }

    async def clear_cart(self, group_session_id: int) -> int:
        """Clear all items from a group cart"""
        # Check if group is active
        group_session = await self._get_group_session(group_session_id)
        if not group_session:
            raise GroupSessionNotFoundError(f"Group session {group_session_id} not found")

        if group_session.status != GroupSessionStatus.ACTIVE:
            raise GroupSessionNotActiveError("Cannot clear cart for inactive group")

        # Delete all items
        result = await self.db.execute(
            select(GroupCartItem)
            .where(GroupCartItem.group_session_id == group_session_id)
        )
        items = result.scalars().all()

        count = len(items)
        for item in items:
            await self.db.delete(item)

        await self.db.commit()

        logger.info(f"Cleared {count} items from group {group_session_id} cart")

        # Emit WebSocket event for real-time updates
        if WEBSOCKET_AVAILABLE:
            try:
                await broadcast_group_cart_cleared(
                    table_id=group_session.table_id,
                    group_id=group_session.group_id,
                    items_removed=count
                )
                logger.info(f"[GROUP_CART] Emitted WebSocket event: cart_cleared for group {group_session.group_id}")
            except Exception as e:
                logger.warning(f"[GROUP_CART] Failed to emit WebSocket event: {str(e)}")

        return count

    async def get_participant_items(
        self,
        group_session_id: int,
        participant_id: int
    ) -> List[GroupCartItem]:
        """Get items added by a specific participant"""
        result = await self.db.execute(
            select(GroupCartItem)
            .where(and_(
                GroupCartItem.group_session_id == group_session_id,
                GroupCartItem.participant_id == participant_id
            ))
            .order_by(GroupCartItem.created_at.asc())
        )
        return result.scalars().all()

    async def _get_group_session(self, group_session_id: int) -> Optional[GroupSession]:
        """Get group session by ID"""
        result = await self.db.execute(
            select(GroupSession).where(GroupSession.id == group_session_id)
        )
        return result.scalar_one_or_none()

    async def _get_menu_item(self, menu_item_id: int) -> Optional[MenuItem]:
        """Get menu item by ID"""
        result = await self.db.execute(
            select(MenuItem).where(MenuItem.id == menu_item_id)
        )
        return result.scalar_one_or_none()
