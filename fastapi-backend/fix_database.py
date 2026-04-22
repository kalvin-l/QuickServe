"""
Fix to recreate database for async operations
Run this when switching from sync to async SQLAlchemy
"""

import asyncio
from app.core.database import engine, init_db
import os

async def fix_database():
    """Delete and recreate database for async operations"""
    db_path = "./quickserve.db"

    # Close all connections
    await engine.dispose()

    # Delete the database file
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Deleted {db_path}")

    # Also delete -journal file if exists
    journal_path = db_path + "-journal"
    if os.path.exists(journal_path):
        os.remove(journal_path)
        print(f"Deleted {journal_path}")

    # Recreate database with async support
    await init_db()
    print("Database recreated successfully!")

if __name__ == "__main__":
    asyncio.run(fix_database())
