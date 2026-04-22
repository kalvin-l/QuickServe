"""
Capacity Service
Track table capacity for coffee shop
"""

from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.table import Table, TableLocation, TableStatus
from app.services.session_service import SessionService


class CapacityService:
    """
    Track table capacity for coffee shop.

    For Raspberry Pi: Keep it simple (no complex algorithms needed)
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.session_service = SessionService(db)

    async def get_capacity_summary(self) -> Dict:
        """
        Return capacity summary for admin dashboard.

        Example output:
        {
            "total_tables": 20,
            "available_tables": 15,
            "occupied_tables": 5,
            "active_sessions": 5,
            "total_capacity": 80,
            "current_occupancy": 18,
            "occupancy_percent": 22.5
        }

        Returns:
            Dictionary with capacity metrics
        """
        # Get all active tables
        result = await self.db.execute(
            select(Table).where(Table.is_active == True)
        )
        tables = result.scalars().all()

        # Get active sessions
        active_sessions = await self.session_service.get_all_active_sessions()

        total_tables = len(tables)
        occupied_tables = len(active_sessions)
        total_capacity = sum(t.capacity for t in tables)
        current_occupancy = sum(s.customer_count or 0 for s in active_sessions)

        return {
            "total_tables": total_tables,
            "available_tables": total_tables - occupied_tables,
            "occupied_tables": occupied_tables,
            "active_sessions": occupied_tables,
            "total_capacity": total_capacity,
            "current_occupancy": current_occupancy,
            "occupancy_percent": round(
                (current_occupancy / total_capacity * 100) if total_capacity > 0 else 0, 1
            )
        }

    async def get_capacity_by_location(self) -> Dict[str, Dict]:
        """
        Return capacity breakdown by location.

        Example output:
        {
            "Indoor": {
                "total_tables": 10,
                "available_tables": 7,
                "occupied_tables": 3,
                "total_capacity": 40,
                "current_occupancy": 10
            },
            "Outdoor": { ... }
        }

        Returns:
            Dictionary mapping locations to their capacity metrics
        """
        # Get all active tables grouped by location
        result = await self.db.execute(
            select(Table).where(Table.is_active == True)
        )
        tables = result.scalars().all()

        # Get active sessions
        active_sessions = await self.session_service.get_all_active_sessions()
        occupied_table_ids = {s.table_id for s in active_sessions}

        # Group tables by location
        location_data = {}
        for table in tables:
            location = table.location.value if hasattr(table.location, 'value') else str(table.location)

            if location not in location_data:
                location_data[location] = {
                    "total_tables": 0,
                    "available_tables": 0,
                    "occupied_tables": 0,
                    "total_capacity": 0,
                    "current_occupancy": 0
                }

            location_data[location]["total_tables"] += 1
            location_data[location]["total_capacity"] += table.capacity

            if table.id in occupied_table_ids:
                location_data[location]["occupied_tables"] += 1
                # Find session for this table to get customer count
                session = next((s for s in active_sessions if s.table_id == table.id), None)
                if session:
                    location_data[location]["current_occupancy"] += session.customer_count or 0
            else:
                location_data[location]["available_tables"] += 1

        return location_data

    async def get_available_tables(
        self,
        location: str = None,
        min_capacity: int = None
    ) -> List[Table]:
        """
        Get tables that can accept new customers.

        Args:
            location: Optional filter by location (Indoor, Outdoor, Bar, etc.)
            min_capacity: Optional minimum capacity required

        Returns:
            List of available Table objects
        """
        active_sessions = await self.session_service.get_all_active_sessions()
        occupied_table_ids = {s.table_id for s in active_sessions}

        # Build query
        query = select(Table).where(Table.is_active == True)

        if occupied_table_ids:
            query = query.where(Table.id.notin_(occupied_table_ids))

        if location:
            query = query.where(Table.location == location)

        if min_capacity:
            query = query.where(Table.capacity >= min_capacity)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_table_status(self, table_id: int) -> Dict:
        """
        Get detailed status of a specific table.

        Args:
            table_id: ID of the table

        Returns:
            Dictionary with table status details
        """
        # Get table
        result = await self.db.execute(
            select(Table).where(Table.id == table_id)
        )
        table = result.scalar_one_or_none()

        if not table:
            return None

        # Get active session
        session = await self.session_service.get_active_session(table_id)

        return {
            "table_id": table.id,
            "table_number": table.table_number,
            "location": str(table.location),
            "capacity": table.capacity,
            "status": str(table.status),
            "is_occupied": session is not None,
            "available_seats": table.capacity - (session.customer_count if session else 0),
            "session": session.to_dict() if session else None
        }

    async def can_seat_party(
        self,
        party_size: int,
        location: str = None
    ) -> bool:
        """
        Check if there's a table available for a party of X people.

        Args:
            party_size: Number of people in the party
            location: Optional location filter

        Returns:
            True if a suitable table is available, False otherwise
        """
        available_tables = await self.get_available_tables(
            location=location,
            min_capacity=party_size
        )
        return len(available_tables) > 0

    async def recommend_table(
        self,
        party_size: int,
        location: str = None
    ) -> Table:
        """
        Recommend the best available table for a party.

        Recommendation logic:
        - Prefer tables with capacity close to party size (don't waste large tables)
        - If multiple tables fit, choose smallest suitable table

        Args:
            party_size: Number of people in the party
            location: Optional location filter

        Returns:
            Recommended Table object or None if no suitable table
        """
        available_tables = await self.get_available_tables(
            location=location,
            min_capacity=party_size
        )

        if not available_tables:
            return None

        # Sort by capacity (ascending) to recommend smallest suitable table
        available_tables.sort(key=lambda t: t.capacity)

        return available_tables[0]

    async def get_all_tables_status(self) -> List[Dict]:
        """
        Get status of all tables for dashboard display.

        Returns:
            List of table status dictionaries
        """
        # Get all tables
        result = await self.db.execute(
            select(Table).where(Table.is_active == True)
            .order_by(Table.table_number)
        )
        tables = result.scalars().all()

        # Get all active sessions
        active_sessions = await self.session_service.get_all_active_sessions()
        sessions_by_table = {s.table_id: s for s in active_sessions}

        # Build status list
        statuses = []
        for table in tables:
            session = sessions_by_table.get(table.id)

            statuses.append({
                "id": table.id,
                "table_number": table.table_number,
                "location": str(table.location),
                "capacity": table.capacity,
                "status": "occupied" if session else "available",
                "customer_count": session.customer_count if session else 0,
                "session_id": session.session_id if session else None,
                "session_duration_minutes": self._calculate_session_duration(session) if session else 0
            })

        return statuses

    def _calculate_session_duration(self, session) -> int:
        """Calculate session duration in minutes"""
        if not session or not session.started_at:
            return 0

        now = session.last_activity_at or session.started_at
        delta = now - session.started_at
        return int(delta.total_seconds() / 60)
