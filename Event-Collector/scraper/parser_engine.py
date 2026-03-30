"""
parser_engine.py — универсальный движок парсинга концертных событий.

Читает конфигурацию сайта из JSON-файла и:
  1. Загружает HTML по указанному URL (через httpx) с поддержкой повторных попыток.
  2. Находит все блоки событий по list_selector.
  3. Извлекает поля по CSS-селекторам из fields (поддержка массива запасных селекторов).
  4. Для поля image — извлекает src у <img> и скачивает файл в images/<site_name>/.
  5. Очищает текст и нормализует пробелы.
  6. Парсит дату с помощью dateparser.
  7. Делает паузы между запросами (rate limiting).
  8. Поддерживает режим type=json_api: данные берутся напрямую из JSON-ответа по ключам json_fields.
"""

import hashlib
import logging
import mimetypes
import re
import time
from datetime import timedelta
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse, urljoin

import httpx
import dateparser
from bs4 import BeautifulSoup, Tag

from log_manager import get_site_logger

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Параметры HTTP-запросов
# ──────────────────────────────────────────────

REQUEST_TIMEOUT = 15
MAX_RETRIES = 3
RETRY_BACKOFF = 2.0
DEFAULT_RATE_LIMIT = 1.0

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

# Папка для хранения изображений (рядом с main.py)
IMAGES_BASE_DIR = Path(__file__).parent / "images"

# Максимальный размер скачиваемого изображения (10 МБ)
MAX_IMAGE_SIZE = 10 * 1024 * 1024

RUSSIAN_MONTHS = {
    "января": 1,
    "январь": 1,
    "февраля": 2,
    "февраль": 2,
    "марта": 3,
    "март": 3,
    "апреля": 4,
    "апрель": 4,
    "мая": 5,
    "май": 5,
    "июня": 6,
    "июнь": 6,
    "июля": 7,
    "июль": 7,
    "августа": 8,
    "август": 8,
    "сентября": 9,
    "сентябрь": 9,
    "октября": 10,
    "октябрь": 10,
    "ноября": 11,
    "ноябрь": 11,
    "декабря": 12,
    "декабрь": 12,
}


# ──────────────────────────────────────────────
# Вспомогательные функции — текст
# ──────────────────────────────────────────────

def _clean_text(text: Optional[str]) -> Optional[str]:
    """Убирает лишние пробелы и переносы строк из строки."""
    if text is None:
        return None
    return re.sub(r"\s+", " ", text).strip() or None


def _safe_filename(title: str, url: str, max_len: int = 80) -> str:
    """
    Формирует безопасное имя файла из заголовка события и URL изображения.

    Берёт первые слова заголовка, убирает недопустимые символы,
    добавляет хэш URL для уникальности и расширение из URL.
    """
    # Убираем всё кроме букв, цифр, пробелов и дефисов
    safe_title = re.sub(r"[^\w\s-]", "", title, flags=re.UNICODE).strip()
    safe_title = re.sub(r"\s+", "_", safe_title)[:max_len]

    # Короткий хэш URL для уникальности
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]

    # Расширение файла из URL (jpg, png, webp и т.д.)
    parsed = urlparse(url)
    path_ext = Path(parsed.path).suffix.lower()
    # Проверяем что расширение реальное (не просто точка)
    ext = path_ext if path_ext in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"} else ".jpg"

    return f"{safe_title}_{url_hash}{ext}"


# ──────────────────────────────────────────────
# Вспомогательные функции — HTML
# ──────────────────────────────────────────────

def _extract_field(block: Tag, selector: str) -> Optional[str]:
    """
    Извлекает значение поля из HTML-блока по одному CSS-селектору.

    Логика по типу тега:
      <img>  → атрибут src (или data-src для ленивой загрузки)
      <a>    → атрибут href
      прочие → текстовое содержимое
    """
    try:
        element = block.select_one(selector)
        if element is None:
            return None
        if element.name == "img":
            # Сначала data-src (lazy-load), потом обычный src
            return element.get("data-src") or element.get("src") or None
        if element.name == "a":
            return element.get("href") or _clean_text(element.get_text())
        return _clean_text(element.get_text())
    except Exception as exc:
        logger.warning("Ошибка извлечения поля по селектору '%s': %s", selector, exc)
        return None


