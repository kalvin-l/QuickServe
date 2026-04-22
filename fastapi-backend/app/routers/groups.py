"""
Groups Router
API endpoints for group ordering management
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.services.group_service import GroupService, GroupAlreadyExistsError, GroupNotFoundError
from app.services.group_cart_service import (
    GroupCartService,
    GroupCartNotFoundError,
    GroupSessionNotFoundError,
    GroupSessionNotActiveError,
    MenuItemNotFoundError,
)
from app.schemas.group import (
    GroupCreateRequest,
    GroupResponse,
    GroupDetailResponse,
    GroupUpdateRequest,
    GroupCloseRequest,
    GroupStatusUpdateRequest,
    GroupStats,
)
from app.schemas.group_cart import (
    GroupCartItemCreate,
    GroupCartItemUpdate,
    GroupCartItemResponse,
    GroupCartResponse,
    GroupCheckoutRequest,
)

router = APIRouter(tags=["groups"])


async def verify_host_permission(
    group_id: str,
    session_id: str,
    participant_id: Optional[int] = None,
    db: AsyncSession = None
) -> tuple:
    """
    Verify that the user is the host of the group.

    CORRECT: Compare participant_id (unique per device) not session_id (shared by all devices at table)

    Args:
        group_id: Group ID (UUID)
        session_id: Session ID (deprecated for permission check, kept for backward compatibility)
        participant_id: Participant ID (preferred for permission verification)
        db: Database session

    Returns:
        tuple: (group_session, is_host)

    Raises:
        HTTPException: If group not found or user is not the host
    """
    group_service = GroupService(db)
    group = await group_service.get_group_by_id(group_id)

    if not group:
        raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

    # CORRECT: Use participant_id for permission check if provided
    # participant_id is unique per device, while session_id is shared by all devices at the table
    if participant_id is not None:
        is_host = group.host_participant_id == participant_id
        logger.info(f"[GROUPS] Permission check via participant_id: group_id={group_id}, host_participant_id={group.host_participant_id}, request_participant_id={participant_id}, match={is_host}")
    else:
        # Fallback to session_id comparison (deprecated, less reliable)
        is_host = group.host_session_id == session_id
        logger.info(f"[GROUPS] Permission check via session_id (DEPRECATED): group_id={group_id}, host_session_id='{group.host_session_id}', request_session_id='{session_id}', match={is_host}")

    if not is_host:
        logger.warning(f"[GROUPS] Non-host attempted to modify group cart: group_id={group_id}, participant_id={participant_id}, session_id={session_id}, host_participant_id={group.host_participant_id}")
        raise HTTPException(
            status_code=403,
            detail="Only the host can perform this action in host-pays-all mode"
        )

    return group, is_host


def group_to_dict(group, member_count: int = 0, include_members: bool = False):
    """Convert GroupSession to dictionary without triggering lazy loads

    This helper function builds the response dict directly to avoid
    SQLAlchemy lazy loading issues in async contexts.
    """
    return {
        "id": group.id,
        "group_id": group.group_id,
        "table_id": group.table_id,
        "host_session_id": group.host_session_id,
        "host_participant_id": group.host_participant_id,
        "host_name": group.host_name,
        "payment_type": group.payment_type.value if hasattr(group.payment_type, 'value') else group.payment_type,
        "auto_approve_joins": group.auto_approve_joins,
        "max_members": group.max_members,
        "status": group.status.value if hasattr(group.status, 'value') else group.status,
        "member_count": member_count,
        "share_code": group.share_code,
        "share_link": f"/group/{group.share_code}" if group.share_code else None,
        "created_at": group.created_at.isoformat() if group.created_at else None,
        "closed_at": group.closed_at.isoformat() if group.closed_at else None,
        "paid_at": group.paid_at.isoformat() if group.paid_at else None,
        "metadata": group.group_metadata or {},
        "is_active": group.is_active,
        **({"members": [member_to_dict(m) for m in group.members]} if include_members else {})
    }


def member_to_dict(member):
    """Convert GroupMember to dictionary without triggering lazy loads"""
    return {
        "id": member.id,
        "member_id": member.member_id,
        "session_id": member.session_id,
        "participant_id": member.participant_id,
        "name": member.name,
        "has_joined": member.has_joined,
        "has_paid": member.has_paid,
        "order_subtotal": member.order_subtotal,
        "payment_method": member.payment_method,
        "joined_at": member.joined_at.isoformat() if member.joined_at else None,
        "paid_at": member.paid_at.isoformat() if member.paid_at else None,
        "metadata": member.member_metadata or {},
        "is_active": member.is_active
    }


@router.post("/create", status_code=201, response_model=GroupResponse)
async def create_group(
    request_data: GroupCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new group ordering session.

    This endpoint is called when a customer wants to start a group order at their table.

    Request body:
    - **table_id**: Table ID
    - **session_id**: Host's session ID (from table session)
    - **host_name**: Optional host name
    - **payment_type**: Payment mode (host_pays_all, individual, or hybrid)
    - **auto_approve_joins**: Auto-approve join requests (default: false)
    - **max_members**: Maximum number of members (default: 6, max: 20)

    Returns the created group information with share link.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Creating group: table_id={request_data.table_id}, session_id={request_data.session_id}")

    service = GroupService(db)

    try:
        group = await service.create_group(
            table_id=request_data.table_id,
            session_id=request_data.session_id,
            host_name=request_data.host_name,
            payment_type=request_data.payment_type,
            auto_approve_joins=request_data.auto_approve_joins,
            max_members=request_data.max_members,
            participant_id=request_data.participant_id
        )

        # Build response dict directly (member_count=1 for host)
        group_dict = group_to_dict(group, member_count=1)

        logger.info(f"Group created successfully: {group.group_id}")
        return group_dict

    except GroupAlreadyExistsError as e:
        logger.error(f"Group already exists: {str(e)}")
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        logger.error(f"Value error: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get group details by group_id (UUID).

    Returns complete group information including all members.
    """
    service = GroupService(db)

    group = await service.get_group_by_id(group_id)

    if not group:
        raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

    # Build response with members
    member_count = len(group.members) if group.members else 0
    return group_to_dict(group, member_count=member_count, include_members=True)


