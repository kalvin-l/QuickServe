"""
Timezone Configuration for QuickServe
Uses Philippines Time (Asia/Manila, UTC+8)

BEST PRACTICE: Store all timestamps in UTC in the database.
Convert to Philippines time only when displaying to users.
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import os

# Philippines Timezone (UTC+8, no daylight saving time)
PHILIPPINES_TZ = ZoneInfo("Asia/Manila")

# Environment variable override (optional)
TIMEZONE_ENV = os.getenv("TIMEZONE", "Asia/Manila")


def get_utc_now() -> datetime:
    """
    Get current time in UTC (for database storage).

    Returns:
        datetime: Current time in UTC
    """
    return datetime.now(timezone.utc)


def get_philippines_time() -> datetime:
    """
    Get current time in Philippines timezone.

    Returns:
        datetime: Current time in Asia/Manila timezone
    """
    return datetime.now(PHILIPPINES_TZ)


def utc_to_philippines(utc_datetime: datetime) -> datetime:
    """
    Convert UTC datetime to Philippines time.

    Args:
        utc_datetime: UTC datetime to convert

    Returns:
        datetime: Converted to Philippines timezone
    """
    if utc_datetime.tzinfo is None:
        # Assume naive datetime is UTC
        utc_datetime = utc_datetime.replace(tzinfo=timezone.utc)
    return utc_datetime.astimezone(PHILIPPINES_TZ)


def to_philippines_time(dt: datetime) -> datetime:
    """
    Convert any datetime to Philippines time.
    If datetime is naive, assumes UTC.

    Args:
        dt: datetime to convert

    Returns:
        datetime: Converted to Philippines timezone
    """
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(PHILIPPINES_TZ)


def serialize_datetime(dt: datetime | None) -> str | None:
    """
    Serialize datetime to ISO format with UTC timezone.
    This ensures all API responses use consistent UTC timestamps.

    Args:
        dt: datetime to serialize

    Returns:
        ISO 8601 string with UTC timezone (e.g., "2025-02-14T15:00:00+00:00")
    """
    if dt is None:
        return None
    # Ensure datetime is timezone-aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    # Convert to UTC and serialize
    utc_dt = dt.astimezone(timezone.utc)
    return utc_dt.isoformat()


def get_timezone_name() -> str:
    """
    Get the timezone name for display purposes.

    Returns:
        str: Timezone name "Asia/Manila"
    """
    return "Asia/Manila"


def get_timezone_offset() -> str:
    """
    Get the UTC offset for Philippines time.

    Returns:
        str: UTC offset string like "UTC+08:00"
    """
    # Get current offset
    offset = datetime.now(PHILIPPINES_TZ).utcoffset()
    total_seconds = offset.total_seconds()
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)

    sign = "+" if hours >= 0 else "-"
    return f"UTC{sign}{abs(hours):02d}:{minutes:02d}"