def _extract_field_with_fallbacks(
    block: Tag,
    selectors: str | list[str],
    site_log: logging.Logger,
    field_name: str,
) -> Optional[str]:
    """
    Извлекает поле, перебирая список запасных селекторов.

    Принимает строку (одиночный селектор) или список строк.
    Возвращает первое непустое значение. При неудаче — None.
    """
    selector_list = [selectors] if isinstance(selectors, str) else list(selectors)

    for selector in selector_list:
        value = _extract_field(block, selector)
        if value:
            if len(selector_list) > 1:
                site_log.debug(
                    "Поле '%s': использован селектор '%s' (из %d вариантов)",
                    field_name, selector, len(selector_list),
                )
            return value

    if len(selector_list) > 1:
        site_log.warning(
            "Поле '%s': ни один из %d селекторов не дал результата: %s",
            field_name, len(selector_list), selector_list,
        )
    return None


def _parse_date_range(raw_date: str) -> list[str]:
    """
    Раскрывает диапазоны дат вида:
      - "с 3 по 5 апреля"
      - "с 30 апреля по 2 мая"
      - "3 по 5 апреля"
    Возвращает список ISO-дат. Если строка не диапазон — пустой список.
    """
    normalized = _clean_text(raw_date.lower())
    if not normalized:
        return []

    match = re.match(
        r"^(?:с\s+)?(\d{1,2})(?:\s+([а-яё]+))?\s+по\s+(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?$",
        normalized,
    )
    if not match:
        return []

    start_day = int(match.group(1))
    start_month_name = match.group(2)
    end_day = int(match.group(3))
    end_month_name = match.group(4)
    explicit_year = match.group(5)

    end_month = RUSSIAN_MONTHS.get(end_month_name)
    start_month = RUSSIAN_MONTHS.get(start_month_name) if start_month_name else end_month
    if not start_month or not end_month:
        return []

    if explicit_year:
        year = int(explicit_year)
    else:
        parsed_end = dateparser.parse(
            f"{end_day} {end_month_name}",
            settings={
                "PREFER_DAY_OF_MONTH": "first",
                "RETURN_AS_TIMEZONE_AWARE": False,
            },
            languages=["ru"],
        )
        if not parsed_end:
            return []
        year = parsed_end.year

    try:
        start_date = dateparser.parse(
            f"{start_day} {start_month_name or end_month_name} {year}",
            settings={
                "PREFER_DAY_OF_MONTH": "first",
                "RETURN_AS_TIMEZONE_AWARE": False,
            },
            languages=["ru"],
        )
        end_date = dateparser.parse(
            f"{end_day} {end_month_name} {year}",
            settings={
                "PREFER_DAY_OF_MONTH": "first",
                "RETURN_AS_TIMEZONE_AWARE": False,
            },
            languages=["ru"],
        )
    except Exception:
        return []

    if not start_date or not end_date:
        return []

    if start_date > end_date:
        return []

    result: list[str] = []
    current = start_date
    while current <= end_date:
        result.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)
    return result


def _parse_date_values(raw_date: Optional[str], site_log: logging.Logger) -> list[str]:
    """Возвращает одну или несколько ISO-дат для строки даты."""
    """
    Пытается распознать дату из строки с помощью dateparser.
    Возвращает список ISO-строк. При неудаче — список с оригиналом.
    """
    if not raw_date:
        return []

    if expanded_dates := _parse_date_range(raw_date):
        return expanded_dates

    parsed = dateparser.parse(
        raw_date,
        settings={
            "PREFER_DAY_OF_MONTH": "first",
            "RETURN_AS_TIMEZONE_AWARE": False,
        },
        languages=["ru"],
    )
    if parsed:
        return [parsed.strftime("%Y-%m-%d")]
    site_log.warning("Не удалось распознать дату: '%s'", raw_date)
    return [raw_date]


def _parse_date(raw_date: Optional[str], site_log: logging.Logger) -> Optional[str]:
    parsed_dates = _parse_date_values(raw_date, site_log)
    return parsed_dates[0] if parsed_dates else None