@router.get("/share-code/{share_code}", response_model=GroupDetailResponse)
async def get_group_by_share_code(
    share_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get group details by share code.

    Used when someone clicks a share link or enters a share code.
    """
    service = GroupService(db)

    group = await service.get_group_by_share_code(share_code)

    if not group:
        raise HTTPException(status_code=404, detail=f"Group with share code '{share_code}' not found")

    # Build response with members
    member_count = len(group.members) if group.members else 0
    return group_to_dict(group, member_count=member_count, include_members=True)


@router.get("/table/{table_id}/active")
async def get_active_group_by_table(
    table_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the active group for a specific table.

    Returns the group if one exists, null otherwise.
    Returns 200 OK always to avoid console errors during polling.
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[DEBUG] Fetching active group for table_id={table_id}")

    service = GroupService(db)

    group = await service.get_active_group_by_table(table_id)

    if not group:
        logger.info(f"[DEBUG] No active group found for table_id={table_id}")
        return {"group": None}

    logger.info(f"[DEBUG] Found active group: group_id={group.group_id}, status={group.status}, is_active={group.is_active}, table_id={group.table_id}")

    # Build response with members - wrap in "group" key for consistent response structure
    member_count = len(group.members) if group.members else 0
    return {"group": group_to_dict(group, member_count=member_count, include_members=True)}


@router.patch("/{group_id}/settings", response_model=GroupResponse)
async def update_group_settings(
    group_id: str,
    request_data: GroupUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Update group settings (host action).

    Allows host to modify:
    - auto_approve_joins: Toggle auto-approve join requests
    - max_members: Update maximum members
    """
    service = GroupService(db)

    try:
        group = await service.update_group_settings(
            group_id=group_id,
            auto_approve_joins=request_data.auto_approve_joins,
            max_members=request_data.max_members
        )

        member_count = len(group.members) if group.members else 0
        return group_to_dict(group, member_count=member_count)

    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{group_id}/close", response_model=GroupResponse)
async def close_group(
    group_id: str,
    request_data: GroupCloseRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Close a group (no new members allowed).

    Host closes the group when ready to checkout. Late joiners will be declined.
    """
    service = GroupService(db)

    try:
        group = await service.close_group(
            group_id=group_id,
            reason=request_data.reason
        )

        member_count = len(group.members) if group.members else 0
        return group_to_dict(group, member_count=member_count)

    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{group_id}/status", response_model=GroupResponse)
async def update_group_status(
    group_id: str,
    request_data: GroupStatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Update group status (admin or internal use).

    Allows transitioning between statuses:
    - active: Open for ordering and joining
    - closed: No new members, but ordering open
    - paid: Payment completed
    - cancelled: Group was cancelled
    """
    service = GroupService(db)

    try:
        group = await service.update_group_status(
            group_id=group_id,
            status=request_data.status
        )

        member_count = len(group.members) if group.members else 0
        return group_to_dict(group, member_count=member_count)

    except GroupNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/active/all", response_model=List[GroupDetailResponse])
async def get_all_active_groups(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all active groups.

    Used for admin dashboard.
    """
    service = GroupService(db)
    groups = await service.get_all_active_groups()

    result = []
    for group in groups:
        member_count = len(group.members) if group.members else 0
        result.append(group_to_dict(group, member_count=member_count, include_members=True))

    return result


@router.get("/statistics/summary", response_model=GroupStats)
async def get_group_statistics(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get group statistics for analytics.

    Optional date range filtering (ISO format strings).
    """
    service = GroupService(db)

    # Parse dates if provided
    start_dt = datetime.fromisoformat(start_date) if start_date else None
    end_dt = datetime.fromisoformat(end_date) if end_date else None

    stats = await service.get_group_statistics(start_dt, end_dt)
    return stats


# ============== Group Cart Endpoints (for host-pays-all mode) ==============

@router.get("/{group_id}/cart")
async def get_group_cart(
    group_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all items in the group's shared cart.

    Used in host-pays-all mode where all participants add to a shared cart.
    """
    import logging
    logger = logging.getLogger(__name__)

    # First get the group to get the internal ID
    group_service = GroupService(db)
    group = await group_service.get_group_by_id(group_id)

    if not group:
        raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

    cart_service = GroupCartService(db)
    cart = await cart_service.get_cart(group.id)

    return cart


@router.post("/{group_id}/cart/items", status_code=201)
async def add_item_to_group_cart(
    group_id: str,
    item_data: GroupCartItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Add an item to the group's shared cart.

    Any participant in the group can add items.
    """
    import logging
    logger = logging.getLogger(__name__)

    # Get the group
    group_service = GroupService(db)
    group = await group_service.get_group_by_id(group_id)

    if not group:
        raise HTTPException(status_code=404, detail=f"Group {group_id} not found")

    # Log incoming request details for debugging
    logger.info(f"[GROUP_CART] Adding item to group {group_id} (id={group.id}): menu_item_id={item_data.menu_item_id}, participant_id={item_data.participant_id}, participant_name={item_data.participant_name}")

    # Validate participant exists if provided
    if item_data.participant_id:
        from app.models.group_session import GroupMember
        result = await db.execute(
            select(GroupMember).where(GroupMember.id == item_data.participant_id)
        )
        member = result.scalar_one_or_none()
        if not member:
            logger.warning(f"[GROUP_CART] Participant {item_data.participant_id} not found in group {group_id}, will add item without participant association")
        else:
            logger.info(f"[GROUP_CART] Participant validated: id={member.id}, name={member.name}")
    else:
        logger.info(f"[GROUP_CART] No participant_id provided, item will be added without participant association")

    cart_service = GroupCartService(db)

    try:
        cart_item = await cart_service.add_item(group.id, item_data)
        logger.info(f"[GROUP_CART] Item created successfully: id={cart_item.id}, item_name={cart_item.item_name}, item_total={cart_item.item_total}")
        return cart_item.to_dict()

    except GroupSessionNotActiveError as e:
        logger.error(f"[GROUP_CART] Group not active: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except MenuItemNotFoundError as e:
        logger.error(f"[GROUP_CART] Menu item not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[GROUP_CART] Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.patch("/{group_id}/cart/items/{item_id}")
async def update_group_cart_item(
    group_id: str,
    item_id: int,
    update_data: GroupCartItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an item in the group's shared cart.

    Can update quantity, size, addons, etc.
    Only the host can update items in host-pays-all mode.
    """
    # Verify host permission (prefer participant_id over session_id)
    await verify_host_permission(group_id, update_data.session_id, update_data.participant_id, db)

    cart_service = GroupCartService(db)

    try:
        cart_item = await cart_service.update_item(item_id, update_data)
        return cart_item.to_dict()

    except GroupCartNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GroupSessionNotActiveError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{group_id}/cart/items/{item_id}")
async def remove_item_from_group_cart(
    group_id: str,
    item_id: int,
    session_id: str = Query(..., description="Session ID for permission verification"),
    participant_id: Optional[int] = Query(None, description="Participant ID for permission verification (preferred)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove an item from the group's shared cart.
    Only the host can remove items in host-pays-all mode.
    """
    # Verify host permission (prefer participant_id over session_id)
    await verify_host_permission(group_id, session_id, participant_id, db)

    cart_service = GroupCartService(db)

    try:
        await cart_service.remove_item(item_id)
        return {"success": True, "message": "Item removed from cart"}

    except GroupCartNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GroupSessionNotActiveError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{group_id}/cart/clear")
async def clear_group_cart(
    group_id: str,
    session_id: str = Query(..., description="Session ID for permission verification"),
    participant_id: Optional[int] = Query(None, description="Participant ID for permission verification (preferred)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Clear all items from the group's shared cart.
    Only the host can clear the cart in host-pays-all mode.
    """
    # Verify host permission (prefer participant_id over session_id)
    group = await verify_host_permission(group_id, session_id, participant_id, db)
    group = group[0]  # Extract from tuple

    cart_service = GroupCartService(db)

    try:
        count = await cart_service.clear_cart(group.id)
        return {"success": True, "items_removed": count}

    except GroupSessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except GroupSessionNotActiveError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{group_id}/checkout")
async def checkout_group_cart(
    group_id: str,
    checkout_data: GroupCheckoutRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Checkout the group cart (host action).

    Creates an order from all items in the group cart.
    Only the host should call this endpoint.
    """
    import logging
    from app.services.order_service import OrderService
    from app.services.payment_service import PaymentService
    from app.models.order import OrderType
    from app.models.payment import PaymentMethod
    from app.websocket.connection_manager import manager

    logger = logging.getLogger(__name__)

    # Initialize GroupService for this endpoint
    group_service = GroupService(db)

    # Verify host permission (prefer participant_id over session_id)
    group = await verify_host_permission(group_id, checkout_data.session_id, checkout_data.participant_id, db)
    group = group[0]  # Extract from tuple

    # DEBUG: Log group and cart info
    logger.info(f"[GROUPS CHECKOUT] Group checkout requested: group_id={group_id}, group.id={group.id}, table_id={group.table_id}")

    # Get cart items
    cart_service = GroupCartService(db)
    cart = await cart_service.get_cart(group.id)

    # DEBUG: Log cart info
    logger.info(f"[GROUPS CHECKOUT] Cart retrieved: items_count={len(cart.get('items', []))}, cart_keys={list(cart.keys())}")

    if not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Convert cart items to order items
    from app.schemas.order import OrderCreate, OrderItemCreate, OrderAddonCreate

    order_items = []
    for cart_item in cart["items"]:
        addons = []
        if cart_item.get("addons"):
            for addon in cart_item["addons"]:
                addons.append(OrderAddonCreate(
                    id=addon["id"],
                    name=addon["name"],
                    price=addon["price"],
                    quantity=addon.get("quantity", 1)
                ))

        order_items.append(OrderItemCreate(
            menu_item_id=cart_item["menu_item_id"],
            quantity=cart_item["quantity"],
            size_key=cart_item.get("size_key"),
            size_label=cart_item.get("size_label"),
            size_price=cart_item.get("size_price", 0),
            temperature=cart_item.get("temperature"),
            addons=addons,
            special_instructions=cart_item.get("special_instructions"),
        ))

    # Create order
    order_data = OrderCreate(
        table_id=group.table_id,
        order_type=OrderType.GROUP_HOST,
        group_session_id=group.id,
        customer_name=checkout_data.customer_name or group.host_name,
        items=order_items,
        notes=checkout_data.notes,
        payment_method=PaymentMethod(checkout_data.payment_method),
    )

    order_service = OrderService(db)
    payment_service = PaymentService(db)

    try:
        # Create order
        order = await order_service.create_order(order_data)

        # Create and process payment
        payment = await payment_service.create_payment(
            order_id=order.id,
            method=PaymentMethod(checkout_data.payment_method),
            amount=order.total
        )
        payment = await payment_service.process_payment(payment.id)

        # Generate receipt if successful
        if payment.status.value == "completed":
            await payment_service.generate_receipt(payment.id)

        # Clear the cart
        await cart_service.clear_cart(group.id)

        # Close the group
        await group_service.close_group(group_id, reason="checkout_completed")

        # Refresh order
        order = await order_service.get_order_by_id(order.id)

        # Broadcast new order
        await manager.broadcast_new_order(
            table_id=order.table_id,
            order_data=order.to_dict()
        )

        return order.to_dict()

    except Exception as e:
        logger.error(f"Error during group checkout: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Checkout failed: {str(e)}")
