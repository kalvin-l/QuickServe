"""
Group Service
Manages group ordering sessions with support for multiple payment modes
"""

from typing import Dict, Optional, List
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.utils.timezone_config import get_utc_now
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.sql import func
from sqlalchemy.orm import selectinload
import secrets
import string
import uuid

from app.models.group_session import GroupSession, GroupMember, PaymentType, GroupSessionStatus
from app.models.join_request import JoinRequest, JoinRequestStatus
from app.models.table_session import TableSession
from app.models.table import Table


class GroupAlreadyExistsError(Exception):
    """Raised when trying to create a group when one already exists at the table"""
    pass


class GroupNotFoundError(Exception):
    """Raised when a group is not found"""
    pass


class GroupService:
    """
    Manages group ordering sessions.

    Features:
    - Create group sessions with payment modes (host pays all, individual, hybrid)
    - Add members to groups
    - Handle late joiner requests
    - Close groups and handle payments
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    def _generate_share_code(self, length: int = 8) -> str:
        """
        Generate a short, unique share code for group joining.

        Format: 8 characters (uppercase letters + numbers)
        Example: "ABC123XY"
        """
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    async def create_group(
        self,
        table_id: int,
        session_id: str,
        host_name: str = None,
        payment_type: PaymentType = PaymentType.INDIVIDUAL,
        auto_approve_joins: bool = False,
        max_members: int = 6,
        participant_id: int = None
    ) -> GroupSession:
        """
        Create a new group ordering session.

        Args:
            table_id: ID of the table
            session_id: Host's session ID (from table session)
            host_name: Optional host name
            payment_type: Payment mode (host_pays_all, individual, hybrid)
            auto_approve_joins: Whether to auto-approve join requests
            max_members: Maximum number of members
            participant_id: Optional participant ID (for session pooling)

        Returns:
            Created GroupSession object

        Raises:
            GroupAlreadyExistsError: If table already has an active group
            ValueError: If table or session not found
        """
        # Verify table exists
        table_result = await self.db.execute(
            select(Table).where(Table.id == table_id)
        )
        table = table_result.scalar_one_or_none()
        if not table:
            raise ValueError(f"Table {table_id} not found")

        # Verify session exists
        session_result = await self.db.execute(
            select(TableSession).where(TableSession.session_id == session_id)
        )
        session = session_result.scalar_one_or_none()
        if not session:
            raise ValueError(f"Session {session_id} not found")

        # Check if table already has an active group
        existing_group = await self.get_active_group_by_table(table_id)
        if existing_group:
            raise GroupAlreadyExistsError(
                f"Table {table_id} already has an active group"
            )

        # Generate unique share code
        share_code = self._generate_share_code()
        while await self._share_code_exists(share_code):
            share_code = self._generate_share_code()

        # Create group session
        group = GroupSession(
            group_id=str(uuid.uuid4()),
            table_id=table_id,
            host_session_id=session_id,
            host_participant_id=participant_id,
            host_name=host_name,
            payment_type=payment_type,
            auto_approve_joins=auto_approve_joins,
            max_members=max_members,
            status=GroupSessionStatus.ACTIVE,
            share_code=share_code,
            created_at=get_utc_now()
        )

        self.db.add(group)
        await self.db.commit()
        await self.db.refresh(group)

        # Add host as first member (with participant_id if provided)
        host_member = GroupMember(
            group_session_id=group.id,
            session_id=session_id,
            participant_id=participant_id,
            name=host_name,
            has_joined=True,
            order_subtotal=0,
            joined_at=get_utc_now()
        )

        self.db.add(host_member)
        await self.db.commit()
        await self.db.refresh(group)

        return group

    async def _share_code_exists(self, share_code: str) -> bool:
        """Check if a share code already exists"""
        result = await self.db.execute(
            select(GroupSession).where(GroupSession.share_code == share_code)
        )
        return result.scalar_one_or_none() is not None

    async def get_group_by_id(self, group_id: str) -> Optional[GroupSession]:
        """
        Get group by group_id (UUID).

        Args:
            group_id: Group ID (UUID)

        Returns:
            GroupSession object or None
        """
        result = await self.db.execute(
            select(GroupSession)
            .options(selectinload(GroupSession.members))
            .where(GroupSession.group_id == group_id)
            .where(GroupSession.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_group_by_share_code(self, share_code: str) -> Optional[GroupSession]:
        """
        Get group by share code.

        Args:
            share_code: Short share code (e.g., "ABC123XY")

        Returns:
            GroupSession object or None
        """
        result = await self.db.execute(
            select(GroupSession)
            .options(selectinload(GroupSession.members))
            .where(GroupSession.share_code == share_code)
            .where(GroupSession.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_active_group_by_table(self, table_id: int) -> Optional[GroupSession]:
        """
        Get active group for a table.

        Args:
            table_id: ID of the table

        Returns:
            GroupSession object or None
        """
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"[DEBUG GroupService] Querying active group for table_id={table_id}")

        result = await self.db.execute(
            select(GroupSession)
            .options(selectinload(GroupSession.members))
            .where(GroupSession.table_id == table_id)
            .where(GroupSession.status == GroupSessionStatus.ACTIVE)
            .where(GroupSession.is_active == True)
            .order_by(GroupSession.created_at.desc())
        )
        group = result.scalar_one_or_none()

        if group:
            logger.info(f"[DEBUG GroupService] Found group: group_id={group.group_id}, status={group.status}, is_active={group.is_active}")
        else:
            logger.info(f"[DEBUG GroupService] No group found for table_id={table_id}")

        return group

    async def get_group_members(self, group_id: str) -> List[GroupMember]:
        """
        Get all members of a group.

        Args:
            group_id: Group ID (UUID)

        Returns:
            List of GroupMember objects
        """
        group = await self.get_group_by_id(group_id)
        if not group:
            raise GroupNotFoundError(f"Group {group_id} not found")

        return group.members

    async def close_group(self, group_id: str, reason: str = None) -> GroupSession:
        """
        Close a group (no new members allowed).

        Args:
            group_id: Group ID (UUID)
            reason: Optional reason for closing

        Returns:
            Updated GroupSession object

        Raises:
            GroupNotFoundError: If group not found
        """
        group = await self.get_group_by_id(group_id)
        if not group:
            raise GroupNotFoundError(f"Group {group_id} not found")

        group.status = GroupSessionStatus.CLOSED
        group.closed_at = get_utc_now()
        if reason:
            group.group_metadata = group.group_metadata or {}
            group.group_metadata['close_reason'] = reason

        await self.db.commit()
        await self.db.refresh(group)

        return group

    async def update_group_status(
        self,
        group_id: str,
        status: GroupSessionStatus
    ) -> GroupSession:
        """
        Update group status.

        Args:
            group_id: Group ID (UUID)
            status: New status

        Returns:
            Updated GroupSession object

        Raises:
            GroupNotFoundError: If group not found
        """
        group = await self.get_group_by_id(group_id)
        if not group:
            raise GroupNotFoundError(f"Group {group_id} not found")

        group.status = status
        if status == GroupSessionStatus.PAID:
            group.paid_at = get_utc_now()

        await self.db.commit()
        await self.db.refresh(group)

        return group

    async def update_group_settings(
        self,
        group_id: str,
        auto_approve_joins: bool = None,
        max_members: int = None
    ) -> GroupSession:
        """
        Update group settings.

        Args:
            group_id: Group ID (UUID)
            auto_approve_joins: New auto-approve setting (optional)
            max_members: New max members (optional)

        Returns:
            Updated GroupSession object

        Raises:
            GroupNotFoundError: If group not found
        """
        group = await self.get_group_by_id(group_id)
        if not group:
            raise GroupNotFoundError(f"Group {group_id} not found")

        if auto_approve_joins is not None:
            group.auto_approve_joins = auto_approve_joins

        if max_members is not None:
            group.max_members = max_members

        await self.db.commit()
        await self.db.refresh(group)

        return group

    async def get_all_active_groups(self) -> List[GroupSession]:
        """
        Get all active groups (for admin dashboard).

        Returns:
            List of active GroupSession objects
        """
        result = await self.db.execute(
            select(GroupSession)
            .options(selectinload(GroupSession.members))
            .where(GroupSession.status == GroupSessionStatus.ACTIVE)
            .where(GroupSession.is_active == True)
            .order_by(GroupSession.created_at.desc())
        )
        return result.scalars().all()

    async def get_group_statistics(
        self,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> dict:
        """
        Get group statistics for analytics.

        Args:
            start_date: Start of date range (default: 24 hours ago)
            end_date: End of date range (default: now)

        Returns:
            Dictionary with group statistics
        """
        if not start_date:
            start_date = get_utc_now() - timedelta(hours=24)
        if not end_date:
            end_date = get_utc_now()

        # Total groups in period
        result = await self.db.execute(
            select(GroupSession)
            .options(selectinload(GroupSession.members))
            .where(GroupSession.created_at >= start_date)
            .where(GroupSession.created_at <= end_date)
            .where(GroupSession.is_active == True)
        )
        all_groups = result.scalars().all()

        # Calculate statistics
        total_groups = len(all_groups)
        active_groups = len([g for g in all_groups if g.status == GroupSessionStatus.ACTIVE])
        closed_groups = len([g for g in all_groups if g.status == GroupSessionStatus.CLOSED])
        paid_groups = len([g for g in all_groups if g.status == GroupSessionStatus.PAID])

        # Payment type breakdown
        by_payment_type = {
            PaymentType.HOST_PAYS_ALL: 0,
            PaymentType.INDIVIDUAL: 0,
            PaymentType.HYBRID: 0
        }
        for group in all_groups:
            by_payment_type[group.payment_type] = by_payment_type.get(group.payment_type, 0) + 1

        # Total members
        total_members = 0
        for group in all_groups:
            total_members += len(group.members) if group.members else 0

        avg_members = total_members / total_groups if total_groups > 0 else 0

        return {
            "total_groups": total_groups,
            "active_groups": active_groups,
            "closed_groups": closed_groups,
            "paid_groups": paid_groups,
            "total_members": total_members,
            "average_members_per_group": round(avg_members, 1),
            "by_payment_type": {k.value: v for k, v in by_payment_type.items()},
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat()
        }

    # =========================
    # JOIN REQUEST METHODS
    # =========================

    async def create_join_request(
        self,
        group_id: str,
        requester_session_id: str,
        requester_name: str = None,
        message: str = None,
        requester_participant_id: int = None
    ) -> JoinRequest:
        """
        Create a join request for a group.

        If group has auto_approve_joins enabled, automatically approves and adds member.

        Args:
            group_id: Group ID (UUID)
            requester_session_id: Requester's session ID
            requester_name: Optional requester name
            message: Optional message to host
            requester_participant_id: Optional requester participant ID (for session pooling)

        Returns:
            Created JoinRequest object

        Raises:
            GroupNotFoundError: If group not found
            ValueError: If already a member or has pending request
        """
        # Get the group
        group = await self.get_group_by_id(group_id)
        if not group:
            raise GroupNotFoundError(f"Group {group_id} not found")

        # Check if group is still accepting members
        if group.status != GroupSessionStatus.ACTIVE:
            raise ValueError("Group is no longer accepting new members")

        # Check if group is at max capacity
        member_count = len(group.members) if group.members else 0
        if member_count >= group.max_members:
            raise ValueError("Group has reached maximum capacity")

        # Check if already a member
        # For session pooling, use participant_id for the check (with fallback to session_id)
        for member in group.members or []:
            if requester_participant_id:
                # Use participant_id for session pooling
                if member.participant_id == requester_participant_id:
                    raise ValueError("Already a member of this group")
            elif member.session_id == requester_session_id:
                # Fallback to session_id for backward compatibility
                raise ValueError("Already a member of this group")

        # Check for existing pending request
        # Use participant_id for session pooling (with fallback to session_id)
        if requester_participant_id:
            existing = await self.get_join_request_by_participant(requester_participant_id, group.id)
        else:
            existing = await self.get_join_request_by_session(requester_session_id, group.id)
        if existing and existing.status == JoinRequestStatus.PENDING:
            raise ValueError("Already have a pending request for this group")

        # Create the request
        join_request = JoinRequest(
            request_id=str(uuid.uuid4()),
            group_session_id=group.id,
            requester_session_id=requester_session_id,
            requester_name=requester_name,
            message=message,
            status=JoinRequestStatus.PENDING,
            created_at=get_utc_now(),
            timeout_at=get_utc_now() + timedelta(minutes=5),
            participant_id=requester_participant_id
        )

        self.db.add(join_request)
        await self.db.commit()
        await self.db.refresh(join_request)

        # Auto-approve if enabled
        if group.auto_approve_joins:
            return await self.approve_join_request(join_request.request_id)

        return join_request

    async def get_pending_requests(self, group_id: str) -> List[JoinRequest]:
        """
        Get all pending join requests for a group.

        Args:
            group_id: Group ID (UUID)

        Returns:
            List of pending JoinRequest objects
        """
        group = await self.get_group_by_id(group_id)
        if not group:
            raise GroupNotFoundError(f"Group {group_id} not found")

        result = await self.db.execute(
            select(JoinRequest)
            .where(JoinRequest.group_session_id == group.id)
            .where(JoinRequest.status == JoinRequestStatus.PENDING)
            .where(JoinRequest.is_active == True)
            .order_by(JoinRequest.created_at.asc())
        )
        return result.scalars().all()

    async def approve_join_request(self, request_id: str) -> JoinRequest:
        """
        Approve a join request and add the requester as a group member.

        Args:
            request_id: Request ID (UUID)

        Returns:
            Updated JoinRequest object

        Raises:
            ValueError: If request not found or not pending
        """
        result = await self.db.execute(
            select(JoinRequest)
            .where(JoinRequest.request_id == request_id)
            .where(JoinRequest.is_active == True)
        )
        join_request = result.scalar_one_or_none()

        if not join_request:
            raise ValueError(f"Request {request_id} not found")

        if join_request.status != JoinRequestStatus.PENDING:
            raise ValueError("Request is no longer pending")

        # Get the group to add the member
        group_result = await self.db.execute(
            select(GroupSession)
            .options(selectinload(GroupSession.members))
            .where(GroupSession.id == join_request.group_session_id)
        )
        group = group_result.scalar_one_or_none()

        if not group:
            raise ValueError("Group no longer exists")

        # Check capacity again
        member_count = len(group.members) if group.members else 0
        if member_count >= group.max_members:
            # Auto-decline if full
            join_request.status = JoinRequestStatus.DECLINED
            join_request.responded_at = get_utc_now()
            join_request.response_reason = "Group reached maximum capacity"
            await self.db.commit()
            await self.db.refresh(join_request)
            return join_request

        # Approve the request
        join_request.status = JoinRequestStatus.APPROVED
        join_request.responded_at = get_utc_now()

        # Add as group member
        new_member = GroupMember(
            group_session_id=group.id,
            session_id=join_request.requester_session_id,
            participant_id=join_request.participant_id,
            name=join_request.requester_name,
            has_joined=True,
            order_subtotal=0,
            joined_at=get_utc_now()
        )
        self.db.add(new_member)

        await self.db.commit()
        await self.db.refresh(join_request)

        return join_request

    async def decline_join_request(
        self,
        request_id: str,
        reason: str = None
    ) -> JoinRequest:
        """
        Decline a join request.

        Args:
            request_id: Request ID (UUID)
            reason: Optional reason for declining

        Returns:
            Updated JoinRequest object

        Raises:
            ValueError: If request not found or not pending
        """
        result = await self.db.execute(
            select(JoinRequest)
            .where(JoinRequest.request_id == request_id)
            .where(JoinRequest.is_active == True)
        )
        join_request = result.scalar_one_or_none()

        if not join_request:
            raise ValueError(f"Request {request_id} not found")

        if join_request.status != JoinRequestStatus.PENDING:
            raise ValueError("Request is no longer pending")

        join_request.status = JoinRequestStatus.DECLINED
        join_request.responded_at = get_utc_now()
        join_request.response_reason = reason

        await self.db.commit()
        await self.db.refresh(join_request)

        return join_request

    async def get_join_request_by_session(
        self,
        session_id: str,
        group_session_id: int = None
    ) -> Optional[JoinRequest]:
        """
        Get a join request by requester session ID.

        Args:
            session_id: Requester's session ID
            group_session_id: Optional group session ID to filter by

        Returns:
            JoinRequest object or None
        """
        query = (
            select(JoinRequest)
            .where(JoinRequest.requester_session_id == session_id)
            .where(JoinRequest.is_active == True)
        )

        if group_session_id:
            query = query.where(JoinRequest.group_session_id == group_session_id)

        query = query.order_by(JoinRequest.created_at.desc())

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_join_request_by_id(self, request_id: str) -> Optional[JoinRequest]:
        """
        Get a join request by its request_id.

        Args:
            request_id: Request ID (UUID)

        Returns:
            JoinRequest object or None
        """
        result = await self.db.execute(
            select(JoinRequest)
            .where(JoinRequest.request_id == request_id)
            .where(JoinRequest.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_join_request_by_participant(
        self,
        participant_id: int,
        group_session_id: int = None
    ) -> Optional[JoinRequest]:
        """
        Get a join request by participant ID (for session pooling).

        Args:
            participant_id: Requester's participant ID
            group_session_id: Optional group session ID to filter by

        Returns:
            JoinRequest object or None
        """
        query = (
            select(JoinRequest)
            .where(JoinRequest.participant_id == participant_id)
            .where(JoinRequest.is_active == True)
        )

        if group_session_id:
            query = query.where(JoinRequest.group_session_id == group_session_id)

        query = query.order_by(JoinRequest.created_at.desc())

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def add_member_to_group(
        self,
        group_id: str,
        session_id: str = None,
        name: str = None,
        participant_id: int = None
    ) -> GroupMember:
        """
        Directly add a member to a group (for host adding members).

        Args:
            group_id: Group ID (UUID)
            session_id: Member's session ID (optional, for backward compatibility)
            name: Optional member name
            participant_id: Optional participant ID (for session pooling)

        Returns:
            Created GroupMember object
        """
        group = await self.get_group_by_id(group_id)
        if not group:
            raise GroupNotFoundError(f"Group {group_id} not found")

        # Check if already a member
        if participant_id:
            for member in group.members or []:
                if member.participant_id == participant_id:
                    raise ValueError("Already a member of this group")
        elif session_id:
            for member in group.members or []:
                if member.session_id == session_id:
                    raise ValueError("Already a member of this group")

        member = GroupMember(
            group_session_id=group.id,
            session_id=session_id,
            participant_id=participant_id,
            name=name,
            has_joined=True,
            order_subtotal=0,
            joined_at=get_utc_now()
        )

        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)

        return member

