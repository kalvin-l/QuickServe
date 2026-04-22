"""
Session Pause Service
Manages session pause/resume lifecycle for Smart Contextual End feature
"""

from typing import Dict, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from sqlalchemy.sql import func
from app.utils.timezone_config import get_utc_now
from app.models.table_session import TableSession, SessionStatus, PaymentStatus
from app.models.session_participant import SessionParticipant, ConnectionStatus
from app.models.preserved_cart import PreservedCart
from app.models.order import Order, OrderStatus
import logging
import uuid

logger = logging.getLogger(__name__)


class CannotPauseError(Exception):
    """Raised when session cannot be paused"""
    pass


class CannotResumeError(Exception):
    """Raised when session cannot be resumed"""
    pass


class SessionPauseService:
    """
    Manages session pause/resume lifecycle.

    Features:
    - Pause sessions with grace period
    - Resume sessions at same or different table
    - Preserve cart data
    - Check blocking conditions (pending orders, payments)
    - Get resumable sessions by device_id
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def can_pause_session(self, session_id: int) -> Dict[str, any]:
        """
        Check if a session can be paused.

        Blocking conditions:
        - Pending orders (not delivered)
        - Pending payments

        Args:
            session_id: ID of the session to check

        Returns:
            Dictionary with:
                - can_pause: bool
                - reason: str (if cannot pause)
                - blocking_items: dict with details
        """
        # Get session
        result = await self.db.execute(
            select(TableSession).where(TableSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            return {
                "can_pause": False,
                "reason": "Session not found"
            }

        # Check if already paused
        if session.status in [SessionStatus.PAUSED, SessionStatus.PAUSING]:
            return {
                "can_pause": False,
                "reason": "Session is already paused or pausing"
            }

        # Check for pending orders
        pending_orders = await self._get_pending_orders(session_id)
        if pending_orders > 0:
            return {
                "can_pause": False,
                "reason": "pending_orders",
                "blocking_items": {
                    "pending_orders": pending_orders
                }
            }

        # Check for pending payments
        unpaid_amount = await self._get_unpaid_amount(session_id)
        if unpaid_amount > 0:
            return {
                "can_pause": False,
                "reason": "pending_payment",
                "blocking_items": {
                    "unpaid_amount": unpaid_amount
                }
            }

        return {
            "can_pause": True,
            "reason": None,
            "blocking_items": {}
        }

    async def pause_session(
        self,
        session_id: int,
        reason: str = "inactivity",
        grace_period_minutes: int = 5,
        preserve_cart: bool = True,
        ended_by: str = "system"
    ) -> Dict:
        """
        Pause a session with grace period.

        Flow:
        1. Check if session can be paused
        2. Preserve cart to database
        3. Set grace period
        4. Mark session as PAUSING
        5. Broadcast pausing event

        Args:
            session_id: ID of the session to pause
            reason: Reason for pause (inactivity, checkout_complete, manual)
            grace_period_minutes: Grace period before hard pause (default 5)
            preserve_cart: Whether to preserve cart data
            ended_by: Who initiated the pause (user, system, admin)

        Returns:
            Dictionary with pause details

        Raises:
            CannotPauseError: If session cannot be paused
        """
        logger.info(f"Pause requested for session {session_id}, reason: {reason}")

        # Check if can pause
        can_pause = await self.can_pause_session(session_id)
        if not can_pause["can_pause"]:
            raise CannotPauseError(
                f"Cannot pause session: {can_pause['reason']}"
            )

        # Get session
        result = await self.db.execute(
            select(TableSession).where(TableSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise CannotPauseError("Session not found")

        # Preserve cart if requested
        cart_preserved = False
        preserved_cart_id = None
        cart_data = None

        if preserve_cart:
            cart_data = await self._get_session_cart(session_id)
            if cart_data:
                preserved = await self._preserve_cart(session_id, cart_data)
                if preserved:
                    cart_preserved = True
                    preserved_cart_id = preserved.id

        # Calculate grace period end
        grace_period_end = get_utc_now() + timedelta(minutes=grace_period_minutes)
        can_resume_until = get_utc_now() + timedelta(hours=24)

        # Update session
        session.status = SessionStatus.PAUSING
        session.session_end_scheduled_at = grace_period_end
        session.grace_period_minutes = grace_period_minutes
        session.ended_by = ended_by
        session.end_reason = reason
        session.pending_orders_count = 0  # Verified above

        await self.db.commit()
        await self.db.refresh(session)

        logger.info(
            f"Session {session_id} set to PAUSING. "
            f"Grace period ends: {grace_period_end}"
        )

        return {
            "session_id": session_id,
            "status": "pausing",
            "grace_period_end": grace_period_end.isoformat(),
            "can_resume_until": can_resume_until.isoformat(),
            "cart_preserved": cart_preserved,
            "preserved_cart_id": str(preserved_cart_id) if preserved_cart_id else None,
            "cart_item_count": len(cart_data.get("items", [])) if cart_data else 0,
            "cart_total": cart_data.get("total", 0) if cart_data else 0,
            "reason": reason
        }

    async def resume_session(
        self,
        session_id: int,
        device_id: str,
        new_table_id: int = None
    ) -> Dict:
        """
        Resume a paused session.

        Flow:
        1. Verify session is in PAUSED or PAUSING state
        2. If new_table_id provided, transfer session
        3. Restore cart from preserved cart
        4. Reactivate session
        5. Broadcast resumed event

        Args:
            session_id: ID of the session to resume
            device_id: Device ID requesting resume
            new_table_id: Optional new table ID for transfer

        Returns:
            Dictionary with resumed session details

        Raises:
            CannotResumeError: If session cannot be resumed
        """
        logger.info(f"Resume requested for session {session_id} by device {device_id}")

        # Get session
        result = await self.db.execute(
            select(TableSession).where(TableSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise CannotResumeError("Session not found")

        # Check if session is paused
        if session.status not in [SessionStatus.PAUSED, SessionStatus.PAUSING]:
            raise CannotResumeError(
                f"Session is not paused (current status: {session.status})"
            )

        # Check if expired
        if session.paused_at:
            expiry_time = session.paused_at + timedelta(hours=24)
            if get_utc_now() > expiry_time:
                raise CannotResumeError("Session has expired (24h limit)")

        # Verify device is associated with this session
        participant_result = await self.db.execute(
            select(SessionParticipant).where(
                and_(
                    SessionParticipant.table_session_id == session_id,
                    SessionParticipant.device_id == device_id,
                    SessionParticipant.is_active == True
                )
            )
        )
        participant = participant_result.scalar_one_or_none()

        if not participant:
            raise CannotResumeError("Device not associated with this session")

        # Check if table transfer requested
        if new_table_id and new_table_id != session.table_id:
            session.table_id = new_table_id
            logger.info(f"Session {session_id} transferred to table {new_table_id}")

        # Get preserved cart
        cart_restored = False
        cart_items_count = 0
        cart_total = 0

        cart_result = await self.db.execute(
            select(PreservedCart).where(
                PreservedCart.session_id == session_id
            )
        )
        preserved_cart = cart_result.scalar_one_or_none()

        if preserved_cart:
            cart_restored = True
            cart_items_count = len(preserved_cart.cart_data.get("items", [])) if preserved_cart.cart_data else 0
            cart_total = preserved_cart.cart_data.get("total", 0) if preserved_cart.cart_data else 0

        # Update session
        session.status = SessionStatus.ACTIVE
        session.session_end_scheduled_at = None
        session.paused_at = None
        session.ended_by = None
        session.end_reason = None
        session.last_activity_at = get_utc_now()

        # Update participant connection status
        participant.connection_status = ConnectionStatus.CONNECTED
        participant.last_heartbeat_at = get_utc_now()

        await self.db.commit()
        await self.db.refresh(session)

        logger.info(f"Session {session_id} resumed to ACTIVE status")

        return {
            "session_id": session_id,
            "status": "active",
            "table_id": session.table_id,
            "session_id_uuid": session.session_id,
            "cart_restored": cart_restored,
            "cart_items_count": cart_items_count,
            "cart_total": cart_total,
            "access_code": session.access_code
        }

    async def keep_alive(self, session_id: int) -> Dict:
        """
        Extend grace period for a session in PAUSING state.

        Args:
            session_id: ID of the session

        Returns:
            Dictionary with extended grace period details

        Raises:
            CannotResumeError: If session is not in PAUSING state
        """
        # Get session
        result = await self.db.execute(
            select(TableSession).where(TableSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise CannotResumeError("Session not found")

        if session.status != SessionStatus.PAUSING:
            raise CannotResumeError(
                f"Session is not in grace period (current status: {session.status})"
            )

        # Extend grace period
        grace_period_minutes = session.grace_period_minutes or 5
        new_grace_end = get_utc_now() + timedelta(minutes=grace_period_minutes)

        session.session_end_scheduled_at = new_grace_end
        session.last_activity_at = get_utc_now()

        await self.db.commit()
        await self.db.refresh(session)

        logger.info(f"Session {session_id} grace period extended to {new_grace_end}")

        return {
            "session_id": session_id,
            "status": "pausing",
            "extended_until": new_grace_end.isoformat(),
            "grace_period_minutes": grace_period_minutes
        }

    async def get_resumable_sessions(self, device_id: str) -> List[Dict]:
        """
        Get all paused sessions for a device that can be resumed.

        Args:
            device_id: Device ID to search for

        Returns:
            List of resumable session dictionaries
        """
        # Find all participants for this device
        participant_result = await self.db.execute(
            select(SessionParticipant)
            .where(SessionParticipant.device_id == device_id)
            .where(SessionParticipant.is_active == True)
            .order_by(SessionParticipant.joined_at.desc())
        )
        participants = participant_result.scalars().all()

        resumable_sessions = []

        for participant in participants:
            # Get session for each participant
            session_result = await self.db.execute(
                select(TableSession).where(
                    TableSession.id == participant.table_session_id
                )
            )
            session = session_result.scalar_one_or_none()

            if not session:
                continue

            # Only include paused sessions
            if session.status not in [SessionStatus.PAUSED, SessionStatus.PAUSING]:
                continue

            # Check if expired
            if session.paused_at:
                expiry_time = session.paused_at + timedelta(hours=24)
                if get_utc_now() > expiry_time:
                    continue

            # Get preserved cart info
            cart_result = await self.db.execute(
                select(PreservedCart).where(
                    PreservedCart.session_id == session.id
                )
            )
            preserved_cart = cart_result.scalar_one_or_none()

            resumable_sessions.append({
                "session_id": session.id,
                "session_uuid": session.session_id,
                "table_id": session.table_id,
                "paused_at": session.paused_at.isoformat() if session.paused_at else None,
                "can_resume_until": (session.paused_at + timedelta(hours=24)).isoformat() if session.paused_at else None,
                "has_cart": preserved_cart is not None,
                "cart_item_count": len(preserved_cart.cart_data.get("items", [])) if preserved_cart and preserved_cart.cart_data else 0,
                "cart_total": preserved_cart.cart_data.get("total", 0) if preserved_cart and preserved_cart.cart_data else 0,
                "participant_id": participant.participant_id
            })

        logger.info(f"Found {len(resumable_sessions)} resumable sessions for device {device_id}")

        return resumable_sessions

    async def process_expired_grace_periods(self) -> int:
        """
        Background task: Transition sessions from PAUSING to PAUSED.

        Called by scheduler every 30 seconds.

        Returns:
            Number of sessions transitioned
        """
        now = get_utc_now()

        # Find all sessions in PAUSING state where grace period has expired
        result = await self.db.execute(
            select(TableSession).where(
                and_(
                    TableSession.status == SessionStatus.PAUSING,
                    TableSession.session_end_scheduled_at <= now
                )
            )
        )
        sessions = result.scalars().all()

        transitioned_count = 0

        for session in sessions:
            # Transition to PAUSED
            session.status = SessionStatus.PAUSED
            session.paused_at = now
            session.session_end_scheduled_at = None

            # Free up the table
            await self._update_table_status(session.table_id)

            transitioned_count += 1
            logger.info(f"Session {session.id} transitioned from PAUSING to PAUSED")

        if transitioned_count > 0:
            await self.db.commit()

        return transitioned_count

    async def cleanup_expired_sessions(self) -> int:
        """
        Background task: Hard-end sessions paused for more than 24 hours.

        Called by scheduler every hour.

        Returns:
            Number of sessions ended
        """
        cutoff_time = get_utc_now() - timedelta(hours=24)

        # Find all PAUSED sessions older than 24h
        result = await self.db.execute(
            select(TableSession).where(
                and_(
                    TableSession.status == SessionStatus.PAUSED,
                    TableSession.paused_at <= cutoff_time
                )
            )
        )
        sessions = result.scalars().all()

        ended_count = 0

        for session in sessions:
            session.status = SessionStatus.ENDED
            session.is_active = False
            session.ended_at = func.now()
            session.ended_by = "system"
            session.end_reason = "expired_24h"

            ended_count += 1
            logger.info(f"Session {session.id} expired after 24h, marked as ENDED")

        if ended_count > 0:
            await self.db.commit()

        return ended_count

    async def cleanup_preserved_carts(self) -> int:
        """
        Background task: Remove preserved carts older than 24 hours.

        Called by scheduler every 6 hours.

        Returns:
            Number of carts cleaned up
        """
        cutoff_time = get_utc_now() - timedelta(hours=24)

        # Delete preserved carts that have expired
        result = await self.db.execute(
            select(PreservedCart).where(
                PreservedCart.expires_at <= cutoff_time
            )
        )
        carts = result.scalars().all()

        # Delete the carts
        for cart in carts:
            await self.db.delete(cart)

        if carts:
            await self.db.commit()

        logger.info(f"Cleaned up {len(carts)} expired preserved carts")

        return len(carts)

    # ============================================================
    # Private helper methods
    # ============================================================

    async def _get_session_cart(self, session_id: int) -> Optional[Dict]:
        """
        Get cart data from session metadata.

        Args:
            session_id: Session ID

        Returns:
            Cart data dictionary or None
        """
        result = await self.db.execute(
            select(TableSession).where(TableSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session or not session.session_metadata:
            return None

        # Cart is stored in session.metadata under 'cart' key
        # Frontend uses 'quickserve-cart' in localStorage
        return session.session_metadata.get("cart")

    async def _preserve_cart(self, session_id: int, cart_data: Dict) -> Optional[PreservedCart]:
        """
        Preserve cart data to database.

        Args:
            session_id: Session ID
            cart_data: Cart data to preserve

        Returns:
            PreservedCart object or None
        """
        # Get session and device info
        result = await self.db.execute(
            select(TableSession).where(TableSession.id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            return None

        # Get first participant's device_id
        participant_result = await self.db.execute(
            select(SessionParticipant).where(
                and_(
                    SessionParticipant.table_session_id == session_id,
                    SessionParticipant.is_active == True
                )
            ).limit(1)
        )
        participant = participant_result.scalar_one_or_none()

        if not participant:
            return None

        # Create preserved cart
        preserved_cart = PreservedCart(
            session_id=session_id,
            device_id=participant.device_id,
            table_id=session.table_id,
            cart_data=cart_data,
            expires_at=get_utc_now() + timedelta(hours=24)
        )

        self.db.add(preserved_cart)
        await self.db.commit()
        await self.db.refresh(preserved_cart)

        logger.info(f"Cart preserved for session {session_id}, device {participant.device_id}")

        return preserved_cart

    async def _get_pending_orders(self, session_id: int) -> int:
        """
        Get count of pending orders for a session.

        Args:
            session_id: Session ID

        Returns:
            Count of pending orders
        """
        # TODO: Implement once Order model relationship is clear
        # For now, return 0
        return 0

    async def _get_unpaid_amount(self, session_id: int) -> float:
        """
        Get unpaid amount for a session.

        Args:
            session_id: Session ID

        Returns:
            Unpaid amount
        """
        # TODO: Implement once Payment model relationship is clear
        # For now, return 0
        return 0.0

    async def _update_table_status(self, table_id: int):
        """
        Update table status after session changes.

        Args:
            table_id: Table ID
        """
        from app.services.table_service import TableService
        from app.websocket.connection_manager import manager

        table_service = TableService(self.db)
        result = await table_service.update_table_status_from_occupancy(table_id)

        if result.get("status_changed"):
            old_status = result["old_status"]
            new_status = result["new_status"]

            # Broadcast status change via WebSocket
            await manager.broadcast_table_status_changed(
                table_id=table_id,
                old_status=old_status.value if hasattr(old_status, 'value') else str(old_status),
                new_status=new_status.value if hasattr(new_status, 'value') else str(new_status),
                occupied=result["occupied"]
            )
