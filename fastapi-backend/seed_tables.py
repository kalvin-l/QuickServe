"""
Seed Tables Script
Populate database with initial table data
Run this after creating the tables table to add sample data
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal, init_db
from app.models.table import Table, TableLocation, TableStatus
import secrets


def generate_qr_token() -> str:
    """Generate secure random token for QR validation"""
    alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(secrets.choice(alphabet) for _ in range(20))


def generate_access_code() -> str:
    """Generate 6-character access code"""
    alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    return ''.join(secrets.choice(alphabet) for _ in range(6))


async def seed_tables():
    """Seed database with initial table data"""
    print("Initializing database...")
    await init_db()

    async with AsyncSessionLocal() as session:
        # Check if tables already exist
        from sqlalchemy import select, func
        count_result = await session.execute(select(func.count()).select_from(Table))
        table_count = count_result.scalar()

        if table_count > 0:
            print(f"Database already has {table_count} tables. Skipping seed.")
            return

        print("Seeding tables...")

        # Initial table data (matches frontend static data)
        tables_data = [
            {
                "table_number": 1,
                "location": TableLocation.INDOOR,
                "capacity": 4,
                "qr_code": "QS-TABLE-1",
                "qr_token": generate_qr_token(),
                "access_code": "8X7K2M",
                "status": TableStatus.AVAILABLE,
            },
            {
                "table_number": 2,
                "location": TableLocation.INDOOR,
                "capacity": 2,
                "qr_code": "QS-TABLE-2",
                "qr_token": generate_qr_token(),
                "access_code": "3P9Q1R",
                "status": TableStatus.FULL,
            },
            {
                "table_number": 3,
                "location": TableLocation.INDOOR,
                "capacity": 6,
                "qr_code": "QS-TABLE-3",
                "qr_token": generate_qr_token(),
                "access_code": "7N4B8C",
                "status": TableStatus.PARTIAL,
            },
            {
                "table_number": 4,
                "location": TableLocation.OUTDOOR,
                "capacity": 4,
                "qr_code": "QS-TABLE-4",
                "qr_token": generate_qr_token(),
                "access_code": "2Y6T5W",
                "status": TableStatus.AVAILABLE,
            },
            {
                "table_number": 5,
                "location": TableLocation.PATIO,
                "capacity": 8,
                "qr_code": "QS-TABLE-5",
                "qr_token": generate_qr_token(),
                "access_code": "9D1F3G",
                "status": TableStatus.AVAILABLE,
            },
            {
                "table_number": 6,
                "location": TableLocation.PATIO,
                "capacity": 4,
                "qr_code": "QS-TABLE-6",
                "qr_token": generate_qr_token(),
                "access_code": "4S8H2J",
                "status": TableStatus.PARTIAL,
            },
            {
                "table_number": 7,
                "location": TableLocation.BAR,
                "capacity": 2,
                "qr_code": "QS-TABLE-7",
                "qr_token": generate_qr_token(),
                "access_code": "6K7L9P",
                "status": TableStatus.AVAILABLE,
            },
            {
                "table_number": 8,
                "location": TableLocation.BAR,
                "capacity": 4,
                "qr_code": "QS-TABLE-8",
                "qr_token": generate_qr_token(),
                "access_code": "1M3N5B",
                "status": TableStatus.CLEANING,
            },
        ]

        # Add tables to database
        for table_data in tables_data:
            table = Table(**table_data)
            session.add(table)

        await session.commit()

        print(f"Successfully seeded {len(tables_data)} tables!")
        print("\nSeeded tables:")
        for t in tables_data:
            print(f"  - Table {t['table_number']}: {t['location'].value} ({t['capacity']} seats) - {t['status'].value}")
        print("\nAccess Codes:")
        for t in tables_data:
            print(f"  - Table {t['table_number']}: {t['access_code']}")


if __name__ == "__main__":
    asyncio.run(seed_tables())
