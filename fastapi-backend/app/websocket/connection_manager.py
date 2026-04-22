"""
WebSocket Connection Manager
Manages WebSocket connections for real-time updates
"""

from fastapi import WebSocket
from typing import Dict, List, Optional
from datetime import datetime
import json
from app.utils.timezone_config import get_utc_now


# Group Cart Event Types
GROUP_CART_ITEM_ADDED = "group_cart_item_added"
GROUP_CART_ITEM_UPDATED = "group_cart_item_updated"
GROUP_CART_ITEM_REMOVED = "group_cart_item_removed"
GROUP_CART_CLEARED = "group_cart_cleared"


class ConnectionManager:
    """
    Manage WebSocket connections for real-time updates.

    For Raspberry Pi (single server):
    - No Redis needed (you have one server)
    - Built-in FastAPI WebSocket is perfect
    - Handles ~50-100 connections (enough for coffee shop)

    Updated: Now supports multiple connections per table (one per session/device)
    """

    def __init__(self):
        # Store connections: {table_id: [{"websocket": WebSocket, "session_id": str}, ...]}
        # Multiple devices can connect to the same table, each with their own session_id
        self.active_connections: Dict[int, List[dict]] = {}

        # Store admin connections for dashboard
        self.admin_connections: List[WebSocket] = []

        # Store kitchen connections for kitchen display
        self.kitchen_connections: List[WebSocket] = []

        # Connection metadata for debugging
        self.connection_metadata: Dict[str, dict] = {}

    async def connect_table(self, websocket: WebSocket, table_id: int, session_id: str = None):
        """
        Customer connects from their table.

        Args:
            websocket: WebSocket connection instance
            table_id: ID of the table
            session_id: Unique session identifier (to support multiple devices per table)
        """
        await websocket.accept()

        # Initialize list if not exists
        if table_id not in self.active_connections:
            self.active_connections[table_id] = []

        # Add connection with session_id
        connection_info = {
            "websocket": websocket,
            "session_id": session_id,
            "connected_at": get_utc_now().isoformat()
        }
        self.active_connections[table_id].append(connection_info)

        # Store connection metadata
        conn_id = f"table_{table_id}_{session_id}"
        self.connection_metadata[conn_id] = {
            "type": "table",
            "table_id": table_id,
            "session_id": session_id,
            "connected_at": get_utc_now().isoformat()
        }

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": f"Connected to Table {table_id}",
            "table_id": table_id,
            "session_id": session_id
        })

    async def connect_admin(self, websocket: WebSocket):
        """
        Admin dashboard connects.

        Args:
            websocket: WebSocket connection instance
        """
        await websocket.accept()
        self.admin_connections.append(websocket)

        # Store connection metadata
        conn_id = f"admin_{len(self.admin_connections)}"
        self.connection_metadata[conn_id] = {
            "type": "admin",
            "connected_at": get_utc_now().isoformat()
        }

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to Admin Dashboard",
            "active_connections": sum(len(conns) for conns in self.active_connections.values())
        })

    async def connect_kitchen(self, websocket: WebSocket):
        """
        Kitchen display connects.

        Args:
            websocket: WebSocket connection instance
        """
        await websocket.accept()
        self.kitchen_connections.append(websocket)

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to Kitchen Display"
        })

    def disconnect_table(self, table_id: int, session_id: str = None):
        """
        Customer disconnects.

        Args:
            table_id: ID of the table
            session_id: Session identifier (to remove specific connection)
        """
        if table_id in self.active_connections:
            if session_id:
                # Remove specific session
                self.active_connections[table_id] = [
                    conn for conn in self.active_connections[table_id]
                    if conn.get("session_id") != session_id
                ]
                # Clean up empty lists
                if not self.active_connections[table_id]:
                    del self.active_connections[table_id]
            else:
                # Remove all connections for this table (backwards compatibility)
                del self.active_connections[table_id]

        # Remove metadata
        conn_id = f"table_{table_id}_{session_id}"
        self.connection_metadata.pop(conn_id, None)

    def disconnect_admin(self, websocket: WebSocket):
        """
        Admin disconnects.

        Args:
            websocket: WebSocket connection instance
        """
        if websocket in self.admin_connections:
            self.admin_connections.remove(websocket)

    def disconnect_kitchen(self, websocket: WebSocket):
        """
        Kitchen display disconnects.

        Args:
            websocket: WebSocket connection instance
        """
        if websocket in self.kitchen_connections:
            self.kitchen_connections.remove(websocket)

    async def send_to_table(self, table_id: int, message: dict):
        """
        Send message to ALL connections at a specific table.

        Args:
            table_id: ID of the table
            message: Message dictionary to send
        """
        if table_id in self.active_connections:
            dead_connections = []
            for conn_info in self.active_connections[table_id]:
                websocket = conn_info["websocket"]
                try:
                    await websocket.send_json(message)
                except Exception:
                    dead_connections.append(conn_info)

            # Clean up dead connections
            for dead_conn in dead_connections:
                self.active_connections[table_id].remove(dead_conn)

    async def send_to_session(self, table_id: int, session_id: str, message: dict):
        """
        Send message to a SPECIFIC session at a table.

        Args:
            table_id: ID of the table
            session_id: Session identifier
            message: Message dictionary to send
        """
        if table_id in self.active_connections:
            for conn_info in self.active_connections[table_id]:
                if conn_info.get("session_id") == session_id:
                    try:
                        await conn_info["websocket"].send_json(message)
                    except Exception:
                        # Connection is dead, remove it
                        self.active_connections[table_id].remove(conn_info)
                    break

    async def broadcast_to_admins(self, message: dict):
        """
        Send message to all admin dashboards.

        Args:
            message: Message dictionary to send
        """
        dead_connections = []

        for connection in self.admin_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect_admin(conn)

    async def broadcast_to_kitchen(self, message: dict):
        """
        Send message to all kitchen displays.

        Args:
            message: Message dictionary to send
        """
        dead_connections = []

        for connection in self.kitchen_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect_kitchen(conn)

    async def broadcast_new_order(self, table_id: int, order_data: dict):
        """
        Broadcast: New order placed.

        Sends to:
        - Kitchen (for preparation)
        - Admin dashboard (for tracking)
        - Customer's table (confirmation)

        Args:
            table_id: ID of the table that placed the order
            order_data: Order information
        """
        message = {
            "type": "new_order",
            "table_id": table_id,
            "order": order_data,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to table (confirmation)
        await self.send_to_table(table_id, message)

        # Send to admins
        await self.broadcast_to_admins(message)

        # Send to kitchen
        await self.broadcast_to_kitchen(message)

    async def broadcast_order_ready(self, table_id: int, order_id: int, order_data: dict = None):
        """
        Broadcast: Order is ready for pickup/delivery.

        Args:
            table_id: ID of the table
            order_id: ID of the order
            order_data: Optional order information
        """
        message = {
            "type": "order_ready",
            "table_id": table_id,
            "order_id": order_id,
            "order": order_data,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to table
        await self.send_to_table(table_id, message)

        # Send to admins
        await self.broadcast_to_admins(message)

    async def broadcast_order_status_changed(
        self,
        table_id: int,
        order_id: int,
        order_number: str = None,
        old_status: str = None,
        new_status: str = None,
        order_data: dict = None,
        session_id: str = None
    ):
        """
        Broadcast: Order status changed.

        Args:
            table_id: ID of the table
            order_id: ID of the order
            order_number: Order number (optional)
            old_status: Previous status
            new_status: New status
            order_data: Full order data (optional)
            session_id: Session ID to target specific device (optional)
        """
        message = {
            "type": "order_status_changed",
            "table_id": table_id,
            "order_id": order_id,
            "order_number": order_number,
            "old_status": old_status,
            "new_status": new_status,
            "order": order_data,
            "session_id": session_id,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to specific session if provided, otherwise send to all at table
        if table_id:
            if session_id:
                await self.send_to_session(table_id, session_id, message)
            else:
                await self.send_to_table(table_id, message)

        # Send to admins
        await self.broadcast_to_admins(message)

        # Send to kitchen
        await self.broadcast_to_kitchen(message)

    async def broadcast_session_started(self, table_id: int, session_data: dict):
        """
        Broadcast: New session started (customer seated).

        Args:
            table_id: ID of the table
            session_data: Session information
        """
        message = {
            "type": "session_started",
            "table_id": table_id,
            "session": session_data,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to admins
        await self.broadcast_to_admins(message)

    async def broadcast_session_ended(self, table_id: int, session_data: dict):
        """
        Broadcast: Session ended (customer left).

        Args:
            table_id: ID of the table
            session_data: Session information
        """
        message = {
            "type": "session_ended",
            "table_id": table_id,
            "session": session_data,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to admins
        await self.broadcast_to_admins(message)

    async def broadcast_table_status_changed(
        self,
        table_id: int,
        old_status: str,
        new_status: str,
        occupied: int
    ):
        """
        Broadcast: Table status changed based on occupancy.

        Args:
            table_id: ID of the table
            old_status: Previous status
            new_status: New status
            occupied: Current occupied count
        """
        message = {
            "type": "table_status_changed",
            "table_id": table_id,
            "old_status": old_status,
            "new_status": new_status,
            "occupied": occupied,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to admins
        await self.broadcast_to_admins(message)

    # =========================
    # Phase 2: Session Pause/Resume Broadcast Methods
    # =========================

    async def broadcast_session_pausing(
        self,
        session_id: int,
        grace_period_end: str,
        reason: str = "inactivity"
    ):
        """
        Broadcast: Session entering grace period (PAUSING state).

        Sends warning to client that session will pause soon.

        Args:
            session_id: ID of the session
            grace_period_end: ISO timestamp when grace period ends
            reason: Reason for pause
        """
        message = {
            "type": "session_pausing",
            "data": {
                "session_id": session_id,
                "grace_period_end": grace_period_end,
                "reason": reason,
                "can_keep_alive": True
            },
            "timestamp": get_utc_now().isoformat()
        }

        # Send to admins
        await self.broadcast_to_admins(message)

    async def broadcast_session_resumed(
        self,
        session_id: int,
        table_id: int,
        cart_restored: bool = False
    ):
        """
        Broadcast: Session resumed from PAUSED state.

        Args:
            session_id: ID of the session
            table_id: ID of the table
            cart_restored: Whether cart was restored
        """
        message = {
            "type": "session_resumed",
            "data": {
                "session_id": session_id,
                "table_id": table_id,
                "cart_restored": cart_restored
            },
            "timestamp": get_utc_now().isoformat()
        }

        # Send to table
        await self.send_to_table(table_id, message)

        # Send to admins
        await self.broadcast_to_admins(message)

    async def broadcast_session_end_warning(
        self,
        session_id: int,
        table_id: int,
        grace_period_seconds: int,
        reason: str = "inactivity"
    ):
        """
        Broadcast: Grace period warning - session will pause soon.

        Args:
            session_id: ID of the session
            table_id: ID of the table
            grace_period_seconds: Seconds until grace period ends
            reason: Reason for warning
        """
        message = {
            "type": "session_end_warning",
            "data": {
                "session_id": session_id,
                "grace_period_seconds": grace_period_seconds,
                "reason": reason,
                "can_keep_alive": True
            },
            "timestamp": get_utc_now().isoformat()
        }

        # Send to table (customer sees warning)
        await self.send_to_table(table_id, message)

    async def broadcast_heartbeat_ack(
        self,
        table_id: int,
        session_id: int,
        server_time: str
    ):
        """
        Broadcast: Heartbeat acknowledgment.

        Args:
            table_id: ID of the table
            session_id: ID of the session
            server_time: Current server time (ISO format)
        """
        message = {
            "type": "heartbeat_ack",
            "data": {
                "session_id": session_id,
                "server_time": server_time,
                "session_status": "active"
            },
            "timestamp": get_utc_now().isoformat()
        }

        # Send to table
        await self.send_to_table(table_id, message)

    async def broadcast_capacity_update(self, capacity_data: dict):
        """
        Broadcast: Capacity metrics updated.

        Args:
            capacity_data: Capacity summary information
        """
        message = {
            "type": "capacity_update",
            "capacity": capacity_data,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to admins only
        await self.broadcast_to_admins(message)

    async def broadcast_staff_call(self, table_id: int, reason: str = None):
        """
        Broadcast: Customer requested staff assistance.

        Args:
            table_id: ID of the table
            reason: Optional reason for the call
        """
        message = {
            "type": "staff_call",
            "table_id": table_id,
            "reason": reason,
            "timestamp": get_utc_now().isoformat()
        }

        # Send to admins
        await self.broadcast_to_admins(message)

        # Acknowledge to customer
        await self.send_to_table(table_id, {
            "type": "staff_call_acknowledged",
            "message": "Staff has been notified"
        })

    def get_connection_stats(self) -> dict:
        """
        Get statistics about current connections.

        Returns:
            Dictionary with connection statistics
        """
        total_table_connections = sum(len(conns) for conns in self.active_connections.values())
        return {
            "active_table_connections": total_table_connections,
            "active_admin_connections": len(self.admin_connections),
            "active_kitchen_connections": len(self.kitchen_connections),
            "total_connections": (
                total_table_connections +
                len(self.admin_connections) +
                len(self.kitchen_connections)
            ),
            "connected_tables": list(self.active_connections.keys()),
            "connections_per_table": {
                table_id: len(conns) for table_id, conns in self.active_connections.items()
            }
        }


# ============== Group Cart Broadcast Functions ==============

async def broadcast_group_cart_item_added(
    table_id: int,
    group_id: str,
    item: dict,
    participant_name: str
):
    """Broadcast when item is added to group cart"""
    await manager.send_to_table(
        table_id,
        {
            "type": GROUP_CART_ITEM_ADDED,
            "data": {
                "group_id": group_id,
                "item": item,
                "added_by": participant_name,
                "timestamp": get_utc_now().isoformat()
            }
        }
    )


async def broadcast_group_cart_item_updated(
    table_id: int,
    group_id: str,
    item: dict
):
    """Broadcast when group cart item is updated"""
    await manager.send_to_table(
        table_id,
        {
            "type": GROUP_CART_ITEM_UPDATED,
            "data": {
                "group_id": group_id,
                "item": item,
                "timestamp": get_utc_now().isoformat()
            }
        }
    )


async def broadcast_group_cart_item_removed(
    table_id: int,
    group_id: str,
    item_id: int
):
    """Broadcast when group cart item is removed"""
    await manager.send_to_table(
        table_id,
        {
            "type": GROUP_CART_ITEM_REMOVED,
            "data": {
                "group_id": group_id,
                "item_id": item_id,
                "timestamp": get_utc_now().isoformat()
            }
        }
    )


async def broadcast_group_cart_cleared(
    table_id: int,
    group_id: str,
    items_removed: int
):
    """Broadcast when group cart is cleared"""
    await manager.send_to_table(
        table_id,
        {
            "type": GROUP_CART_CLEARED,
            "data": {
                "group_id": group_id,
                "items_removed": items_removed,
                "timestamp": get_utc_now().isoformat()
            }
        }
    )


# Global connection manager instance
manager = ConnectionManager()
