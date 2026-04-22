#!/usr/bin/env python3
"""
Migration: Remove UNIQUE constraint from session_participants.device_id

This allows devices to join multiple different sessions over time.
Run this on existing databases to update the schema without losing data.
"""
import sqlite3
import os


def migrate():
    """Remove UNIQUE constraint from session_participants.device_id"""

    db_path = os.path.join(os.path.dirname(__file__), 'quickserve.db')

    if not os.path.exists(db_path):
        print(f"[SKIP] Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if migration already ran by looking for the unique index on device_id
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name='ix_session_participants_device_id'")
        index_result = cursor.fetchone()

        if not index_result or 'UNIQUE' not in index_result[0]:
            print("[SKIP] Migration already applied (UNIQUE index not found)")
            conn.close()
            return

        print("[START] Removing UNIQUE constraint from session_participants.device_id")

        # Step 1: Create new table without UNIQUE constraint (matching actual schema with VARCHAR)
        print("[STEP 1/5] Creating new table without UNIQUE constraint...")
        cursor.execute("""
            CREATE TABLE session_participants_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_id VARCHAR(36) NOT NULL,
                table_session_id INTEGER NOT NULL,
                device_id VARCHAR(64) NOT NULL,
                device_name VARCHAR(100),
                customer_count INTEGER,
                role VARCHAR(5),
                is_active BOOLEAN,
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                left_at DATETIME,
                FOREIGN KEY (table_session_id) REFERENCES table_sessions(id)
            )
        """)

        # Step 2: Copy data from old table
        print("[STEP 2/5] Copying data from old table...")
        cursor.execute("INSERT INTO session_participants_new SELECT * FROM session_participants")
        rows_copied = cursor.rowcount
        print(f"          [OK] Copied {rows_copied} rows")

        # Step 3: Drop old table
        print("[STEP 3/5] Dropping old table...")
        cursor.execute("DROP TABLE session_participants")
        print("          [OK] Old table dropped")

        # Step 4: Rename new table
        print("[STEP 4/5] Renaming new table...")
        cursor.execute("ALTER TABLE session_participants_new RENAME TO session_participants")
        print("          [OK] Table renamed")

        # Step 5: Recreate indexes
        print("[STEP 5/5] Recreating indexes...")
        indexes = [
            "CREATE INDEX ix_session_participants_participant_id ON session_participants(participant_id)",
            "CREATE INDEX ix_session_participants_table_session_id ON session_participants(table_session_id)",
            "CREATE INDEX ix_session_participants_device_id ON session_participants(device_id)",
            "CREATE INDEX ix_session_participants_role ON session_participants(role)",
            "CREATE INDEX ix_session_participants_is_active ON session_participants(is_active)",
            "CREATE INDEX ix_session_participants_joined_at ON session_participants(joined_at)",
            "CREATE INDEX ix_session_participants_last_activity_at ON session_participants(last_activity_at)"
        ]

        for index_sql in indexes:
            cursor.execute(index_sql)
        print(f"          [OK] Created {len(indexes)} indexes")

        conn.commit()
        print("\n[DONE] Migration completed successfully!")

        # Summary
        cursor.execute("SELECT COUNT(*) FROM session_participants WHERE is_active = 1")
        active_participants = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM session_participants")
        total_participants = cursor.fetchone()[0]
        print(f"\nDatabase Stats:")
        print(f"   Total session participants: {total_participants}")
        print(f"   Active session participants: {active_participants}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
