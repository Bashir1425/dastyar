"""لایه‌ی داده‌ی «دستیار» — SQLite خالص (کتابخانه‌ی استاندارد).

جدول‌ها: users، conversations، messages.
هر تابع یک اتصال کوتاه‌عمر باز می‌کند تا با اجرای هم‌زمان درخواست‌ها در
FastAPI سازگار باشد. ردیف‌ها به‌صورت dict برگردانده می‌شوند.
"""

from __future__ import annotations

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parent / "dastyar.db"

DEFAULT_TITLE = "گفتگوی جدید"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT,
    name          TEXT    NOT NULL,
    avatar_url    TEXT,
    provider      TEXT    NOT NULL DEFAULT 'email',
    provider_id   TEXT,
    theme         TEXT    NOT NULL DEFAULT 'system',
    language      TEXT    NOT NULL DEFAULT 'fa',
    created_at    TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider
    ON users (provider, provider_id)
    WHERE provider_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title      TEXT    NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
    ON conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    role            TEXT    NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT    NOT NULL,
    created_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, id);
"""

USER_FIELDS = "id, email, name, avatar_url, provider, theme, language, created_at"
CONVERSATION_FIELDS = "id, title, created_at, updated_at"
MESSAGE_FIELDS = "id, role, content, created_at"


def utcnow() -> str:
    """زمان فعلی UTC به‌صورت ISO-8601 (قابل تجزیه برای جاوااسکریپت)."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """اتصال کوتاه‌عمر با commit/rollback خودکار."""
    conn = sqlite3.connect(DB_PATH, timeout=15.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """ساخت جدول‌ها و ایندکس‌ها در صورت نبود."""
    with connect() as conn:
        conn.executescript(SCHEMA)


# --------------------------------------------------------------------------- #
# کاربران
# --------------------------------------------------------------------------- #
def create_user(
    *,
    email: str,
    name: str,
    password_hash: str | None = None,
    provider: str = "email",
    provider_id: str | None = None,
    avatar_url: str | None = None,
    theme: str = "system",
    language: str = "fa",
) -> dict[str, Any]:
    now = utcnow()
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO users
                (email, password_hash, name, avatar_url, provider, provider_id,
                 theme, language, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (email, password_hash, name, avatar_url, provider, provider_id,
             theme, language, now),
        )
        user_id = int(cur.lastrowid)
    user = get_user(user_id)
    assert user is not None  # تازه ساخته شده است
    return user


def get_user(user_id: int) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            f"SELECT {USER_FIELDS} FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return dict(row) if row else None


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            f"SELECT {USER_FIELDS} FROM users WHERE email = ?", (email.strip().lower(),)
        ).fetchone()
    return dict(row) if row else None


def get_user_password_hash(user_id: int) -> str | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    return row["password_hash"] if row else None


def get_user_by_oauth(provider: str, provider_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            f"SELECT {USER_FIELDS} FROM users WHERE provider = ? AND provider_id = ?",
            (provider, provider_id),
        ).fetchone()
    return dict(row) if row else None


def update_user(user_id: int, **fields: Any) -> dict[str, Any] | None:
    """به‌روزرسانی فیلدهای مجاز کاربر."""
    allowed = {"name", "avatar_url", "theme", "language", "provider", "provider_id",
               "password_hash", "email"}
    updates = {key: value for key, value in fields.items() if key in allowed}
    if not updates:
        return get_user(user_id)

    assignments = ", ".join(f"{key} = ?" for key in updates)
    values = [*updates.values(), user_id]
    with connect() as conn:
        conn.execute(f"UPDATE users SET {assignments} WHERE id = ?", values)
    return get_user(user_id)


# --------------------------------------------------------------------------- #
# گفتگوها
# --------------------------------------------------------------------------- #
def list_conversations(user_id: int) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            f"""
            SELECT {CONVERSATION_FIELDS}
            FROM conversations
            WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def create_conversation(user_id: int, title: str = DEFAULT_TITLE) -> dict[str, Any]:
    now = utcnow()
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO conversations (user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, title.strip() or DEFAULT_TITLE, now, now),
        )
        conversation_id = int(cur.lastrowid)
    conversation = get_conversation(conversation_id, user_id)
    assert conversation is not None
    return conversation


def get_conversation(conversation_id: int, user_id: int) -> dict[str, Any] | None:
    """فقط اگر گفتگو متعلق به همین کاربر باشد برمی‌گردد."""
    with connect() as conn:
        row = conn.execute(
            f"""
            SELECT {CONVERSATION_FIELDS}
            FROM conversations
            WHERE id = ? AND user_id = ?
            """,
            (conversation_id, user_id),
        ).fetchone()
    return dict(row) if row else None


def rename_conversation(conversation_id: int, user_id: int, title: str) -> dict[str, Any] | None:
    now = utcnow()
    with connect() as conn:
        cur = conn.execute(
            """
            UPDATE conversations
            SET title = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (title.strip(), now, conversation_id, user_id),
        )
        changed = cur.rowcount
    if not changed:
        return None
    return get_conversation(conversation_id, user_id)


def touch_conversation(conversation_id: int, user_id: int, when: str | None = None) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ? AND user_id = ?",
            (when or utcnow(), conversation_id, user_id),
        )


def delete_conversation(conversation_id: int, user_id: int) -> bool:
    with connect() as conn:
        cur = conn.execute(
            "DELETE FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user_id),
        )
        return cur.rowcount > 0


# --------------------------------------------------------------------------- #
# پیام‌ها
# --------------------------------------------------------------------------- #
def list_messages(
    conversation_id: int, *, limit: int | None = None, oldest_first: bool = True
) -> list[dict[str, Any]]:
    """پیام‌های یک گفتگو؛ با limit، آخرین N پیام برمی‌گردد."""
    query = f"SELECT {MESSAGE_FIELDS} FROM messages WHERE conversation_id = ?"
    params: list[Any] = [conversation_id]
    if limit is not None:
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
    else:
        query += " ORDER BY id ASC"

    with connect() as conn:
        rows = conn.execute(query, params).fetchall()

    messages = [dict(row) for row in rows]
    if limit is not None and oldest_first:
        messages.reverse()
    return messages


def add_message(conversation_id: int, role: str, content: str) -> dict[str, Any]:
    """افزودن پیام و به‌روزرسانی زمان گفتگو."""
    now = utcnow()
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO messages (conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (conversation_id, role, content, now),
        )
        message_id = int(cur.lastrowid)
        conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now, conversation_id),
        )
        row = conn.execute(
            f"SELECT {MESSAGE_FIELDS} FROM messages WHERE id = ?", (message_id,)
        ).fetchone()

    assert row is not None
    return dict(row)


def count_messages(conversation_id: int, role: str | None = None) -> int:
    query = "SELECT COUNT(*) AS total FROM messages WHERE conversation_id = ?"
    params: list[Any] = [conversation_id]
    if role is not None:
        query += " AND role = ?"
        params.append(role)
    with connect() as conn:
        row = conn.execute(query, params).fetchone()
    return int(row["total"]) if row else 0
