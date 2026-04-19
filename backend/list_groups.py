import sqlite3

conn = sqlite3.connect('app.db')
cur = conn.cursor()

# Find groups with blank/null names
cur.execute("SELECT id, name FROM groups WHERE name IS NULL OR TRIM(name) = ''")
bad = cur.fetchall()
print("Groups with no name:", bad)

if bad:
    for group_id, name in bad:
        print(f"Deleting group id={group_id} (name='{name}')...")

        # Get expense ids first
        cur.execute("SELECT id FROM expenses WHERE group_id = ?", (group_id,))
        expense_ids = [row[0] for row in cur.fetchall()]

        # Delete expense splits
        if expense_ids:
            placeholders = ",".join("?" * len(expense_ids))
            cur.execute(f"DELETE FROM expense_splits WHERE expense_id IN ({placeholders})", expense_ids)

        # Delete expenses
        cur.execute("DELETE FROM expenses WHERE group_id = ?", (group_id,))

        # Delete balances
        cur.execute("DELETE FROM balances WHERE group_id = ?", (group_id,))

        # Delete members
        cur.execute("DELETE FROM group_members WHERE group_id = ?", (group_id,))

        # Delete group
        cur.execute("DELETE FROM groups WHERE id = ?", (group_id,))

    conn.commit()
    print("Done — orphan group(s) removed.")
else:
    print("No empty-name groups found.")

conn.close()
