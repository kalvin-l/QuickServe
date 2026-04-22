"""
Migration script to add QR-related fields to the tables table
Run this to update the database schema without losing data
"""

import sqlite3
import os

def migrate_database():
    """Add QR-related columns to the tables table"""

    db_path = "quickserve.db"

    if not os.path.exists(db_path):
        print("Database not found. Run the application first to create it.")
        return

    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(tables)")
        columns = [row[1] for row in cursor.fetchall()]

        # Add qr_expires_at if it doesn't exist
        if 'qr_expires_at' not in columns:
            print("Adding qr_expires_at column...")
            cursor.execute("ALTER TABLE tables ADD COLUMN qr_expires_at DATETIME")
        else:
            print("Column qr_expires_at already exists")

        # Add qr_scan_count if it doesn't exist
        if 'qr_scan_count' not in columns:
            print("Adding qr_scan_count column...")
            cursor.execute("ALTER TABLE tables ADD COLUMN qr_scan_count INTEGER DEFAULT 0")
        else:
            print("Column qr_scan_count already exists")

        # Add qr_last_scanned if it doesn't exist
        if 'qr_last_scanned' not in columns:
            print("Adding qr_last_scanned column...")
            cursor.execute("ALTER TABLE tables ADD COLUMN qr_last_scanned DATETIME")
        else:
            print("Column qr_last_scanned already exists")

        # Create qr_scan_logs table if it doesn't exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='qr_scan_logs'")
        if not cursor.fetchone():
            print("Creating qr_scan_logs table...")
            cursor.execute("""
                CREATE TABLE qr_scan_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    table_id INTEGER NOT NULL,
                    qr_code VARCHAR(50) NOT NULL,
                    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(500),
                    validation_result VARCHAR(20) NOT NULL,
                    FOREIGN KEY (table_id) REFERENCES tables (id)
                )
            """)
            # Create indexes for better query performance
            cursor.execute("CREATE INDEX ix_qr_scan_logs_table_scanned ON qr_scan_logs(table_id, scanned_at)")
            cursor.execute("CREATE INDEX ix_qr_scan_logs_qr_scanned ON qr_scan_logs(qr_code, scanned_at)")
            cursor.execute("CREATE INDEX ix_qr_scan_logs_ip_scanned ON qr_scan_logs(ip_address, scanned_at)")
        else:
            print("Table qr_scan_logs already exists")

        # Commit changes
        conn.commit()
        print("\n✅ Migration completed successfully!")

    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
