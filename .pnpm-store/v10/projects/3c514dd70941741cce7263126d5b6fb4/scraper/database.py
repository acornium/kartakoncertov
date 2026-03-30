"""
database.py — управление SQLite базой данных для хранения концертных событий.
Создаёт таблицу, добавляет события и предотвращает дубликаты.
"""

import logging
import re
import sqlite3
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Путь к файлу базы данных
DB_PATH = Path(__file__).parent / "events.db"
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def get_connection() -> sqlite3.Connection:
    """Открывает и возвращает подключение к SQLite базе данных."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # позволяет обращаться к полям по имени
    return conn


def init_db() -> None:
    """
    Инициализирует базу данных: создаёт таблицу events, если она ещё не существует.
    Уникальное ограничение на (title, date, venue) предотвращает дубликаты.

    Также добавляет новые колонки image_url, image_path и description к уже существующей таблице
    (безопасная миграция — ошибка игнорируется, если колонка уже есть).
    """
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                title      TEXT    NOT NULL,
                date       TEXT,
                venue      TEXT,
                link       TEXT,
                source     TEXT,
                image_url  TEXT,
                image_path TEXT,
                description TEXT,
                UNIQUE (title, date, venue)
            )
        """)
        conn.commit()

        # Миграция существующей таблицы: добавляем колонки для изображений,
        # если их ещё нет (SQLite не поддерживает ADD COLUMN IF NOT EXISTS)
        for column, col_type in [
            ("image_url", "TEXT"),
            ("image_path", "TEXT"),
            ("description", "TEXT"),
        ]:
            try:
                conn.execute(f"ALTER TABLE events ADD COLUMN {column} {col_type}")
                conn.commit()
                logger.info("Добавлена колонка '%s' в таблицу events.", column)
            except sqlite3.OperationalError:
                pass  # колонка уже существует — всё в порядке

    logger.info("База данных инициализирована: %s", DB_PATH)


def save_event(
    title: str,
    date: Optional[str],
    venue: Optional[str],
    link: Optional[str],
    source: Optional[str],
    image_url: Optional[str] = None,
    image_path: Optional[str] = None,
    description: Optional[str] = None,
) -> bool:
    """
    Сохраняет одно событие в базу данных.

    Возвращает True, если событие было добавлено (новое),
    False — если оно уже существует (дубликат пропущен).
    """
    try:
        with get_connection() as conn:
            if date and ISO_DATE_RE.match(date):
                conn.execute(
                    """
                    DELETE FROM events
                    WHERE title = ?
                      AND venue IS ?
                      AND source IS ?
                      AND date IS NOT NULL
                      AND date NOT GLOB '????-??-??'
                    """,
                    (title, venue, source),
                )
            existed = conn.execute(
                "SELECT 1 FROM events WHERE title = ? AND date IS ? AND venue IS ? LIMIT 1",
                (title, date, venue),
            ).fetchone() is not None
            conn.execute(
                """
                INSERT INTO events (
                    title, date, venue, link, source, image_url, image_path, description
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(title, date, venue) DO UPDATE SET
                    link = COALESCE(excluded.link, events.link),
                    source = COALESCE(excluded.source, events.source),
                    image_url = COALESCE(excluded.image_url, events.image_url),
                    image_path = COALESCE(excluded.image_path, events.image_path),
                    description = COALESCE(excluded.description, events.description)
                """,
                (title, date, venue, link, source, image_url, image_path, description),
            )
            conn.commit()
        return not existed
    except sqlite3.Error as exc:
        logger.error("Ошибка при сохранении события '%s': %s", title, exc)
        return False


def fetch_all_events() -> list[dict]:
    """Возвращает все события из базы данных в виде списка словарей."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, date, venue, link, source, image_url, image_path, description
            FROM events
            ORDER BY id DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]



def update_image_path(event_id: int, image_path: str) -> None:
    """Update image_path for an event if it exists."""
    try:
        with get_connection() as conn:
            conn.execute("UPDATE events SET image_path = ? WHERE id = ?", (image_path, event_id))
            conn.commit()
    except sqlite3.Error as exc:
        logger.error("Error updating image_path (id=%s): %s", event_id, exc)
