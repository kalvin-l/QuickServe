"""
Migration script to add host_participant_id column to group_sessions table
Run this to update the database schema without losing data
"""

import sqlite3
import os


def migrate_database():
    """Add host_participant_id column to group_sessions table"""

    db_path = "quickserve.db"

    if not os.path.exists(db_path):
        print("Database not found. Run the application first to create it.")
        return

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # ============================================
        # Add host_participant_id to group_sessions table
        # ============================================
        cursor.execute("PRAGMA table_info(group_sessions)")
        columns = [row[1] for row in cursor.fetchall()]

        if 'host_participant_id' not in columns:
            print("Adding host_participant_id column to group_sessions...")
            cursor.execute("ALTER TABLE group_sessions ADD COLUMN host_participant_id INTEGER REFERENCES session_participants(id)")
            # Create index for the new column
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_group_sessions_host_participant_id ON group_sessions(host_participant_id)")
            print("  [OK] host_participant_id column added to group_sessions")
        else:
            print("  [SKIP] host_participant_id column already exists in group_sessions")

        # ============================================
        # Migrate existing group_sessions to use participant_id
        # ============================================
        print("\nMigrating existing group_sessions to use host_participant_id...")

        # Find all active group_sessions that have a host_session_id but no host_participant_id
        cursor.execute("""
            SELECT gs.id, gs.host_session_id, gs.table_id
            FROM group_sessions gs
            WHERE gs.host_session_id IS NOT NULL
            AND gs.host_participant_id IS NULL
            AND gs.is_active = 1
        """)
        existing_groups = cursor.fetchall()

        if existing_groups:
            print(f"  Found {len(existing_groups)} active group(s) to migrate...")
            migrated_count = 0

            for group_id, host_session_id, table_id in existing_groups:
                # Find the participant for this session_id
                # First, find the table_session.id for this session_id
                cursor.execute("""
                    SELECT ts.id FROM table_sessions ts
                    WHERE ts.session_id = ?
                    AND ts.is_active = 1
                    LIMIT 1
                """, (host_session_id,))
                table_session_result = cursor.fetchone()

                if table_session_result:
                    table_session_id = table_session_result[0]

                    # Find the participant_id for this table_session
                    cursor.execute("""
                        SELECT sp.id FROM session_participants sp
                        WHERE sp.table_session_id = ?
                        AND sp.is_active = 1
                        AND sp.role = 'host'
                        ORDER BY sp.joined_at ASC
                        LIMIT 1
                    """, (table_session_id,))
                    participant_result = cursor.fetchone()

                    if participant_result:
                        participant_id = participant_result[0]

                        # Update the group_session with the participant_id
                        cursor.execute("""
                            UPDATE group_sessions
                            SET host_participant_id = ?
                            WHERE id = ?
                        """, (participant_id, group_id))
                        migrated_count += 1
                    else:
                        print(f"  [WARN] No participant found for group {group_id}, session {host_session_id}")
                else:
                    print(f"  [WARN] No table_session found for group {group_id}, session {host_session_id}")

            print(f"  [OK] Migrated {migrated_count} existing group(s) to use host_participant_id")
        else:
            print("  [SKIP] No existing groups to migrate")

        # ============================================
        # Commit changes
        # ============================================
        conn.commit()
        print("\n[OK] Migration completed successfully!")

        # ============================================
        # Summary
        # ============================================
        cursor.execute("SELECT COUNT(*) FROM group_sessions WHERE is_active = 1")
        active_groups = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM group_sessions WHERE is_active = 1 AND host_participant_id IS NOT NULL")
        migrated_groups = cursor.fetchone()[0]
        print(f"\nDatabase Stats:")
        print(f"   Active group sessions: {active_groups}")
        print(f"   Groups with host_participant_id: {migrated_groups}")

    except sqlite3.Error as e:
        print(f"[ERROR] Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
