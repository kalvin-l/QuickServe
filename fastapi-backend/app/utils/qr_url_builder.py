"""
QR URL Builder Utility

Centralized utility for constructing QR code URLs.
Uses application settings for configuration.
"""

from app.core.config import settings
from app.models.table import Table


class QRURLBuilder:
    """
    Builds URLs for QR codes.

    This class provides a centralized way to generate QR code URLs,
    ensuring consistency across the application and making it easy
    to change the base URL via configuration.
    """

    @staticmethod
    def get_frontend_url() -> str:
        """
        Get the frontend URL from settings.

        Returns:
            The frontend base URL (e.g., http://192.168.8.125:3000)

        Raises:
            ValueError: If FRONTEND_URL is not configured or is using localhost default
        """
        frontend_url = settings.FRONTEND_URL

        # Validate that we're not using the default localhost
        if frontend_url == "http://localhost:3000":
            raise ValueError(
                "FRONTEND_URL is not configured! "
                "Please set FRONTEND_URL in your .env file. "
                "Example: FRONTEND_URL=http://192.168.8.125:3000"
            )

        return frontend_url

    @staticmethod
    def build_table_qr_url(table: Table) -> str:
        """
        Build the QR code URL for a specific table.

        The URL includes the table number and a secure qr_token for validation.

        Args:
            table: The Table model instance

        Returns:
            Full URL string for QR code (e.g., http://192.168.8.125:3000/table/5?token=abc123...)

        Example:
            >>> from app.models.table import Table
            >>> table = Table(id=1, table_number=5, qr_token="abc123")
            >>> url = QRURLBuilder.build_table_qr_url(table)
            >>> print(url)
            'http://192.168.8.125:3000/table/5?token=abc123'
        """
        frontend_url = QRURLBuilder.get_frontend_url()

        # Use the secure qr_token (20-char secret) for validation
        # The access_code is only shown on the table card for manual entry backup
        return f"{frontend_url}/table/{table.table_number}?token={table.qr_token}"

    @staticmethod
    def build_scan_url(jwt_token: str) -> str:
        """
        Build the scan URL with JWT token.

        Args:
            jwt_token: The JWT token for authentication

        Returns:
            Full URL string for scan page (e.g., http://192.168.8.125:3000/scan?token=...)
        """
        frontend_url = QRURLBuilder.get_frontend_url()
        return f"{frontend_url}/scan?token={jwt_token}"

    @staticmethod
    def build_join_url(access_code: str) -> str:
        """
        Build the manual join URL for customers.

        Args:
            access_code: The 6-character access code

        Returns:
            Full URL string for join page (e.g., http://192.168.8.125:3000/join)
        """
        frontend_url = QRURLBuilder.get_frontend_url()
        return f"{frontend_url}/join"


# Convenience functions for backward compatibility
def build_table_qr_url(table: Table) -> str:
    """Convenience function to build table QR URL."""
    return QRURLBuilder.build_table_qr_url(table)


def get_frontend_url() -> str:
    """Convenience function to get frontend URL."""
    return QRURLBuilder.get_frontend_url()