def _expand_event_dates(
    event: dict[str, Optional[str]],
    raw_date: Optional[str],
    site_log: logging.Logger,
) -> list[dict[str, Optional[str]]]:
    """Возвращает одну или несколько копий события с развернутыми датами."""
    parsed_dates = _parse_date_values(raw_date, site_log)
    if not parsed_dates:
        expanded_event = event.copy()
        expanded_event["date"] = None
        return [expanded_event]

    expanded_events: list[dict[str, Optional[str]]] = []
    for parsed_date in parsed_dates:
        expanded_event = event.copy()
        expanded_event["date"] = parsed_date
        expanded_events.append(expanded_event)
    return expanded_events


def _make_absolute_url(raw_url: str, base_url: str) -> str:
    """Преобразует относительный URL в абсолютный, используя базовый URL страницы."""
    return urljoin(base_url, raw_url)


# ──────────────────────────────────────────────
# HTTP-клиент с повторными попытками
# ──────────────────────────────────────────────

def fetch_html(url: str, site_log: logging.Logger) -> Optional[str]:
    """
    Загружает HTML-страницу по URL с автоматическими повторными попытками
    и экспоненциальной задержкой между ними.
    """
    delay = RETRY_BACKOFF

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            site_log.debug("Попытка %d/%d: GET %s", attempt, MAX_RETRIES, url)
            response = httpx.get(
                url,
                headers=DEFAULT_HEADERS,
                timeout=REQUEST_TIMEOUT,
                follow_redirects=True,
            )
            response.raise_for_status()
            site_log.debug("Успешно загружено (%d байт)", len(response.content))
            return response.text

        except httpx.HTTPStatusError as exc:
            site_log.error(
                "HTTP-ошибка %s при загрузке %s (попытка %d/%d)",
                exc.response.status_code, url, attempt, MAX_RETRIES,
            )
            if exc.response.status_code < 500 and exc.response.status_code != 429:
                break

        except httpx.RequestError as exc:
            site_log.error(
                "Ошибка сети при загрузке %s (попытка %d/%d): %s",
                url, attempt, MAX_RETRIES, exc,
            )

        if attempt < MAX_RETRIES:
            site_log.info("Повтор через %.1f сек...", delay)
            time.sleep(delay)
            delay *= 2

    site_log.error("Все %d попытки исчерпаны для URL: %s", MAX_RETRIES, url)
    return None


# ──────────────────────────────────────────────
# Скачивание изображений
# ──────────────────────────────────────────────

def download_image(
    image_url: str,
    title: str,
    site_name: str,
    site_log: logging.Logger,
) -> Optional[str]:
    """
    Скачивает изображение события и сохраняет его локально.

    Файлы хранятся в: images/<site_name>/<безопасное_имя_файла>

    Возвращает строку с путём к сохранённому файлу (относительный путь
    от корня проекта) или None при ошибке.

    Если файл уже существует — повторно не скачивает (кэширование).
    """
    # Создаём папку для сайта
    site_images_dir = IMAGES_BASE_DIR / site_name
    site_images_dir.mkdir(parents=True, exist_ok=True)

    filename = _safe_filename(title, image_url)
    file_path = site_images_dir / filename

    # Если файл уже скачан — возвращаем путь без повторной загрузки
    if file_path.exists():
        site_log.debug("Изображение уже существует: %s", file_path)
        return str(file_path)

    # Скачиваем с теми же retry-параметрами
    delay = RETRY_BACKOFF
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            site_log.debug(
                "Скачивание изображения (попытка %d/%d): %s",
                attempt, MAX_RETRIES, image_url,
            )
            response = httpx.get(
                image_url,
                headers=DEFAULT_HEADERS,
                timeout=REQUEST_TIMEOUT,
                follow_redirects=True,
            )
            response.raise_for_status()

            # Проверяем размер
            content = response.content
            if len(content) > MAX_IMAGE_SIZE:
                site_log.warning(
                    "Изображение слишком большое (%d байт), пропущено: %s",
                    len(content), image_url,
                )
                return None

            # Уточняем расширение из Content-Type, если нужно
            content_type = response.headers.get("content-type", "")
            if content_type and file_path.suffix == ".jpg":
                guessed_ext = mimetypes.guess_extension(content_type.split(";")[0].strip())
                if guessed_ext and guessed_ext not in (".jpe", ".jpeg"):
                    file_path = file_path.with_suffix(guessed_ext)

            file_path.write_bytes(content)
            site_log.info("Изображение сохранено: %s (%d байт)", file_path, len(content))
            return str(file_path)

        except httpx.HTTPStatusError as exc:
            site_log.error(
                "HTTP-ошибка %s при скачивании изображения (попытка %d/%d): %s",
                exc.response.status_code, attempt, MAX_RETRIES, image_url,
            )
            if exc.response.status_code < 500 and exc.response.status_code != 429:
                break

        except httpx.RequestError as exc:
            site_log.error(
                "Ошибка сети при скачивании изображения (попытка %d/%d): %s — %s",
                attempt, MAX_RETRIES, image_url, exc,
            )

        except OSError as exc:
            site_log.error("Ошибка записи файла '%s': %s", file_path, exc)
            return None

        if attempt < MAX_RETRIES:
            time.sleep(delay)
            delay *= 2

    site_log.warning("Не удалось скачать изображение: %s", image_url)
    return None


