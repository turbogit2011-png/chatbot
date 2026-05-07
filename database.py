import sqlite3
import json
from config import Config

def get_db():
    conn = sqlite3.connect(Config.DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS store_config (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_at TEXT DEFAULT (datetime('now')),
            scope TEXT,
            item_id TEXT,
            item_name TEXT,
            issue_type TEXT,
            severity TEXT,
            message TEXT,
            current_value TEXT,
            suggested_value TEXT,
            fixed INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS optimizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            applied_at TEXT DEFAULT (datetime('now')),
            scope TEXT,
            item_id TEXT,
            item_name TEXT,
            field TEXT,
            old_value TEXT,
            new_value TEXT,
            method TEXT
        );

        CREATE TABLE IF NOT EXISTS content_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT,
            field TEXT,
            content TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()

def get_config(key, default=None):
    conn = get_db()
    row = conn.execute("SELECT value FROM store_config WHERE key=?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default

def set_config(key, value):
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO store_config(key,value) VALUES(?,?)", (key, str(value)))
    conn.commit()
    conn.close()

def log_audit(scope, item_id, item_name, issue_type, severity, message, current="", suggested=""):
    conn = get_db()
    conn.execute(
        "INSERT INTO audit_results(scope,item_id,item_name,issue_type,severity,message,current_value,suggested_value) VALUES(?,?,?,?,?,?,?,?)",
        (scope, str(item_id), item_name, issue_type, severity, message, str(current), str(suggested))
    )
    conn.commit()
    conn.close()

def log_optimization(scope, item_id, item_name, field, old_val, new_val, method="ai"):
    conn = get_db()
    conn.execute(
        "INSERT INTO optimizations(scope,item_id,item_name,field,old_value,new_value,method) VALUES(?,?,?,?,?,?,?)",
        (scope, str(item_id), item_name, field, str(old_val), str(new_val), method)
    )
    conn.commit()
    conn.close()

def get_stats():
    conn = get_db()
    stats = {
        "total_audits": conn.execute("SELECT COUNT(*) FROM audit_results").fetchone()[0],
        "critical": conn.execute("SELECT COUNT(*) FROM audit_results WHERE severity='critical' AND fixed=0").fetchone()[0],
        "warnings": conn.execute("SELECT COUNT(*) FROM audit_results WHERE severity='warning' AND fixed=0").fetchone()[0],
        "fixed": conn.execute("SELECT COUNT(*) FROM audit_results WHERE fixed=1").fetchone()[0],
        "optimizations": conn.execute("SELECT COUNT(*) FROM optimizations").fetchone()[0],
    }
    conn.close()
    return stats
