"""
Initialize Default Admin User

Creates a default admin user if none exists.
Run this manually or call from startup.
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.core.database import engine, Base
from app.models.admin import Admin, AdminRole
from app.utils.security import get_password_hash


async def create_default_admin():
    """Create default admin user if none exists"""

    # Create async session
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with AsyncSessionLocal() as session:
        try:
            # Check if admin already exists
            result = await session.execute(
                select(Admin).where(Admin.email == "admin@gmail.com")
            )
            existing_admin = result.scalar_one_or_none()

            if existing_admin:
                print("Admin user already exists: admin@gmail.com")
                return existing_admin

            # Create default admin
            default_admin = Admin(
                email="admin@gmail.com",
                name="Admin User",
                hashed_password=get_password_hash("admin@123"),
                role=AdminRole.ADMIN,
                is_active=True
            )

            session.add(default_admin)
            await session.commit()
            await session.refresh(default_admin)

            print("[OK] Default admin user created successfully!")
            print(f"  Email: {default_admin.email}")
            print(f"  Password: admin@123")
            print(f"  Role: {default_admin.role.value}")
            print(f"  ID: {default_admin.id}")

            return default_admin

        except Exception as e:
            await session.rollback()
            print(f"Error creating admin user: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(create_default_admin())
