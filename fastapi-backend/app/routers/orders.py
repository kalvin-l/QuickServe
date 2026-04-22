"""
Orders Router - API endpoints for order operations.
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.order import OrderStatus, OrderType
from app.models.payment import PaymentMethod
from app.schemas.order import (
    OrderCreate,
    OrderResponse,
    OrderStatusUpdate,
    OrderListResponse,
    CalculateTotalRequest,
    CalculateTotalResponse,
)
from app.services.order_service import (
    OrderService,
    OrderNotFoundError,
    InvalidOrderStatusTransition,
    MenuItemNotFoundError,
)
from app.services.payment_service import (
    PaymentService,
    PaymentProcessingError,
)
from app.websocket.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/orders", tags=["Orders"])


def order_to_response(order) -> dict:
    """Convert Order model to response dict"""
    return order.to_dict(include_items=True, include_payment=True)


@router.post("", status_code=201)
async def create_order(
    order_data: OrderCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new order with items.

    - Validates menu items exist
    - Calculates totals
    - Creates order and items
    - Creates and processes payment
    - Broadcasts via WebSocket
    """
    order_service = OrderService(db)
    payment_service = PaymentService(db)

    try:
        # Create the order
        order = await order_service.create_order(order_data)

        # Create payment
        payment = await payment_service.create_payment(
            order_id=order.id,
            method=order_data.payment_method,
            amount=order.total
        )

        # For cash payments, don't auto-process - admin needs to confirm receiving money
        # For other payment methods, process immediately (simulated)
        if order_data.payment_method != PaymentMethod.CASH:
            payment = await payment_service.process_payment(payment.id)

            # Generate receipt if payment successful
            if payment.status.value == "completed":
                await payment_service.generate_receipt(payment.id)

        # Deduct inventory based on menu item recipes
        try:
            deduction_result = await order_service.deduct_inventory_for_order(order.id)
            if deduction_result.get('insufficient_items'):
                logger.warning(f"Order {order.order_number} had insufficient items: {deduction_result['insufficient_items']}")
        except Exception as e:
            logger.error(f"Failed to deduct inventory for order {order.order_number}: {str(e)}", exc_info=True)
            # Don't fail the order if inventory deduction fails

        # Refresh order to get payment relationship
        order = await order_service.get_order_by_id(order.id)

        # Broadcast new order via WebSocket
        await manager.broadcast_new_order(
            table_id=order.table_id,
            order_data=order.to_dict()
        )

        return order_to_response(order)

    except MenuItemNotFoundError as e:
        logger.error(f"Menu item not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except PaymentProcessingError as e:
        logger.error(f"Payment processing error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating order: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("")
async def get_orders(
    status: Optional[str] = Query(None, description="Filter by status"),
    order_type: Optional[str] = Query(None, description="Filter by order type"),
    table_id: Optional[int] = Query(None, description="Filter by table ID"),
    group_session_id: Optional[int] = Query(None, description="Filter by group session ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """Get orders with optional filters and pagination"""
    order_service = OrderService(db)

    # Convert string to enum if provided
    status_enum = None
    if status:
        try:
            status_enum = OrderStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    order_type_enum = None
    if order_type:
        try:
            order_type_enum = OrderType(order_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid order type: {order_type}")

    result = await order_service.get_orders(
        status=status_enum,
        order_type=order_type_enum,
        table_id=table_id,
        group_session_id=group_session_id,
        page=page,
        page_size=page_size
    )

    return {
        "items": [order_to_response(order) for order in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "pages": result["pages"]
    }


@router.get("/kitchen/queue")
async def get_kitchen_queue(
    db: AsyncSession = Depends(get_db)
):
    """
    Get orders in the kitchen queue (pending, confirmed, preparing, ready).

    Orders are sorted:
    - Confirmed orders: newest first (at top for barista to see quickly)
    - Pending orders: newest first
    - Preparing orders: oldest first
    - Ready orders: oldest first
    """
    order_service = OrderService(db)
    orders = await order_service.get_kitchen_queue()

    return {
        "orders": [order_to_response(order) for order in orders],
        "count": len(orders)
    }


@router.get("/group/{group_session_id}")
async def get_group_orders(
    group_session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all orders for a specific group session"""
    order_service = OrderService(db)
    orders = await order_service.get_group_orders(group_session_id)

    return {
        "group_session_id": group_session_id,
        "orders": [order_to_response(order) for order in orders],
        "count": len(orders),
        "total": sum(order.total for order in orders),
        "total_in_pesos": sum(order.total for order in orders) / 100
    }


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a single order by ID"""
    order_service = OrderService(db)
    order = await order_service.get_order_by_id(order_id)

    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    return order_to_response(order)


@router.get("/number/{order_number}")
async def get_order_by_number(
    order_number: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a single order by order number"""
    order_service = OrderService(db)
    order = await order_service.get_order_by_number(order_number)

    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_number} not found")

    return order_to_response(order)


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update order status.

    Valid transitions:
    - pending -> confirmed, cancelled
    - confirmed -> preparing, cancelled
    - preparing -> ready, cancelled
    - ready -> served, cancelled
    """
    order_service = OrderService(db)

    try:
        order = await order_service.update_order_status(order_id, status_data.status)

        # Get session_id (UUID) for targeting specific device
        session_id = None
        if order.table_session:
            session_id = order.table_session.session_id

        # Broadcast status change via WebSocket
        await manager.broadcast_order_status_changed(
            table_id=order.table_id,
            order_id=order.id,
            order_number=order.order_number,
            old_status=None,  # Could track this if needed
            new_status=order.status.value,
            order_data=order.to_dict(),
            session_id=session_id
        )

        return order_to_response(order)

    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidOrderStatusTransition as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating order status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{order_id}/cancel")
async def cancel_order(
    order_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Cancel an order"""
    order_service = OrderService(db)

    try:
        order = await order_service.cancel_order(order_id)

        # Get session_id (UUID) for targeting specific device
        session_id = None
        if order.table_session:
            session_id = order.table_session.session_id

        # Broadcast cancellation via WebSocket
        await manager.broadcast_order_status_changed(
            table_id=order.table_id,
            order_id=order.id,
            order_number=order.order_number,
            old_status=None,
            new_status="cancelled",
            order_data=order.to_dict(),
            session_id=session_id
        )

        return order_to_response(order)

    except OrderNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidOrderStatusTransition as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/calculate-total")
async def calculate_order_total(
    request_data: CalculateTotalRequest,
    db: AsyncSession = Depends(get_db)
):
    """Calculate order total before submission (preview)"""
    order_service = OrderService(db)
    result = await order_service.calculate_order_total(request_data.items)

    return result
