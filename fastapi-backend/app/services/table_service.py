"""
Table Service
Business logic for table operations
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc
from typing import Optional, List, Dict
from datetime import datetime, timezone
from io import BytesIO
from app.utils.timezone_config import get_utc_now
from app.utils.qr_url_builder import build_table_qr_url, QRURLBuilder
import secrets
from app.models.table import Table, TableLocation, TableStatus
from app.models.table_session import TableSession, SessionStatus
from app.models.qr_scan_log import QRScanLog
from app.schemas.table import TableCreate, TableUpdate, TableListParams
from app.utils.qr_generator import generate_qr_image, generate_print_template, generate_batch_qr_codes
from app.utils.jwt_handler import generate_table_token, generate_qr_url, validate_table_token
from fastapi import HTTPException, Request


class TableService:
    """Service for table business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # === QR Code Generation Helpers ===

    @staticmethod
    def _generate_qr_code(table_number: int) -> str:
        """Generate QR code in format: QS-TABLE-{number}"""
        return f"QS-TABLE-{table_number}"

    def _generate_jwt_qr_url(self, table: Table) -> str:
        """
        Generate direct QR URL for a table with secure QR token.

        Uses the 20-character qr_token (secret) instead of access_code.
        The access_code is only shown on the table card for manual entry backup.

        Args:
            table: The Table model instance

        Returns:
            Full URL with QR token (e.g., http://192.168.8.125:3000/table/10?token=abc123xyz...)

        Raises:
            ValueError: If FRONTEND_URL is not configured in .env file

        Note:
            The FRONTEND_URL must be configured in the .env file.
            Example: FRONTEND_URL=http://192.168.8.125:3000
        """
        # Use the centralized QR URL builder
        return QRURLBuilder.build_table_qr_url(table)

    @staticmethod
    def _generate_qr_token() -> str:
        """
        Generate secure random token for QR validation
        20 characters, no ambiguous chars (0/O, 1/l/I)
        """
        alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        return ''.join(secrets.choice(alphabet) for _ in range(20))

    @staticmethod
    def _generate_access_code() -> str:
        """
        Generate 6-character access code (backup for QR)
        No vowels to prevent accidental words, uppercase only
        """
        alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
        return ''.join(secrets.choice(alphabet) for _ in range(6))

    # === CRUD Operations ===

    async def create_table(self, data: TableCreate) -> Table:
        """
        Create a new table with auto-generated QR codes
        """
        # Check if table_number already exists
        existing = await self.db.execute(
            select(Table).where(Table.table_number == data.table_number)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Table {data.table_number} already exists"
            )

        # Auto-generate QR codes if not provided
        qr_code = data.qr_code or self._generate_qr_code(data.table_number)
        qr_token = self._generate_qr_token()
        access_code = data.access_code or self._generate_access_code()

        # Check if qr_code already exists
        existing_qr = await self.db.execute(
            select(Table).where(Table.qr_code == qr_code)
        )
        if existing_qr.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"QR code {qr_code} already exists"
            )

        # Create table
        table = Table(
            table_number=data.table_number,
            location=data.location,
            capacity=data.capacity,
            qr_code=qr_code,
            qr_token=qr_token,
            access_code=access_code,
            status=data.status
        )

        self.db.add(table)
        await self.db.commit()
        await self.db.refresh(table)

        return table

    async def get_all_tables(self, params: TableListParams) -> dict:
        """
        Get all tables with filters, sorting, and pagination
        """
        # Build query
        query = select(Table).where(Table.is_active == params.is_active)

        # Apply filters
        if params.location:
            query = query.where(Table.location == params.location)
        if params.status:
            query = query.where(Table.status == params.status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply sorting
        sort_column = getattr(Table, params.sort_by, Table.table_number)
        sort_order = desc(sort_column) if params.order == "desc" else asc(sort_column)
        query = query.order_by(sort_order)

        # Apply pagination
        offset = (params.page - 1) * params.page_size
        query = query.offset(offset).limit(params.page_size)

        # Execute query
        result = await self.db.execute(query)
        tables = result.scalars().all()

        # Calculate pagination metadata
        total_pages = (total + params.page_size - 1) // params.page_size if total > 0 else 0

        return {
            "items": list(tables),
            "total": total,
            "page": params.page,
            "page_size": params.page_size,
            "total_pages": total_pages,
            "has_next": params.page < total_pages,
            "has_prev": params.page > 1
        }

    async def get_table_by_id(self, table_id: int) -> Optional[Table]:
        """Get a single table by ID"""
        query = select(Table).where(Table.id == table_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_table_by_number(self, table_number: int) -> Optional[Table]:
        """Get a table by table number"""
        query = select(Table).where(Table.table_number == table_number)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_table_by_qr_code(self, qr_code: str) -> Optional[Table]:
        """Get a table by QR code"""
        query = select(Table).where(Table.qr_code == qr_code)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_table(self, table_id: int, data: TableUpdate) -> Optional[Table]:
        """Update an existing table"""
        table = await self.get_table_by_id(table_id)
        if not table:
            return None

        # Check if new table_number conflicts
        if data.table_number is not None and data.table_number != table.table_number:
            existing = await self.db.execute(
                select(Table).where(
                    Table.table_number == data.table_number,
                    Table.id != table_id
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail=f"Table {data.table_number} already exists"
                )

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(table, field, value)

        await self.db.commit()
        await self.db.refresh(table)

        return table

    async def delete_table(self, table_id: int, hard_delete: bool = False) -> bool:
        """
        Delete a table (soft delete by default)
        hard_delete: Permanently remove from database
        """
        table = await self.get_table_by_id(table_id)
        if not table:
            return False

        if hard_delete:
            await self.db.delete(table)
        else:
            table.is_active = False

        await self.db.commit()
        return True

    # === QR Code Operations ===

    async def validate_qr_code(self, qr_code: str) -> dict:
        """
        Validate QR code and return table info
        Returns: {valid: bool, table: dict or None}
        """
        table = await self.get_table_by_qr_code(qr_code)

        if not table or not table.is_active:
            return {"valid": False, "table": None}

        return {
            "valid": True,
            "table": table
        }

    async def regenerate_qr_codes(self, table_id: int) -> Table:
        """
        Regenerate QR codes (qr_code, qr_token, access_code)
        Use this when QR codes are compromised
        """
        table = await self.get_table_by_id(table_id)
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        # Generate new codes
        new_qr_code = self._generate_qr_code(table.table_number)
        new_qr_token = self._generate_qr_token()
        new_access_code = self._generate_access_code()

        # Update table
        table.qr_code = new_qr_code
        table.qr_token = new_qr_token
        table.access_code = new_access_code

        await self.db.commit()
        await self.db.refresh(table)

        return table

    async def update_table_status(self, table_id: int, status: TableStatus) -> Optional[Table]:
        """Update table status"""
        table = await self.get_table_by_id(table_id)
        if not table:
            return None

        table.status = status
        await self.db.commit()
        await self.db.refresh(table)

        return table

    # === Occupancy Calculation ===

    async def calculate_occupancy(self, table_id: int) -> int:
        """
        Calculate current occupancy for a table.

        Sums customer_count from all active sessions for this table.

        Args:
            table_id: ID of the table

        Returns:
            Total occupied seats (0 if no active sessions)
        """
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"[DEBUG calculate_occupancy] Calculating for table_id={table_id}")

        result = await self.db.execute(
            select(func.coalesce(func.sum(TableSession.customer_count), 0))
            .where(TableSession.table_id == table_id)
            .where(TableSession.status == SessionStatus.ACTIVE)
            .where(TableSession.is_active == True)
        )
        occupancy = result.scalar() or 0

        logger.info(f"[DEBUG calculate_occupancy] Result for table_id={table_id}: {occupancy}")

        return occupancy

    async def calculate_occupancy_batch(self, table_ids: List[int]) -> Dict[int, int]:
        """
        Calculate occupancy for multiple tables in a single query (avoids N+1).

        Args:
            table_ids: List of table IDs

        Returns:
            Dict mapping table_id -> occupied count
        """
        if not table_ids:
            return {}

        result = await self.db.execute(
            select(
                TableSession.table_id,
                func.coalesce(func.sum(TableSession.customer_count), 0).label('occupied')
            )
            .where(TableSession.table_id.in_(table_ids))
            .where(TableSession.status == SessionStatus.ACTIVE)
            .where(TableSession.is_active == True)
            .group_by(TableSession.table_id)
        )

        # Convert to dict with 0 as default
        occupancy_map = {tid: 0 for tid in table_ids}
        for row in result:
            occupancy_map[row.table_id] = row.occupied or 0
        return occupancy_map

    def determine_status_from_occupancy(self, occupied: int, capacity: int) -> TableStatus:
        """
        Determine table status based on occupancy.

        Rules:
        - available: occupied == 0
        - partial: 0 < occupied < capacity
        - full: occupied >= capacity

        Note: Does not change CLEANING or OUT_OF_SERVICE statuses automatically.

        Args:
            occupied: Current occupied seats
            capacity: Table capacity

        Returns:
            Appropriate TableStatus
        """
        if occupied <= 0:
            return TableStatus.AVAILABLE
        elif occupied >= capacity:
            return TableStatus.FULL
        else:
            return TableStatus.PARTIAL

    async def update_table_status_from_occupancy(self, table_id: int) -> dict:
        """
        Update table status based on current occupancy.

        This is the main method to call when sessions change.
        Calculates occupancy, determines new status, and updates if needed.

        Args:
            table_id: ID of the table to update

        Returns:
            Dict with 'table', 'old_status', 'new_status', 'occupied', 'status_changed'
        """
        import logging
        logger = logging.getLogger(__name__)

        logger.info(f"[DEBUG update_table_status_from_occupancy] Called for table_id={table_id}")

        # Get table
        table = await self.get_table_by_id(table_id)
        if not table:
            logger.error(f"[DEBUG update_table_status_from_occupancy] Table {table_id} not found")
            raise ValueError(f"Table {table_id} not found")

        # Skip if table is in special status (cleaning, out_of_service)
        if table.status in [TableStatus.CLEANING, TableStatus.OUT_OF_SERVICE]:
            logger.info(f"[DEBUG update_table_status_from_occupancy] Skipping - table is in {table.status} status")
            return {
                "table": table,
                "old_status": table.status,
                "new_status": table.status,
                "occupied": 0,
                "status_changed": False,
                "skipped_reason": f"Table is in {table.status} status"
            }

        # Calculate occupancy
        occupied = await self.calculate_occupancy(table_id)

        # Determine new status
        old_status = table.status
        new_status = self.determine_status_from_occupancy(occupied, table.capacity)

        logger.info(f"[DEBUG update_table_status_from_occupancy] table_id={table_id}, occupied={occupied}, capacity={table.capacity}, old_status={old_status}, new_status={new_status}")

        # Update if changed
        status_changed = old_status != new_status
        if status_changed:
            table.status = new_status
            await self.db.commit()
            await self.db.refresh(table)
            logger.info(f"[DEBUG update_table_status_from_occupancy] Status updated in DB")

        return {
            "table": table,
            "old_status": old_status,
            "new_status": new_status,
            "occupied": occupied,
            "status_changed": status_changed
        }

    # === QR Image Generation ===

    async def generate_qr_code_image(
        self,
        table_id: int,
        size: str = "medium",
        include_color: bool = True
    ) -> BytesIO:
        """
        Generate QR code image for download.

        Args:
            table_id: Table ID
            size: Image size (small, medium, large)
            include_color: Use brand color

        Returns:
            BytesIO: PNG image data
        """
        query = select(Table).where(Table.id == table_id)
        result = await self.db.execute(query)
        table = result.scalar_one_or_none()

        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        # Generate JWT URL for QR code
        qr_url = self._generate_jwt_qr_url(table)

        return generate_qr_image(
            qr_data=qr_url,
            size=size,
            include_color=include_color
        )

    async def generate_qr_print_template(self, table_id: int) -> BytesIO:
        """
        Generate print-ready QR code template.

        Args:
            table_id: Table ID

        Returns:
            BytesIO: PNG image data
        """
        query = select(Table).where(Table.id == table_id)
        result = await self.db.execute(query)
        table = result.scalar_one_or_none()

        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        # Generate JWT URL for QR code
        qr_url = self._generate_jwt_qr_url(table)

        return generate_print_template(
            table_number=table.table_number,
            location=table.location.value,
            qr_data=qr_url,
            access_code=table.access_code
        )

    def generate_batch_qr_images(
        self,
        tables: List[Table],
        size: str = "medium"
    ) -> BytesIO:
        """
        Generate multiple QR codes as a single image.

        Args:
            tables: List of Table objects
            size: QR code size

        Returns:
            BytesIO: PNG image with all QR codes
        """
        # Convert tables to dict format with JWT URLs
        tables_data = [
            {
                "id": t.id,
                "table_number": t.table_number,
                "qr_code": self._generate_jwt_qr_url(t)
            }
            for t in tables
        ]

        return generate_batch_qr_codes(tables_data, size=size)

    # === QR Validation with Logging ===

    async def validate_qr_code_with_logging(
        self,
        qr_code: str,
        request: Request = None
    ) -> dict:
        """
        Validate QR code with logging and security checks.

        Args:
            qr_code: QR code to validate
            request: FastAPI Request object (for IP/User-Agent)

        Returns:
            {valid: bool, table: Table or None, error: str or None}
        """
        table = await self.get_table_by_qr_code(qr_code)

        # Get request metadata
        ip_address = None
        user_agent = None
        if request:
            # Get IP from X-Forwarded-For header if available (proxy/load balancer)
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                ip_address = forwarded.split(",")[0].strip()
            else:
                ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("User-Agent", "")[:500]

        # Validation checks
        if not table:
            # Log failed attempt
            await self._log_qr_scan(
                table_id=None,
                qr_code=qr_code,
                ip_address=ip_address,
                user_agent=user_agent,
                result="failed"
            )
            return {"valid": False, "table": None, "error": "QR code not found"}

        if not table.is_active:
            await self._log_qr_scan(
                table_id=table.id,
                qr_code=qr_code,
                ip_address=ip_address,
                user_agent=user_agent,
                result="failed"
            )
            return {"valid": False, "table": None, "error": "Table is inactive"}

        # Check expiration
        if table.qr_expires_at:
            if get_utc_now() > table.qr_expires_at:
                await self._log_qr_scan(
                    table_id=table.id,
                    qr_code=qr_code,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    result="expired"
                )
                return {"valid": False, "table": None, "error": "QR code has expired"}

        # Update scan count
        table.qr_scan_count += 1
        table.qr_last_scanned = get_utc_now()

        # Log successful scan
        await self._log_qr_scan(
            table_id=table.id,
            qr_code=qr_code,
            ip_address=ip_address,
            user_agent=user_agent,
            result="success"
        )

        await self.db.commit()
        await self.db.refresh(table)

        return {"valid": True, "table": table, "error": None}

    async def validate_access_code(self, access_code: str) -> dict:
        """
        Validate access code (manual entry backup).

        Args:
            access_code: 6-character access code

        Returns:
            {valid: bool, table: Table or None}
        """
        query = select(Table).where(
            Table.access_code == access_code,
            Table.is_active == True
        )
        result = await self.db.execute(query)
        table = result.scalar_one_or_none()

        if not table:
            return {"valid": False, "table": None}

        # Check expiration
        if table.qr_expires_at:
            if get_utc_now() > table.qr_expires_at:
                return {"valid": False, "table": None}

        return {"valid": True, "table": table}

    async def get_scan_analytics(self, table_id: int) -> dict:
        """
        Get QR scan analytics for a table.

        Args:
            table_id: Table ID

        Returns:
            Analytics dict with total scans, last scanned, scans by day, unique IPs
        """
        table = await self.get_table_by_id(table_id)
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        # Get scan logs for this table
        query = select(QRScanLog).where(QRScanLog.table_id == table_id)
        result = await self.db.execute(query)
        logs = result.scalars().all()

        # Calculate analytics
        total_scans = len(logs)

        # Scans by day
        scans_by_day = {}
        unique_ips = set()

        for log in logs:
            # Group by day
            day_key = log.scanned_at.strftime("%Y-%m-%d")
            scans_by_day[day_key] = scans_by_day.get(day_key, 0) + 1

            # Track unique IPs
            if log.ip_address:
                unique_ips.add(log.ip_address)

        # Convert to list format
        scans_by_day_list = [
            {"date": date, "count": count}
            for date, count in sorted(scans_by_day.items())
        ]

        return {
            "table_id": table_id,
            "total_scans": total_scans,
            "last_scanned": table.qr_last_scanned,
            "scans_by_day": scans_by_day_list,
            "unique_ips": len(unique_ips)
        }

    async def set_qr_expiration(
        self,
        table_id: int,
        expires_at: Optional[datetime]
    ) -> Table:
        """
        Set or clear QR code expiration.

        Args:
            table_id: Table ID
            expires_at: Expiration datetime (None to clear)

        Returns:
            Updated table
        """
        table = await self.get_table_by_id(table_id)
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        table.qr_expires_at = expires_at
        await self.db.commit()
        await self.db.refresh(table)

        return table

    async def _log_qr_scan(
        self,
        table_id: Optional[int],
        qr_code: str,
        ip_address: Optional[str],
        user_agent: Optional[str],
        result: str
    ):
        """
        Log QR scan attempt.

        Args:
            table_id: Table ID (None if failed)
            qr_code: QR code that was scanned
            ip_address: Client IP address
            user_agent: Client user agent
            result: Validation result (success, failed, expired)
        """
        log = QRScanLog(
            table_id=table_id,
            qr_code=qr_code,
            ip_address=ip_address,
            user_agent=user_agent,
            validation_result=result
        )

        self.db.add(log)
        await self.db.commit()

    # === Statistics ===

    async def get_table_stats(self) -> dict:
        """
        Get aggregated table statistics
        Returns: {total, by_location, by_status, total_capacity, available_seats}
        """
        # Get all active tables
        query = select(Table).where(Table.is_active == True)
        result = await self.db.execute(query)
        tables = result.scalars().all()

        # Calculate stats
        total = len(tables)

        by_location = {
            TableLocation.INDOOR: 0,
            TableLocation.OUTDOOR: 0,
            TableLocation.PATIO: 0,
            TableLocation.BAR: 0
        }

        by_status = {
            TableStatus.AVAILABLE: 0,
            TableStatus.PARTIAL: 0,
            TableStatus.FULL: 0,
            TableStatus.CLEANING: 0,
            TableStatus.OUT_OF_SERVICE: 0
        }

        total_capacity = 0
        available_seats = 0

        for table in tables:
            by_location[table.location] += 1
            by_status[table.status] += 1
            total_capacity += table.capacity
            available_seats += table.available_seats

        return {
            "total": total,
            "by_location": {k.value: v for k, v in by_location.items()},
            "by_status": {k.value: v for k, v in by_status.items()},
            "total_capacity": total_capacity,
            "available_seats": available_seats
        }

    # === Response Helpers ===

    def _to_response(self, table: Table) -> dict:
        """Convert Table model to response dict (excludes qr_token)"""
        return {
            "id": table.id,
            "table_number": table.table_number,
            "location": table.location,
            "capacity": table.capacity,
            "qr_code": table.qr_code,
            "access_code": table.access_code,
            "status": table.status,
            "is_active": table.is_active,
            "occupied": table.occupied,
            "available_seats": table.available_seats,
            "created_at": table.created_at,
            "updated_at": table.updated_at
        }

    def _to_internal_response(self, table: Table) -> dict:
        """Convert Table model to internal response dict (includes qr_token)"""
        response = self._to_response(table)
        response["qr_token"] = table.qr_token
        return response
