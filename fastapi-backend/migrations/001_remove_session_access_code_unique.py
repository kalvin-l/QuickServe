"""
Migration: Remove unique constraint from table_sessions.access_code

This allows multiple sessions per table (one per device/customer).

Run with: python migrations/001_remove_session_access_code_unique.py
"""

import asyncio
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'quickserve.db')


def migrate():
    """Remove unique constraint from access_code column"""

    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check current table structure
        cursor.execute("PRAGMA table_info(table_sessions)")
        columns = cursor.fetchall()
        print("Current table structure:")
        for col in columns:
            print(f"  {col}")

        # SQLite doesn't support DROP CONSTRAINT, so we need to:
        # 1. Create new table without unique constraint
        # 2. Copy data
        # 3. Drop old table
        # 4. Rename new table

        print("\nStarting migration...")

        # Step 1: Create new table without unique constraint on access_code
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS table_sessions_new (
                id INTEGER PRIMARY KEY,
                table_id INTEGER NOT NULL,
                session_id VARCHAR(36),
                access_code VARCHAR(6),
                customer_count INTEGER DEFAULT 1,
                customer_name VARCHAR(100),
                status VARCHAR,
                started_at TIMESTAMP,
                last_activity_at TIMESTAMP,
                ended_at TIMESTAMP,
                session_metadata JSON,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY(table_id) REFERENCES tables(id)
            )
        """)
        print("  Created new table structure")

        # Step 2: Copy data from old table
        cursor.execute("""
            INSERT INTO table_sessions_new
            SELECT id, table_id, session_id, access_code, customer_count, customer_name,
                   status, started_at, last_activity_at, ended_at, session_metadata, is_active
            FROM table_sessions
        """)
        rows_copied = cursor.rowcount
        print(f"  Copied {rows_copied} rows")

        # Step 3: Drop old table
        cursor.execute("DROP TABLE table_sessions")
        print("  Dropped old table")

        # Step 4: Rename new table
        cursor.execute("ALTER TABLE table_sessions_new RENAME TO table_sessions")
        print("  Renamed new table")

        # Step 5: Recreate indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_table_sessions_id ON table_sessions(id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_table_sessions_table_id ON table_sessions(table_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_table_sessions_session_id ON table_sessions(session_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_table_sessions_access_code ON table_sessions(access_code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_table_sessions_status ON table_sessions(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_table_sessions_started_at ON table_sessions(started_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_table_sessions_is_active ON table_sessions(is_active)")
        print("  Recreated indexes")

        conn.commit()
        print("\nMigration completed successfully!")
        return True

    except Exception as e:
        conn.rollback()
        print(f"\nMigration failed: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