# ──────────────────────────────────────────────
# Режим JSON API
# ──────────────────────────────────────────────

def _get_nested(obj: Any, key_path: str) -> Optional[str]:
    """
    Извлекает значение из словаря по пути вида «field» или «parent.child».
    Возвращает строку или None.
    """
    parts = key_path.split(".")
    cur = obj
    for p in parts:
        if isinstance(cur, dict):
            cur = cur.get(p)
        else:
            return None
    return str(cur) if cur is not None else None


def _parse_site_json_api(config: dict[str, Any]) -> list[dict[str, Optional[str]]]:
    """
    Парсит сайт, у которого данные доступны напрямую в JSON (без HTML-рендеринга).

    Конфиг должен содержать:
      url          — URL JSON-эндпоинта (возвращает список объектов)
      json_fields  — маппинг: title/date/link/image/description → ключ в JSON-объекте
                     Поддерживается dotted-путь, например «event.title».
    """
    site_name = config.get("site_name", "неизвестный_сайт")
    url = config.get("url")
    json_fields: dict[str, str] = config.get("json_fields", {})
    venue = config.get("venue")
    rate_limit: float = float(config.get("rate_limit_seconds", DEFAULT_RATE_LIMIT))

    site_log = get_site_logger(site_name)

    if not url:
        site_log.error("Отсутствует 'url' в конфигурации.")
        return []
    if not json_fields.get("title"):
        site_log.error("json_fields.title обязателен для режима json_api.")
        return []

    site_log.info("[JSON API] Загружаем данные: %s", url)

    if rate_limit > 0:
        site_log.debug("Rate limit: пауза %.1f сек перед запросом", rate_limit)
        time.sleep(rate_limit)

    # Загружаем JSON
    try:
        response = httpx.get(
            url,
            headers=DEFAULT_HEADERS,
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as exc:
        site_log.error("Ошибка при загрузке JSON-данных: %s", exc)
        return []

    if not isinstance(data, list):
        # Некоторые API оборачивают в {items: [...]} — пробуем найти список
        if isinstance(data, dict):
            for v in data.values():
                if isinstance(v, list):
                    data = v
                    break
        if not isinstance(data, list):
            site_log.error("Ожидался JSON-массив, получено: %s", type(data).__name__)
            return []

    site_log.info("[JSON API] Получено объектов: %d", len(data))

    events: list[dict[str, Optional[str]]] = []

    for idx, item in enumerate(data):
        try:
            title_key = json_fields.get("title", "title")
            title = _clean_text(_get_nested(item, title_key))
            if not title:
                site_log.debug("Объект #%d пропущен: нет заголовка.", idx)
                continue

            event: dict[str, Optional[str]] = {
                "title": title,
                "venue": venue,
                "source": site_name,
                "image_url": None,
                "image_path": None,
            }
            raw_date_value: Optional[str] = None

            # Дата
            if date_key := json_fields.get("date"):
                raw_date_value = _get_nested(item, date_key)

            # Ссылка
            if link_key := json_fields.get("link"):
                raw_link = _get_nested(item, link_key)
                event["link"] = _make_absolute_url(raw_link, url) if raw_link else None
            else:
                event["link"] = None

            # Изображение
            if image_key := json_fields.get("image"):
                raw_img = _get_nested(item, image_key)
                if raw_img:
                    image_url = _make_absolute_url(raw_img, url)
                    event["image_url"] = image_url
                    event["image_path"] = download_image(image_url, title, site_name, site_log)

            # Описание (опционально)
            if desc_key := json_fields.get("description"):
                event["description"] = _clean_text(_get_nested(item, desc_key))

            events.extend(_expand_event_dates(event, raw_date_value, site_log))

        except Exception as exc:
            site_log.error("Ошибка при разборе объекта #%d: %s", idx, exc)
            continue

    site_log.info("Успешно разобрано событий: %d", len(events))
    return events


# ──────────────────────────────────────────────
# Главная функция парсинга
# ──────────────────────────────────────────────

def parse_site(config: dict[str, Any]) -> list[dict[str, Optional[str]]]:
    """
    Парсит один сайт по конфигурации.

    Возвращает список событий — словарей с ключами:
      title, date, link, venue, source, image_url, image_path

    Поддерживает:
      - Режим type=json_api (прямой парсинг JSON-ответа по ключам json_fields).
      - Fallback-селекторы (строка или массив строк).
      - Скачивание изображений в images/<site_name>/.
      - Rate limiting (пауза перед запросом).
      - Повторные HTTP-попытки с экспоненциальной задержкой.
      - Лог-файл для каждого сайта.
    """
    # Маршрутизация по типу источника
    if config.get("type") == "json_api":
        return _parse_site_json_api(config)

    site_name = config.get("site_name", "неизвестный_сайт")
    url = config.get("url")
    list_selector = config.get("list_selector")
    fields_config: dict[str, str | list[str]] = config.get("fields", {})
    venue = config.get("venue")
    rate_limit: float = float(config.get("rate_limit_seconds", DEFAULT_RATE_LIMIT))

    site_log = get_site_logger(site_name)

    if not url:
        site_log.error("Отсутствует 'url' в конфигурации.")
        return []
    if not list_selector:
        site_log.error("Отсутствует 'list_selector' в конфигурации.")
        return []

    site_log.info("Загружаем страницу: %s", url)

    if rate_limit > 0:
        site_log.debug("Rate limit: пауза %.1f сек перед запросом", rate_limit)
        time.sleep(rate_limit)

    html = fetch_html(url, site_log)
    if html is None:
        site_log.error("Не удалось загрузить HTML, сайт пропущен.")
        return []

    soup = BeautifulSoup(html, "html.parser")
    blocks = soup.select(list_selector)
    site_log.info("Найдено блоков событий: %d", len(blocks))

    events: list[dict[str, Optional[str]]] = []

    for idx, block in enumerate(blocks):
        try:
            event: dict[str, Optional[str]] = {
                "venue": venue,
                "source": site_name,
                "image_url": None,
                "image_path": None,
            }
            raw_date_value: Optional[str] = None

            for field_name, selectors in fields_config.items():
                raw_value = _extract_field_with_fallbacks(
                    block, selectors, site_log, field_name
                )

                if field_name == "date":
                    raw_date_value = raw_value

                elif field_name == "link":
                    if raw_value:
                        raw_value = _make_absolute_url(raw_value, url)
                    event["link"] = raw_value

                elif field_name == "image":
                    if raw_value:
                        # Преобразуем относительный URL изображения в абсолютный
                        image_url = _make_absolute_url(raw_value, url)
                        event["image_url"] = image_url
                        # Скачиваем файл (title может быть ещё не заполнен,
                        # используем временный placeholder — скачаем после цикла полей)
                        event["_image_url_raw"] = image_url  # сохраним для скачивания
                    else:
                        event["image_url"] = None

                else:
                    event[field_name] = raw_value

            # Пропускаем блоки без заголовка
            if not event.get("title"):
                site_log.debug("Блок #%d пропущен: нет заголовка.", idx)
                continue

            # Скачиваем изображение теперь, когда title уже известен
            raw_img_url = event.pop("_image_url_raw", None)
            if raw_img_url:
                event["image_path"] = download_image(
                    raw_img_url,
                    event.get("title") or f"event_{idx}",
                    site_name,
                    site_log,
                )

            events.extend(_expand_event_dates(event, raw_date_value, site_log))

        except Exception as exc:
            site_log.error("Ошибка при разборе блока #%d: %s", idx, exc)
            continue

    site_log.info("Успешно разобрано событий: %d", len(events))
    return events
