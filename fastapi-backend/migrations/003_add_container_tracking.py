"""
Migration: Add container tracking to inventory items

This adds support for tracking inventory in containers (boxes, bottles, etc.):
- container_type: The type of container (Box, Bottle, Sack, etc.)
- container_capacity: How much each container holds (in stock_unit)
- container_count: Cached count of containers (auto-calculated)

Run with: python migrations/003_add_container_tracking.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'quickserve.db')


def migrate():
    """Add container tracking columns to inventory table"""

    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Starting migration: Add container tracking to inventory...")

        # Check current table structure
        cursor.execute("PRAGMA table_info(inventory)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"\nCurrent inventory columns: {len(columns)}")

        # Add container_type column
        if 'container_type' not in columns:
            cursor.execute("""
                ALTER TABLE inventory
                ADD COLUMN container_type VARCHAR(50)
            """)
            print("  Added container_type column")
        else:
            print("  container_type column already exists")

        # Add container_capacity column
        if 'container_capacity' not in columns:
            cursor.execute("""
                ALTER TABLE inventory
                ADD COLUMN container_capacity INTEGER
            """)
            print("  Added container_capacity column")
        else:
            print("  container_capacity column already exists")

        # Add container_count column
        if 'container_count' not in columns:
            cursor.execute("""
                ALTER TABLE inventory
                ADD COLUMN container_count INTEGER
            """)
            print("  Added container_count column")
        else:
            print("  container_count column already exists")

        conn.commit()
        print("\n=== Migration completed successfully! ===")
        print("\nNew features available:")
        print("  - Track inventory in containers (boxes, bottles, sacks, etc.)")
        print("  - Display both quantity and container count: '299,500 kg (99.83 boxes)'")
        print("  - Auto-calculate container count from quantity and capacity")
        return True

    except Exception as e:
        conn.rollback()
        print(f"\n=== Migration failed: {e} ===")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()


def rollback():
    """Rollback migration (SQLite doesn't support DROP COLUMN, so this is limited)"""

    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return False

    print("\nRollback note: SQLite doesn't support DROP COLUMN")
    print("Container tracking columns will remain in the database")
    print("To fully remove, you would need to recreate the inventory table")
    return True


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
