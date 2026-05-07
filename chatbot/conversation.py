"""
Conversation store — przechowuje historię rozmów w SQLite.
Każda sesja ma unikalny session_id.
"""
import sqlite3
import json
import os
import time
import uuid

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "turbo_seo.db")


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_chat_tables():
    conn = _conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            session_id TEXT PRIMARY KEY,
            started_at INTEGER DEFAULT (strftime('%s','now')),
            last_active INTEGER DEFAULT (strftime('%s','now')),
            car_brand TEXT DEFAULT '',
            car_model TEXT DEFAULT '',
            lead_email TEXT DEFAULT '',
            lead_phone TEXT DEFAULT '',
            message_count INTEGER DEFAULT 0,
            converted INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            created_at INTEGER DEFAULT (strftime('%s','now')),
            products_shown TEXT DEFAULT '[]'
        );
    """)
    conn.commit()
    conn.close()


def new_session() -> str:
    sid = str(uuid.uuid4())
    conn = _conn()
    conn.execute("INSERT INTO chat_sessions(session_id) VALUES(?)", (sid,))
    conn.commit()
    conn.close()
    return sid


def session_exists(session_id: str) -> bool:
    conn = _conn()
    row = conn.execute("SELECT 1 FROM chat_sessions WHERE session_id=?", (session_id,)).fetchone()
    conn.close()
    return bool(row)


def get_history(session_id: str, max_messages: int = 20) -> list[dict]:
    """Zwraca historię wiadomości dla sesji (dla Claude API)."""
    conn = _conn()
    rows = conn.execute(
        "SELECT role, content FROM chat_messages WHERE session_id=? ORDER BY id DESC LIMIT ?",
        (session_id, max_messages)
    ).fetchall()
    conn.close()
    messages = [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]
    return messages


def save_message(session_id: str, role: str, content: str, products: list | None = None):
    products_json = json.dumps(products or [])
    conn = _conn()
    conn.execute(
        "INSERT INTO chat_messages(session_id,role,content,products_shown) VALUES(?,?,?,?)",
        (session_id, role, content, products_json)
    )
    conn.execute(
        "UPDATE chat_sessions SET last_active=strftime('%s','now'), message_count=message_count+1 WHERE session_id=?",
        (session_id,)
    )
    conn.commit()
    conn.close()


def update_session_car(session_id: str, brand: str = "", model: str = ""):
    conn = _conn()
    conn.execute(
        "UPDATE chat_sessions SET car_brand=?, car_model=? WHERE session_id=?",
        (brand, model, session_id)
    )
    conn.commit()
    conn.close()


def mark_converted(session_id: str):
    conn = _conn()
    conn.execute("UPDATE chat_sessions SET converted=1 WHERE session_id=?", (session_id,))
    conn.commit()
    conn.close()


def get_all_sessions(limit: int = 100) -> list[dict]:
    conn = _conn()
    rows = conn.execute(
        """SELECT s.*,
           (SELECT content FROM chat_messages WHERE session_id=s.session_id ORDER BY id LIMIT 1) as first_msg,
           datetime(s.last_active, 'unixepoch') as last_active_dt
           FROM chat_sessions s ORDER BY s.last_active DESC LIMIT ?""",
        (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_session_messages(session_id: str) -> list[dict]:
    conn = _conn()
    rows = conn.execute(
        "SELECT role, content, datetime(created_at,'unixepoch') as ts FROM chat_messages WHERE session_id=? ORDER BY id",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def chat_stats() -> dict:
    conn = _conn()
    total = conn.execute("SELECT COUNT(*) FROM chat_sessions").fetchone()[0]
    today = conn.execute(
        "SELECT COUNT(*) FROM chat_sessions WHERE date(last_active,'unixepoch')=date('now')"
    ).fetchone()[0]
    converted = conn.execute("SELECT COUNT(*) FROM chat_sessions WHERE converted=1").fetchone()[0]
    total_messages = conn.execute("SELECT COUNT(*) FROM chat_messages").fetchone()[0]
    conn.close()
    return {
        "total_sessions": total,
        "sessions_today": today,
        "conversions": converted,
        "total_messages": total_messages,
        "conversion_rate": round(converted / total * 100, 1) if total else 0,
    }
