"""
Session Service
Manages table sessions with in-memory caching for Raspberry Pi performance
"""

from typing import Dict, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.timezone_config import get_utc_now
from sqlalchemy import select, and_, delete, update
from sqlalchemy.sql import func
from app.models.table_session import TableSession, SessionStatus
from app.models.table import Table
from app.models.group_session import GroupSession, GroupSessionStatus
from app.models.join_request import JoinRequest, JoinRequestStatus
import uuid


class SessionAlreadyExistsError(Exception):
    """Raised when trying to create a session at an occupied table"""
    pass


class SessionNotFoundError(Exception):
    """Raised when a session is not found"""
    pass


class SessionService:
    """
    Manages table sessions with in-memory caching for Raspberry Pi performance.

    Pi Optimization:
    - Active sessions cached in memory (100x faster than DB queries)
    - Periodic batch writes to DB (reduces SD card wear)
    - Async operations (non-blocking)

    Note: Multiple sessions per table are now supported.
    Each device/customer can have their own session.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self._cache: Dict[int, TableSession] = {}  # {session.id: session}
        self._loaded = False

    async def _update_table_status(self, table_id: int):
        """
        Update table status after session changes.
        Imports TableService to avoid circular dependency.
        Broadcasts status change via WebSocket.
        """
        import logging
        logger = logging.getLogger(__name__)

        from app.services.table_service import TableService
        from app.websocket.connection_manager import manager

        logger.info(f"[DEBUG _update_table_status] Called for table_id={table_id}")

        table_service = TableService(self.db)
        result = await table_service.update_table_status_from_occupancy(table_id)

        logger.info(f"[DEBUG _update_table_status] Result: {result}")

        if result.get("status_changed"):
            # Broadcast status change via WebSocket
            old_status = result["old_status"]
            new_status = result["new_status"]
            logger.info(f"[DEBUG _update_table_status] Broadcasting status change: {old_status} -> {new_status}, occupied={result['occupied']}")
            await manager.broadcast_table_status_changed(
                table_id=table_id,
                old_status=old_status.value if hasattr(old_status, 'value') else str(old_status),
                new_status=new_status.value if hasattr(new_status, 'value') else str(new_status),
                occupied=result["occupied"]
            )

        return result

    async def _load_cache(self):
        """Load all active sessions into memory on startup"""
        if self._loaded:
            return

        result = await self.db.execute(
            select(TableSession)
            .where(TableSession.status == SessionStatus.ACTIVE)
            .where(TableSession.is_active == True)
        )
        sessions = result.scalars().all()

        # Use session.id as key to support multiple sessions per table
        self._cache = {session.id: session for session in sessions}
        self._loaded = True

    async def create_session(
        self,
        table_id: int,
        access_code: str,
        customer_count: int = 1,
        customer_name: str = None
    ) -> TableSession:
        """
        Create new session at a table.

        Business Logic:
        - Clean up any old sessions with the same access code
        - Generate unique session_id (UUID)
        - Cache in memory for fast access
        - Return session object

        Note: Multiple sessions per table are now allowed.
        Each device/customer can have their own session.

        Args:
            table_id: ID of the table
            access_code: 6-character access code
            customer_count: Number of customers (default: 1)
            customer_name: Optional customer name for identification

        Returns:
            Created TableSession object
        """
        import logging
        logger = logging.getLogger(__name__)

        await self._load_cache()

        logger.info(f"[DEBUG SessionService] create_session called: table_id={table_id}, access_code={access_code}")
        logger.info(f"[DEBUG SessionService] Current cache keys: {list(self._cache.keys())}")

        # Clean up any old INACTIVE sessions with the same access code (avoid UNIQUE constraint violation)
        # IMPORTANT: Only delete sessions that are NOT active (status != 'active' or is_active = false)
        # This prevents deleting the active session from another browser/device
        old_sessions_result = await self.db.execute(
            select(TableSession)
            .where(TableSession.access_code == access_code)
            .where(
                (TableSession.status != SessionStatus.ACTIVE) |
                (TableSession.is_active == False)
            )
        )
        old_sessions = old_sessions_result.scalars().all()

        logger.info(f"[DEBUG SessionService] Found {len(old_sessions)} old inactive sessions to clean up")

        for old_session in old_sessions:
            self._cache.pop(old_session.id, None)  # Cache is keyed by session.id

        # Bulk delete all old INACTIVE sessions with this access code
        await self.db.execute(
            delete(TableSession).where(
                TableSession.access_code == access_code
            ).where(
                (TableSession.status != SessionStatus.ACTIVE) |
                (TableSession.is_active == False)
            )
        )

        # Verify table exists
        table_result = await self.db.execute(
            select(Table).where(Table.id == table_id)
        )
        table = table_result.scalar_one_or_none()
        if not table:
            raise ValueError(f"Table {table_id} not found")

        # Create session
        session = TableSession(
            table_id=table_id,
            session_id=str(uuid.uuid4()),
            access_code=access_code,
            customer_count=customer_count,
            customer_name=customer_name,
            status=SessionStatus.ACTIVE,
            started_at=func.now(),
            last_activity_at=func.now()
        )

        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        logger.info(f"[DEBUG SessionService] Created new session: session_id={session.session_id}, table_id={table_id}, customer_count={customer_count}")

        # Add to cache - use session.id as key to support multiple sessions per table
        self._cache[session.id] = session

        # Update table status based on occupancy
        await self._update_table_status(table_id)

        return session

    async def get_active_sessions_for_table(self, table_id: int) -> List[TableSession]:
        """
        Get all active sessions for a table.

        Args:
            table_id: ID of the table

        Returns:
            List of active TableSession objects for this table
        """
        await self._load_cache()
        return [s for s in self._cache.values() if s.table_id == table_id]

    async def get_active_session(self, table_id: int) -> Optional[TableSession]:
        """
        Get first active session for a table (for backwards compatibility).

        Note: Multiple sessions can exist per table. Use get_active_sessions_for_table()
        to get all sessions.

        Args:
            table_id: ID of the table

        Returns:
            First TableSession object or None if no active session
        """
        sessions = await self.get_active_sessions_for_table(table_id)
        return sessions[0] if sessions else None

    async def get_session_by_access_code(self, access_code: str) -> Optional[TableSession]:
        """
        Get active session by access code.

        Args:
            access_code: 6-character access code

        Returns:
            TableSession object or None
        """
        import logging
        logger = logging.getLogger(__name__)

        await self._load_cache()

        logger.info(f"[DEBUG SessionService] get_session_by_access_code called: access_code={access_code}")
        logger.info(f"[DEBUG SessionService] Current cache: {list(self._cache.keys())}")

        # Search in cache
        for session in self._cache.values():
            if session.access_code == access_code:
                logger.info(f"[DEBUG SessionService] Found session in cache: session_id={session.session_id}, table_id={session.table_id}")
                return session

        logger.info(f"[DEBUG SessionService] Session not found in cache, checking DB...")

        # If not in cache, check DB for active sessions only
        result = await self.db.execute(
            select(TableSession)
            .where(TableSession.access_code == access_code)
            .where(TableSession.status == SessionStatus.ACTIVE)
            .where(TableSession.is_active == True)
            .order_by(TableSession.started_at.desc())
            .limit(1)
        )
        session = result.scalar_one_or_none()

        if session:
            logger.info(f"[DEBUG SessionService] Found session in DB: session_id={session.session_id}, table_id={session.table_id}")
        else:
            logger.info(f"[DEBUG SessionService] No session found in DB for access_code={access_code}")

        return session

    async def get_session_by_session_id(self, session_id: str) -> Optional[TableSession]:
        """
        Get session by session_id (UUID).

        Args:
            session_id: UUID session identifier

        Returns:
            TableSession object or None
        """
        await self._load_cache()

        # Search in cache
        for session in self._cache.values():
            if session.session_id == session_id:
                return session

        # If not in cache, check DB
        result = await self.db.execute(
            select(TableSession).where(TableSession.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def update_activity(self, table_id: int):
        """
        Update session activity timestamp.

        Called when customer:
        - Adds item to cart
        - Places order
        - Any interaction

        Args:
            table_id: ID of the table
        """
        session = await self.get_active_session(table_id)
        if session:
            session.last_activity_at = get_utc_now()
            await self.db.commit()

    async def update_session_metadata(self, table_id: int, metadata: dict):
        """
        Update session metadata (cart, preferences, etc.)

        Args:
            table_id: ID of the table
            metadata: Dictionary to merge into metadata
        """
        session = await self.get_active_session(table_id)
        if session:
            current_metadata = session.session_metadata or {}
            current_metadata.update(metadata)
            session.session_metadata = current_metadata
            session.last_activity_at = get_utc_now()
            await self.db.commit()

    async def end_session(self, session_id: int) -> TableSession:
        """
        End a specific session (customer leaves, pays, etc.)

        Updates:
        - status = 'ended'
        - ended_at timestamp
        - Removes from cache
        - Cancels any active group sessions for this table
        - Declines any pending join requests for those groups

        Args:
            session_id: ID of the session to end (not table_id)

        Returns:
            The ended TableSession object

        Raises:
            SessionNotFoundError: If no active session exists
        """
        import logging
        logger = logging.getLogger(__name__)

        # Get session from cache or DB
        session = self._cache.get(session_id)
        if not session:
            result = await self.db.execute(
                select(TableSession)
                .where(TableSession.id == session_id)
                .where(TableSession.is_active == True)
            )
            session = result.scalar_one_or_none()

        if not session:
            raise SessionNotFoundError(
                f"No active session with id {session_id}"
            )

        table_id = session.table_id
        logger.info(f"[DEBUG end_session] Ending session {session_id} for table {table_id}")

        # Clean up group sessions for this table
        await self._cleanup_group_sessions_for_table(table_id)

        session.status = SessionStatus.ENDED
        session.ended_at = func.now()
        session.is_active = False

        await self.db.commit()
        await self.db.refresh(session)

        # Remove from cache
        self._cache.pop(session_id, None)

        # Update table status based on occupancy
        await self._update_table_status(table_id)

        return session

    async def end_session_by_table(self, table_id: int) -> List[TableSession]:
        """
        End all active sessions for a table.

        Args:
            table_id: ID of the table

        Returns:
            List of ended TableSession objects
        """
        sessions = await self.get_active_sessions_for_table(table_id)
        ended_sessions = []

        for session in sessions:
            ended = await self.end_session(session.id)
            ended_sessions.append(ended)

        return ended_sessions

    async def _cleanup_group_sessions_for_table(self, table_id: int):
        """
        Clean up group sessions and join requests when a table session ends.

        - Cancels all active group sessions for this table
        - Declines all pending join requests for those groups

        Args:
            table_id: ID of the table
        """
        # Find all active group sessions for this table
        result = await self.db.execute(
            select(GroupSession)
            .where(GroupSession.table_id == table_id)
            .where(GroupSession.status == GroupSessionStatus.ACTIVE)
            .where(GroupSession.is_active == True)
        )
        active_groups = result.scalars().all()

        for group in active_groups:
            # Decline all pending join requests for this group
            await self.db.execute(
                update(JoinRequest)
                .where(JoinRequest.group_session_id == group.id)
                .where(JoinRequest.status == JoinRequestStatus.PENDING)
                .values(
                    status=JoinRequestStatus.DECLINED,
                    response_reason="Session ended by admin",
                    responded_at=get_utc_now(),
                    is_active=False
                )
            )

            # Cancel the group session
            group.status = GroupSessionStatus.CANCELLED
            group.is_active = False
            group.closed_at = get_utc_now()
            if not group.group_metadata:
                group.group_metadata = {}
            group.group_metadata['close_reason'] = "Session ended by admin"

    async def get_all_active_sessions(self) -> List[TableSession]:
        """
        Return all active sessions (for dashboard).

        Returns:
            List of active TableSession objects
        """
        await self._load_cache()
        return list(self._cache.values())

    async def cleanup_abandoned_sessions(self):
        """
        Background task: Mark sessions as abandoned after 20min inactivity.

        Run every 10 minutes (not every second - saves CPU)

        Returns:
            Number of sessions marked as abandoned
        """
        await self._load_cache()

        cutoff_time = get_utc_now() - timedelta(minutes=20)
        abandoned_count = 0

        for session_id, session in list(self._cache.items()):
            # Check if last activity was before cutoff
            if session.last_activity_at and session.last_activity_at < cutoff_time:
                table_id = session.table_id

                # Clean up group sessions for this table
                await self._cleanup_group_sessions_for_table(table_id)

                session.status = SessionStatus.ABANDONED
                session.is_active = False
                session.ended_at = func.now()
                self._cache.pop(session_id)  # Remove from cache
                abandoned_count += 1

                # Update table status based on occupancy
                await self._update_table_status(table_id)

        if abandoned_count > 0:
            await self.db.commit()

        return abandoned_count

    async def get_session_statistics(
        self,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> dict:
        """
        Get session statistics for analytics.

        Args:
            start_date: Start of date range (default: 24 hours ago)
            end_date: End of date range (default: now)

        Returns:
            Dictionary with session statistics
        """
        if not start_date:
            start_date = get_utc_now() - timedelta(hours=24)
        if not end_date:
            end_date = get_utc_now()

        # Total sessions in period
        result = await self.db.execute(
            select(TableSession)
            .where(TableSession.started_at >= start_date)
            .where(TableSession.started_at <= end_date)
        )
        all_sessions = result.scalars().all()

        # Calculate statistics
        total_sessions = len(all_sessions)
        active_sessions = len([s for s in all_sessions if s.status == SessionStatus.ACTIVE])
        ended_sessions = len([s for s in all_sessions if s.status == SessionStatus.ENDED])
        abandoned_sessions = len([s for s in all_sessions if s.status == SessionStatus.ABANDONED])

        # Average customer count
        total_customers = sum(s.customer_count or 0 for s in all_sessions)
        avg_customers = total_customers / total_sessions if total_sessions > 0 else 0

        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "ended_sessions": ended_sessions,
            "abandoned_sessions": abandoned_sessions,
            "total_customers": total_customers,
            "average_customers_per_session": round(avg_customers, 1),
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat()
        }

    async def clear_cache(self):
        """
        Clear the in-memory cache and force reload on next access.
        Useful for testing or when data changes externally.
        """
        self._cache.clear()
        self._loaded = False

    async def add_participant_to_session(
        self,
        table_session_id: int,
        device_id: str,
        device_name: str = None,
        customer_count: int = 1,
        role: str = "guest"
    ):
        """
        Add a device/participant to an existing session.

        Args:
            table_session_id: ID of the table session
            device_id: Unique device identifier from localStorage
            device_name: Optional device name (e.g., "Mobile Device")
            customer_count: Number of people this device represents
            role: "host" or "guest"

        Returns:
            Created SessionParticipant object

        Raises:
            ValueError: If device already in this session
        """
        import logging
        from app.models.session_participant import SessionParticipant, ParticipantRole
        logger = logging.getLogger(__name__)

        await self._load_cache()

        logger.info(f"[DEBUG SessionService] add_participant_to_session called: table_session_id={table_session_id}, device_id={device_id}")

        # Check if device already has an active participant in this session
        existing_result = await self.db.execute(
            select(SessionParticipant)
            .where(SessionParticipant.device_id == device_id)
            .where(SessionParticipant.table_session_id == table_session_id)
            .where(SessionParticipant.is_active == True)
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            logger.info(f"[DEBUG SessionService] Device {device_id} already in session {table_session_id}")
            # Update activity and return existing participant
            existing.last_activity_at = func.now()
            await self.db.commit()
            await self.db.refresh(existing)
            # Explicitly load datetime fields to avoid lazy loading issues
            _ = existing.joined_at, existing.last_activity_at
            return existing

        # Verify the session exists and is active
        session_result = await self.db.execute(
            select(TableSession)
            .where(TableSession.id == table_session_id)
            .where(TableSession.is_active == True)
        )
        session = session_result.scalar_one_or_none()

        if not session:
            logger.info(f"[DEBUG SessionService] Session {table_session_id} not found or not active")
            raise ValueError(f"Session {table_session_id} not found or not active")

        # Map role string to enum
        role_enum = ParticipantRole.HOST if role.lower() == "host" else ParticipantRole.GUEST

        # Create new participant
        participant = SessionParticipant(
            table_session_id=table_session_id,
            device_id=device_id,
            device_name=device_name,
            customer_count=customer_count,
            role=role_enum,
            is_active=True,
            joined_at=func.now(),
            last_activity_at=func.now()
        )

        self.db.add(participant)
        await self.db.commit()
        await self.db.refresh(participant)

        # Explicitly load datetime fields to avoid lazy loading issues
        _ = participant.joined_at, participant.last_activity_at

        logger.info(f"[DEBUG SessionService] Created participant: participant_id={participant.participant_id}, device_id={device_id}, customer_count={customer_count}, role={role}")

        # Only update session's customer_count for GUEST participants
        # HOST participants are already counted when session is created
        if role.lower() == "guest":
            old_session_count = session.customer_count or 0
            new_count = old_session_count + customer_count

            await self.db.execute(
                update(TableSession)
                .where(TableSession.id == table_session_id)
                .values(customer_count=new_count)
            )
            await self.db.commit()

            # Refresh to get the updated value
            await self.db.refresh(session)

            logger.info(f"[DEBUG SessionService] Updated session customer_count: {old_session_count} -> {session.customer_count}")
        else:
            logger.info(f"[DEBUG SessionService] HOST participant - session customer_count unchanged: {session.customer_count}")

        # Update cache with new customer_count (cache is keyed by session.id)
        if table_session_id in self._cache:
            self._cache[table_session_id] = session
            logger.info(f"[DEBUG SessionService] Updated cache for session.id={table_session_id}")

        # Update table status based on new occupancy
        logger.info(f"[DEBUG SessionService] Calling _update_table_status for table_id={session.table_id}")
        await self._update_table_status(session.table_id)

        return participant

    async def get_participant_by_device_id(self, device_id: str) -> dict:
        """
        Get active participant and session by device_id.

        Args:
            device_id: Unique device identifier

        Returns:
            Dictionary with 'participant' and 'session' objects, or None if not found
        """
        import logging
        from app.models.session_participant import SessionParticipant
        from app.models.table_session import TableSession, SessionStatus
        logger = logging.getLogger(__name__)

        logger.info(f"[DEBUG SessionService] get_participant_by_device_id called: device_id={device_id}")

        # Find most recent active participant for this device
        # Use first() instead of scalar_one_or_none() since there might be multiple
        result = await self.db.execute(
            select(SessionParticipant)
            .where(SessionParticipant.device_id == device_id)
            .where(SessionParticipant.is_active == True)
            .order_by(SessionParticipant.joined_at.desc())
            .limit(1)
        )
        participant = result.scalar_one_or_none()

        if not participant:
            logger.info(f"[DEBUG SessionService] No active participant found for device_id={device_id}")
            return None

        # Get the session by its ID (participant.table_session_id is the session's database ID)
        session_result = await self.db.execute(
            select(TableSession).where(TableSession.id == participant.table_session_id)
        )
        session = session_result.scalar_one_or_none()

        if not session:
            logger.info(f"[DEBUG SessionService] Session {participant.table_session_id} not found")
            return None

        # Check if session is still active
        if session.status != SessionStatus.ACTIVE or not session.is_active:
            logger.info(f"[DEBUG SessionService] Session {participant.table_session_id} not active (status={session.status})")
            return None

        logger.info(f"[DEBUG SessionService] Found participant: participant_id={participant.participant_id}, session_id={session.session_id}")

        return {
            "participant": participant,
            "session": session
        }

    async def get_session_participants(self, table_session_id: int) -> list:
        """
        Get all active participants for a session.

        Args:
            table_session_id: ID of the table session

        Returns:
            List of SessionParticipant objects
        """
        import logging
        from app.models.session_participant import SessionParticipant
        logger = logging.getLogger(__name__)

        result = await self.db.execute(
            select(SessionParticipant)
            .where(SessionParticipant.table_session_id == table_session_id)
            .where(SessionParticipant.is_active == True)
            .order_by(SessionParticipant.joined_at.asc())
        )
        participants = result.scalars().all()

        logger.info(f"[DEBUG SessionService] Found {len(participants)} participants for session {table_session_id}")

        # Explicitly load datetime fields to avoid lazy loading issues
        for p in participants:
            _ = p.joined_at, p.last_activity_at

        return list(participants)

    async def remove_participant_from_session(self, device_id: str):
        """
        Remove a participant from their session (soft delete).

        Args:
            device_id: Device identifier to remove
        """
        import logging
        from app.models.session_participant import SessionParticipant
        logger = logging.getLogger(__name__)

        result = await self.db.execute(
            select(SessionParticipant)
            .where(SessionParticipant.device_id == device_id)
            .where(SessionParticipant.is_active == True)
        )
        participant = result.scalar_one_or_none()

        if participant:
            # Store the customer_count and table_session_id before removing
            customer_count = participant.customer_count or 0
            table_session_id = participant.table_session_id

            participant.is_active = False
            participant.left_at = func.now()
            await self.db.commit()
            logger.info(f"[DEBUG SessionService] Removed participant: device_id={device_id}")

            # Update session's total customer_count (subtract removed participant's count)
            # Use direct SQL UPDATE to avoid SQLAlchemy session caching issues
            session_result = await self.db.execute(
                select(TableSession).where(TableSession.id == table_session_id)
            )
            session = session_result.scalar_one_or_none()

            if session and session.is_active:
                old_count = session.customer_count or 0
                new_count = max(0, old_count - customer_count)

                await self.db.execute(
                    update(TableSession)
                    .where(TableSession.id == table_session_id)
                    .values(customer_count=new_count)
                )
                await self.db.commit()
                await self.db.refresh(session)

                logger.info(f"[DEBUG SessionService] Updated session customer_count: {old_count} -> {session.customer_count}")

                # Update cache with new customer_count (cache is keyed by session.id)
                if session.id in self._cache:
                    self._cache[session.id] = session

                # Update table status based on new occupancy
                await self._update_table_status(session.table_id)
