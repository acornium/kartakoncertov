"""
main.py — точка входа для запуска парсера концертных событий.

Поддерживает два режима CLI:
  python3 main.py                        — запустить все сайты
  python3 main.py --site example_club    — запустить только один сайт по имени
  python3 main.py --list                 — показать список доступных сайтов

Алгоритм:
  1. Инициализирует логирование и базу данных.
  2. Загружает все конфигурации сайтов из папки parsers/configs/.
  3. Для каждого выбранного сайта запускает парсинг (parser_engine).
  4. Сохраняет новые события в SQLite (database).
  5. Выводит итоговую статистику в консоль.
"""

import argparse
import json
import logging
import sys
from pathlib import Path

from database import init_db, save_event
from log_manager import setup_logging
from parser_engine import parse_site

# ──────────────────────────────────────────────
# Инициализация логирования
# ──────────────────────────────────────────────
setup_logging(console_level=logging.INFO)
logger = logging.getLogger(__name__)

# Папка с JSON-конфигами сайтов
CONFIGS_DIR = Path(__file__).parent / "parsers" / "configs"


# ──────────────────────────────────────────────
# Загрузка конфигураций
# ──────────────────────────────────────────────

def load_configs() -> list[dict]:
    """
    Загружает все JSON-файлы конфигурации из папки CONFIGS_DIR.
    Пропускает повреждённые файлы и логирует ошибки.
    """
    configs = []
    config_files = sorted(CONFIGS_DIR.glob("*.json"))

    if not config_files:
        logger.warning("В папке '%s' не найдено ни одного конфига (*.json).", CONFIGS_DIR)
        return configs

    for path in config_files:
        try:
            with path.open(encoding="utf-8") as f:
                config = json.load(f)
            configs.append(config)
            logger.info("Конфиг загружен: %s", path.name)
        except json.JSONDecodeError as exc:
            logger.error("Ошибка чтения JSON '%s': %s", path.name, exc)
        except OSError as exc:
            logger.error("Ошибка доступа к файлу '%s': %s", path.name, exc)

    return configs


# ──────────────────────────────────────────────
# Вывод в консоль
# ──────────────────────────────────────────────

def print_separator(char: str = "─", width: int = 60) -> None:
    """Печатает горизонтальный разделитель."""
    print(char * width)


def print_event(event: dict, is_new: bool) -> None:
    """Выводит одно событие в консоль с отметкой о статусе."""
    status = "✔ НОВОЕ   " if is_new else "◌ дубликат"
    title = event.get("title") or "Без названия"
    date = event.get("date")
    venue = event.get("venue")
    link = event.get("link")
    image_path = event.get("image_path")
    image_url = event.get("image_url")

    print(f"  {status}  {title}")
    if date:
        print(f"             Дата:     {date}")
    if venue:
        print(f"             Площадка: {venue}")
    if link:
        print(f"             Ссылка:   {link}")
    if image_path:
        print(f"             Фото:     {image_path}")
    elif image_url:
        print(f"             Фото:     {image_url} (не скачано)")
    print()


# ──────────────────────────────────────────────
# Основная логика обработки
# ──────────────────────────────────────────────

def process_sites(configs: list[dict]) -> tuple[int, int, int]:
    """
    Обрабатывает список сайтов: парсинг + сохранение + вывод.

    Возвращает (total_new, total_skip, failed_sites).
    """
    total_new = 0
    total_skip = 0
    failed_sites = 0

    for config in configs:
        site_name = config.get("site_name", "?")
        print_separator()
        print(f"  Сайт: {site_name}")
        print_separator()

        try:
            events = parse_site(config)
        except Exception as exc:
            logger.error("[%s] Критическая ошибка парсинга: %s", site_name, exc)
            failed_sites += 1
            continue

        if not events:
            print(f"  [!] Событий не найдено для сайта «{site_name}».")
            continue

        site_new = 0
        site_skip = 0

        for event in events:
            is_new = save_event(
                title=event.get("title") or "Без названия",
                date=event.get("date"),
                venue=event.get("venue"),
                link=event.get("link"),
                source=event.get("source"),
                image_url=event.get("image_url"),
                image_path=event.get("image_path"),
                description=event.get("description"),
            )
            print_event(event, is_new)

            if is_new:
                site_new += 1
            else:
                site_skip += 1

        total_new += site_new
        total_skip += site_skip

        print(f"  Итого по сайту «{site_name}»: добавлено {site_new}, дубликатов {site_skip}.")
        print(f"  Лог ошибок: logs/{site_name}.log")

    return total_new, total_skip, failed_sites


# ──────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────

def build_arg_parser() -> argparse.ArgumentParser:
    """Создаёт и возвращает парсер аргументов командной строки."""
    parser = argparse.ArgumentParser(
        prog="python3 main.py",
        description="Парсер концертных событий — собирает афишу с сайтов клубов.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Примеры:\n"
            "  python3 main.py                      # все сайты\n"
            "  python3 main.py --site example_club  # только один сайт\n"
            "  python3 main.py --list               # список сайтов\n"
        ),
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--site",
        metavar="SITE_NAME",
        help="Запустить парсер только для указанного сайта (по значению site_name в конфиге).",
    )
    group.add_argument(
        "--list",
        action="store_true",
        help="Показать список доступных сайтов и выйти.",
    )
    return parser


def run(args: argparse.Namespace) -> None:
    """Основная процедура: инициализация → выбор конфигов → обработка → итог."""

    print_separator("═")
    print("  ПАРСЕР КОНЦЕРТНЫХ СОБЫТИЙ")
    print_separator("═")

    # 1. Инициализация базы данных
    logger.info("Инициализация базы данных...")
    init_db()

    # 2. Загрузка всех конфигураций
    all_configs = load_configs()
    if not all_configs:
        logger.error("Конфигурации не найдены. Завершение работы.")
        sys.exit(1)

    # 3. Режим --list: показываем список и выходим
    if args.list:
        print_separator()
        print("  Доступные сайты:")
        print_separator()
        for cfg in all_configs:
            name = cfg.get("site_name", "?")
            url = cfg.get("url", "—")
            print(f"  • {name:<25} {url}")
        print_separator()
        return

    # 4. Фильтрация по --site
    if args.site:
        selected = [c for c in all_configs if c.get("site_name") == args.site]
        if not selected:
            available = ", ".join(c.get("site_name", "?") for c in all_configs)
            logger.error(
                "Сайт '%s' не найден. Доступные: %s", args.site, available
            )
            sys.exit(1)
        configs = selected
        logger.info("Выбран сайт: %s", args.site)
    else:
        configs = all_configs
        logger.info("Запуск для всех сайтов (%d).", len(configs))

    # 5. Обработка
    total_new, total_skip, failed_sites = process_sites(configs)

    # 6. Итоговая статистика
    print_separator("═")
    print("  ИТОГ")
    print_separator("═")
    print(f"  Обработано сайтов : {len(configs)}")
    print(f"  Ошибок парсинга   : {failed_sites}")
    print(f"  Новых событий     : {total_new}")
    print(f"  Дубликатов        : {total_skip}")
    print(f"  Логи ошибок       : logs/")
    print_separator("═")
    logger.info("Работа завершена.")


# ──────────────────────────────────────────────
# Точка входа
# ──────────────────────────────────────────────

if __name__ == "__main__":
    arg_parser = build_arg_parser()
    parsed_args = arg_parser.parse_args()
    run(parsed_args)
