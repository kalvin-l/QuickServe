"""
Application Configuration
Loads environment variables from .env file
"""
from dotenv import load_dotenv
import os
from pathlib import Path

# Get the project root directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env file from the project root
env_path = BASE_DIR / ".env"
load_dotenv(env_path)


class Settings:
    """Application settings"""

    # API Settings
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_PREFIX: str = os.getenv("API_PREFIX", "/api")

    # Frontend URL (for QR code generation)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./quickserve.db")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-min-32-chars")

    # Business Logic
    MAX_GROUP_SIZE: int = int(os.getenv("MAX_GROUP_SIZE", "6"))
    JOIN_REQUEST_TIMEOUT_MINUTES: int = int(os.getenv("JOIN_REQUEST_TIMEOUT_MINUTES", "5"))
    SESSION_TIMEOUT_HOURS: int = int(os.getenv("SESSION_TIMEOUT_HOURS", "24"))
    TAX_RATE: float = float(os.getenv("TAX_RATE", "0.12"))

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

    # File Upload
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "10"))

    # Timezone
    TIMEZONE: str = os.getenv("TIMEZONE", "UTC")

    class Config:
        case_sensitive = True


# Create a global settings instance
settings = Settings()
