"""
Migration: Add session pause support

This adds support for the Smart Contextual End feature:
- New session statuses: IDLE, PAUSING, PAUSED
- Payment status tracking
- Grace period / pause tracking
- Heartbeat tracking on participants
- Preserved cart functionality

Run with: python migrations/002_add_session_pause_support.py
"""

import asyncio
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'quickserve.db')


def migrate():
    """Add new columns and table for session pause support"""

    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Starting migration: Add session pause support...")

        # ============================================================
        # PART 1: Add new columns to table_sessions
        # ============================================================

        # Check current table structure
        cursor.execute("PRAGMA table_info(table_sessions)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"\nCurrent table_sessions columns: {len(columns)}")

        # Add payment_status column
        if 'payment_status' not in columns:
            cursor.execute("""
                ALTER TABLE table_sessions
                ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending'
            """)
            print("  Added payment_status column")
        else:
            print("  payment_status column already exists")

        # Add pending_orders_count column
        if 'pending_orders_count' not in columns:
            cursor.execute("""
                ALTER TABLE table_sessions
                ADD COLUMN pending_orders_count INTEGER DEFAULT 0
            """)
            print("  Added pending_orders_count column")
        else:
            print("  pending_orders_count column already exists")

        # Add session_end_scheduled_at column
        if 'session_end_scheduled_at' not in columns:
            cursor.execute("""
                ALTER TABLE table_sessions
                ADD COLUMN session_end_scheduled_at TIMESTAMP
            """)
            print("  Added session_end_scheduled_at column")
        else:
            print("  session_end_scheduled_at column already exists")

        # Add paused_at column
        if 'paused_at' not in columns:
            cursor.execute("""
                ALTER TABLE table_sessions
                ADD COLUMN paused_at TIMESTAMP
            """)
            print("  Added paused_at column")
        else:
            print("  paused_at column already exists")

        # Add ended_by column
        if 'ended_by' not in columns:
            cursor.execute("""
                ALTER TABLE table_sessions
                ADD COLUMN ended_by VARCHAR(20)
            """)
            print("  Added ended_by column")
        else:
            print("  ended_by column already exists")

        # Add end_reason column
        if 'end_reason' not in columns:
            cursor.execute("""
                ALTER TABLE table_sessions
                ADD COLUMN end_reason VARCHAR(100)
            """)
            print("  Added end_reason column")
        else:
            print("  end_reason column already exists")

        # Add grace_period_minutes column
        if 'grace_period_minutes' not in columns:
            cursor.execute("""
                ALTER TABLE table_sessions
                ADD COLUMN grace_period_minutes INTEGER DEFAULT 5
            """)
            print("  Added grace_period_minutes column")
        else:
            print("  grace_period_minutes column already exists")

        # Create new indexes for table_sessions
        new_indexes = [
            ('ix_table_sessions_payment_status', 'payment_status'),
            ('ix_table_sessions_session_end_scheduled_at', 'session_end_scheduled_at'),
            ('ix_table_sessions_paused_at', 'paused_at'),
        ]

        for index_name, column_name in new_indexes:
            cursor.execute(f"PRAGMA index_list(table_sessions)")
            existing_indexes = [idx[1] for idx in cursor.fetchall()]
            if index_name not in existing_indexes:
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON table_sessions({column_name})
                """)
                print(f"  Created index {index_name}")

        # ============================================================
        # PART 2: Add heartbeat tracking columns to session_participants
        # ============================================================

        cursor.execute("PRAGMA table_info(session_participants)")
        participant_columns = [col[1] for col in cursor.fetchall()]
        print(f"\nCurrent session_participants columns: {len(participant_columns)}")

        # Add connection_status column
        if 'connection_status' not in participant_columns:
            cursor.execute("""
                ALTER TABLE session_participants
                ADD COLUMN connection_status VARCHAR(20) DEFAULT 'connected'
            """)
            print("  Added connection_status column to session_participants")
        else:
            print("  connection_status column already exists in session_participants")

        # Add last_heartbeat_at column
        if 'last_heartbeat_at' not in participant_columns:
            cursor.execute("""
                ALTER TABLE session_participants
                ADD COLUMN last_heartbeat_at TIMESTAMP
            """)
            print("  Added last_heartbeat_at column to session_participants")
        else:
            print("  last_heartbeat_at column already exists in session_participants")

        # Create index for heartbeat tracking
        cursor.execute("PRAGMA index_list(session_participants)")
        existing_indexes = [idx[1] for idx in cursor.fetchall()]
        if 'ix_session_participants_last_heartbeat_at' not in existing_indexes:
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS ix_session_participants_last_heartbeat_at
                ON session_participants(last_heartbeat_at)
            """)
            print("  Created index ix_session_participants_last_heartbeat_at")

        # ============================================================
        # PART 3: Create preserved_carts table
        # ============================================================

        # Check if preserved_carts table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='preserved_carts'")
        if cursor.fetchone() is None:
            cursor.execute("""
                CREATE TABLE preserved_carts (
                    id INTEGER PRIMARY KEY,
                    session_id INTEGER NOT NULL UNIQUE,
                    device_id VARCHAR(64) NOT NULL,
                    table_id INTEGER NOT NULL,
                    cart_data JSON DEFAULT '{}',
                    preserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES table_sessions(id),
                    FOREIGN KEY(table_id) REFERENCES tables(id)
                )
            """)
            print("  Created preserved_carts table")

            # Create indexes for preserved_carts
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_preserved_carts_session_id ON preserved_carts(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_preserved_carts_device_id ON preserved_carts(device_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_preserved_carts_expires_at ON preserved_carts(expires_at)")
            print("  Created indexes for preserved_carts")
        else:
            print("  preserved_carts table already exists")

        conn.commit()
        print("\n=== Migration completed successfully! ===")
        print("\nNew features available:")
        print("  - Session states: active, idle, pausing, paused, ended, abandoned")
        print("  - Payment status tracking")
        print("  - Grace period before pause")
        print("  - Heartbeat tracking on participants")
        print("  - Cart preservation for 24 hours")
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
    """Rollback migration (drop new columns and table)"""

    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return False

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("\nRolling back migration: Remove session pause support...")

        # SQLite doesn't support DROP COLUMN, so we need to recreate tables
        # For now, we'll just drop the preserved_carts table
        cursor.execute("DROP TABLE IF EXISTS preserved_carts")
        print("  Dropped preserved_carts table")

        conn.commit()
        print("\nRollback completed (partial - columns remain)")
        return True

    except Exception as e:
        conn.rollback()
        print(f"\nRollback failed: {e}")
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        migrate()
