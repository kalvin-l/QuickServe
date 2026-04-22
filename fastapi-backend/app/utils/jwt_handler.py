"""
JWT Handler for QR Code and Admin Authentication

Secure token generation and validation for table QR codes and admin users.
Tokens are signed with a secret key and include expiration.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import HTTPException
import secrets
from app.utils.timezone_config import get_utc_now
from app.core.config import settings

# JWT Configuration
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

# Token expiration (4 hours for a typical restaurant shift)
TOKEN_EXPIRATION_HOURS = 4

# Admin token expiration (24 hours - full day)
ADMIN_TOKEN_EXPIRATION_HOURS = 24


def generate_table_token(
    table_id: int,
    table_number: int,
    expiration_hours: Optional[int] = None
) -> str:
    """
    Generate a JWT token for table QR code access.

    Args:
        table_id: Database ID of the table
        table_number: Human-readable table number
        expiration_hours: Custom expiration (default: TOKEN_EXPIRATION_HOURS)

    Returns:
        JWT token string
    """
    expiration = expiration_hours or TOKEN_EXPIRATION_HOURS

    # Generate unique session ID for this token
    session_id = secrets.token_urlsafe(32)

    payload = {
        "table_id": table_id,
        "table_number": table_number,
        "session_id": session_id,
        "iat": get_utc_now(),
        "exp": get_utc_now() + timedelta(hours=expiration),
        "type": "table_qr"
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def validate_table_token(token: str) -> Dict[str, Any]:
    """
    Validate a JWT token and return its payload.

    Args:
        token: JWT token string

    Returns:
        Dict with table_id, table_number, session_id

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Verify token type
        if payload.get("type") != "table_qr":
            raise HTTPException(
                status_code=401,
                detail="Invalid token type"
            )

        # Verify required fields
        if "table_id" not in payload or "table_number" not in payload:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload"
            )

        return {
            "table_id": payload["table_id"],
            "table_number": payload["table_number"],
            "session_id": payload.get("session_id"),
            "exp": payload.get("exp")
        }

    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}"
        )


def generate_qr_url(token: str, frontend_url: str) -> str:
    """
    Generate the full URL to encode in QR code.

    Args:
        token: JWT token
        frontend_url: Frontend base URL (e.g., http://localhost:3000)

    Returns:
        Full URL for QR code (e.g., http://localhost:3000/scan?token=...)
    """
    return f"{frontend_url}/scan?token={token}"


def verify_session_token(token: str, expected_session_id: str) -> bool:
    """
    Verify that a token matches the expected session ID.

    Args:
        token: JWT token
        expected_session_id: Expected session ID

    Returns:
        True if valid and matches
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("session_id") == expected_session_id
    except JWTError:
        return False


# ==================== ADMIN TOKEN FUNCTIONS ====================

def generate_admin_token(
    admin_id: int,
    email: str,
    role: str,
    departments: Optional[list] = None,
    expiration_hours: Optional[int] = None
) -> str:
    """
    Generate a JWT token for admin authentication.

    Args:
        admin_id: Database ID of admin user
        email: Admin email
        role: Admin role
        departments: List of departments the user belongs to (e.g., ["barista", "kitchen"])
        expiration_hours: Custom expiration (default: ADMIN_TOKEN_EXPIRATION_HOURS)

    Returns:
        JWT token string
    """
    expiration = expiration_hours or ADMIN_TOKEN_EXPIRATION_HOURS

    payload = {
        "admin_id": admin_id,
        "email": email,
        "role": role,
        "departments": departments or [],
        "iat": get_utc_now(),
        "exp": get_utc_now() + timedelta(hours=expiration),
        "type": "admin_auth"
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def validate_admin_token(token: str) -> Dict[str, Any]:
    """
    Validate an admin JWT token and return its payload.

    Args:
        token: JWT token string

    Returns:
        Dict with admin_id, email, role, departments, exp

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Verify token type
        if payload.get("type") != "admin_auth":
            raise HTTPException(
                status_code=401,
                detail="Invalid token type"
            )

        # Verify required fields
        if "admin_id" not in payload or "email" not in payload:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload"
            )

        return {
            "admin_id": payload["admin_id"],
            "email": payload["email"],
            "role": payload.get("role", "staff"),
            "departments": payload.get("departments", []),
            "exp": payload.get("exp")
        }

    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {str(e)}"
        )
