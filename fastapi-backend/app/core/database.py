"""
Database Configuration and Connection Management
Handles SQLite database connection and session management
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import StaticPool
from typing import AsyncGenerator
import os

# Database URL (SQLite)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./quickserve.db")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    poolclass=StaticPool,  # For SQLite
    echo=False,  # Set to True to see SQL queries
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection for database sessions.
    Use this in endpoints to get a database session.
    
    Note: Services are responsible for their own commits.
    This dependency only handles rollback on exceptions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """
    Initialize database tables.
    Call this on application startup.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
