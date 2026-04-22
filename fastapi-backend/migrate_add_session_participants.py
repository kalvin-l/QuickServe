"""
Migration script to add session_participants table and update join_requests
Run this to update the database schema without losing data
"""

import sqlite3
import os
import sys


def migrate_database():
    """Add session_participants table and participant_id to join_requests"""

    db_path = "quickserve.db"

    if not os.path.exists(db_path):
        print("Database not found. Run the application first to create it.")
        return

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # ============================================
        # Create session_participants table
        # ============================================
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='session_participants'")
        if not cursor.fetchone():
            print("Creating session_participants table...")
            cursor.execute("""
                CREATE TABLE session_participants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    participant_id TEXT UNIQUE NOT NULL,
                    table_session_id INTEGER NOT NULL,
                    device_id TEXT NOT NULL,
                    device_name TEXT,
                    customer_count INTEGER DEFAULT 1,
                    role TEXT DEFAULT 'guest',
                    is_active BOOLEAN DEFAULT 1,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    left_at DATETIME,
                    FOREIGN KEY (table_session_id) REFERENCES table_sessions(id)
                )
            """)
            # Create indexes for better query performance
            cursor.execute("CREATE INDEX ix_session_participants_participant_id ON session_participants(participant_id)")
            cursor.execute("CREATE INDEX ix_session_participants_table_session_id ON session_participants(table_session_id)")
            cursor.execute("CREATE INDEX ix_session_participants_device_id ON session_participants(device_id)")
            cursor.execute("CREATE INDEX ix_session_participants_role ON session_participants(role)")
            cursor.execute("CREATE INDEX ix_session_participants_is_active ON session_participants(is_active)")
            cursor.execute("CREATE INDEX ix_session_participants_joined_at ON session_participants(joined_at)")
            cursor.execute("CREATE INDEX ix_session_participants_last_activity_at ON session_participants(last_activity_at)")
            print("  [OK] session_participants table created")
        else:
            print("  [SKIP] session_participants table already exists")

        # ============================================
        # Add participant_id to join_requests table
        # ============================================
        cursor.execute("PRAGMA table_info(join_requests)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'participant_id' not in columns:
            print("Adding participant_id column to join_requests...")
            cursor.execute("ALTER TABLE join_requests ADD COLUMN participant_id INTEGER REFERENCES session_participants(id)")
            # Create index for the new column
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_join_requests_participant_id ON join_requests(participant_id)")
            print("  [OK] participant_id column added to join_requests")
        else:
            print("  [SKIP] participant_id column already exists in join_requests")

        # ============================================
        # Add participant_id to group_members table
        # ============================================
        cursor.execute("PRAGMA table_info(group_members)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'participant_id' not in columns:
            print("Adding participant_id column to group_members...")
            cursor.execute("ALTER TABLE group_members ADD COLUMN participant_id INTEGER REFERENCES session_participants(id)")
            # Create index for the new column
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_group_members_participant_id ON group_members(participant_id)")
            print("  [OK] participant_id column added to group_members")
        else:
            print("  [SKIP] participant_id column already exists in group_members")

        # ============================================
        # Migrate existing sessions to participants
        # ============================================
        print("\nMigrating existing table_sessions to session_participants...")

        # Find all active table_sessions that don't have participants yet
        cursor.execute("""
            SELECT ts.id, ts.session_id, ts.access_code, ts.customer_count, ts.started_at
            FROM table_sessions ts
            WHERE ts.is_active = 1 AND ts.status = 'active'
            AND NOT EXISTS (
                SELECT 1 FROM session_participants sp WHERE sp.table_session_id = ts.id
            )
        """)
        existing_sessions = cursor.fetchall()

        if existing_sessions:
            print(f"  Found {len(existing_sessions)} active session(s) to migrate...")
            migrated_count = 0

            for session_id, session_uuid, access_code, customer_count, started_at in existing_sessions:
                # Generate a device_id for the legacy participant
                device_id = f"legacy_{access_code}_{session_id}"

                # Create a HOST participant for each existing session
                cursor.execute("""
                    INSERT INTO session_participants (
                        participant_id, table_session_id, device_id, device_name,
                        customer_count, role, is_active, joined_at, last_activity_at
                    ) VALUES (?, ?, ?, ?, ?, 'host', 1, ?, ?)
                """, (
                    session_uuid,  # Use session_id as participant_id for legacy data
                    session_id,
                    device_id,
                    "Legacy Device",  # device_name
                    customer_count,
                    started_at,
                    started_at
                ))
                migrated_count += 1

            print(f"  [OK] Migrated {migrated_count} existing session(s) to participants")
        else:
            print("  [SKIP] No existing sessions to migrate")

        # ============================================
        # Commit changes
        # ============================================
        conn.commit()
        print("\n[OK] Migration completed successfully!")

        # ============================================
        # Summary
        # ============================================
        cursor.execute("SELECT COUNT(*) FROM session_participants WHERE is_active = 1")
        active_participants = cursor.fetchone()[0]
        print(f"\nDatabase Stats:")
        print(f"   Active session participants: {active_participants}")

    except sqlite3.Error as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
