"""
One-time migration script to add the `category` column to the `groups` table.
Run this once: python migrate_add_category.py
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"


def run():
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(groups)")
    columns = [row[1] for row in cursor.fetchall()]

    if "category" not in columns:
        cursor.execute("ALTER TABLE groups ADD COLUMN category TEXT DEFAULT NULL")
        conn.commit()
        print("[OK] Added 'category' column to 'groups' table.")
    else:
        print("[INFO] 'category' column already exists.")

    conn.close()


if __name__ == "__main__":
    run()
