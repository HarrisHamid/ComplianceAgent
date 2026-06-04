import sqlite3
import json
from datetime import datetime

# SQLite is a file-based database — no server to set up, no credentials.
# The entire database lives in a single .db file on disk.
# Perfect for a hackathon: zero configuration, works everywhere.
# On your laptop: pip install nothing — sqlite3 is built into Python.

DB_FILE = "compliance_audits.db"  # This file gets created automatically


def init_db():
    """
    Creates the database tables if they don't exist yet.
    Call this once at app startup before doing anything else.

    sqlite3.connect() opens (or creates) the .db file.
    The 'with' block is a context manager — it auto-commits on success
    and auto-rolls back if something crashes. Always use 'with' for DB writes.
    """
    with sqlite3.connect(DB_FILE) as conn:
        # conn.execute() runs a SQL statement.
        # CREATE TABLE IF NOT EXISTS means: only create it if it's not already there.
        # Safe to call multiple times — won't wipe your data.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audits (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                url         TEXT NOT NULL,
                framework   TEXT NOT NULL,
                score       INTEGER,
                passed      INTEGER,
                failed      INTEGER,
                findings    TEXT,    -- we store the full findings list as JSON string
                created_at  TEXT
            )
        """)
        # A second table just for individual violations — makes querying easier
        conn.execute("""
            CREATE TABLE IF NOT EXISTS violations (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                audit_id    INTEGER,  -- foreign key linking back to audits table
                requirement_id   TEXT,
                requirement_name TEXT,
                severity    TEXT,
                explanation TEXT,
                created_at  TEXT
            )
        """)
    print(f"Database ready: {DB_FILE}")


def save_audit(source: str, framework_keys: list, results: dict) -> int:
    """
    Saves one audit row per framework from an analyze_document() result.
    source: filename or URL being audited
    framework_keys: list of framework keys that were run (e.g. ['GDPR', 'SOC2'])
    results: the dict returned by analyze_document()
    Returns the first inserted audit_id.
    """
    now = datetime.now().isoformat()
    first_id = None

    with sqlite3.connect(DB_FILE) as conn:
        for key in framework_keys:
            fw = results.get('frameworks', {}).get(key)
            if not fw:
                continue

            cursor = conn.execute("""
                INSERT INTO audits (url, framework, score, passed, failed, findings, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                source,
                fw['name'],
                fw['score'],
                fw['passed'],
                fw['failed'],
                json.dumps(fw['findings']),
                now
            ))
            audit_id = cursor.lastrowid
            if first_id is None:
                first_id = audit_id

            violations = [f for f in fw['findings'] if f['status'] != 'satisfied']
            for v in violations:
                conn.execute("""
                    INSERT INTO violations (audit_id, requirement_id, requirement_name, severity, explanation, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    audit_id,
                    v['id'],
                    v['name'],
                    v['severity'],
                    v['explanation'],
                    now
                ))

    return first_id or 0


def get_audit(audit_id: int) -> dict:
    """
    Retrieves a saved audit by its ID.
    Used by the report agent to load findings.
    """
    with sqlite3.connect(DB_FILE) as conn:
        # row_factory makes rows behave like dicts instead of plain tuples
        # Without this: row[0], row[1], row[2]...
        # With this:    row["url"], row["score"], row["created_at"]
        conn.row_factory = sqlite3.Row

        row = conn.execute(
            "SELECT * FROM audits WHERE id = ?", (audit_id,)
        ).fetchone()  # fetchone() returns one row, or None if not found

        if not row:
            return None

        return {
            "id": row["id"],
            "url": row["url"],
            "framework": row["framework"],
            "score": row["score"],
            "passed": row["passed"],
            "failed": row["failed"],
            "findings": json.loads(row["findings"]),  # JSON string → Python list
            "created_at": row["created_at"]
        }


if __name__ == "__main__":
    # Test the database
    init_db()

    # Save a fake audit result to verify it works
    fake_result = {
        "compliance_score": 70,
        "passed": 7,
        "failed": 3,
        "findings": [{"id": "A13-1", "satisfied": True, "explanation": "Company name found"}],
        "violations": [
            {"id": "A13-10", "requirement": "Right to complain", "severity": "high", "explanation": "No supervisory authority mentioned"}
        ]
    }

    audit_id = save_audit("https://stripe.com/privacy", "GDPR", fake_result)
    retrieved = get_audit(audit_id)

    print(f"\nRetrieved audit: {retrieved['url']}")
    print(f"Score: {retrieved['score']}%")
    print(f"Findings count: {len(retrieved['findings'])}")
    print("\nDatabase works correctly!")