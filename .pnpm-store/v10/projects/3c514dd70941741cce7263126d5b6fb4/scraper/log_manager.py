"""
log_manager.py — настройка системы логирования.

Обеспечивает два потока логов:
  - Консоль (stdout): уровень INFO — видит пользователь.
  - Файл logs/<site_name>.log: уровень DEBUG — детальные ошибки и отладка.

Использование:
    from log_manager import setup_logging, get_site_logger
    setup_logging()                         # вызвать один раз в начале
    log = get_site_logger("example_club")   # логгер для конкретного сайта
"""

import logging
import sys
from pathlib import Path

# Папка для хранения лог-файлов (рядом с main.py)
LOGS_DIR = Path(__file__).parent / "logs"

# Формат сообщений
CONSOLE_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
FILE_FORMAT    = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
DATE_FORMAT    = "%H:%M:%S"
FILE_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logging(console_level: int = logging.INFO) -> None:
    """
    Инициализирует корневой логгер.
    Должна вызываться один раз в самом начале программы.

    После этого любой logger.getLogger(name) будет писать в консоль.
    Лог-файлы для конкретных сайтов подключаются через get_site_logger().
    """
    LOGS_DIR.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)  # разрешаем все уровни на уровне корня

    # Очищаем уже существующие обработчики (защита от повторного вызова)
    root.handlers.clear()

    # — Консольный обработчик
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(console_level)
    console_handler.setFormatter(logging.Formatter(CONSOLE_FORMAT, datefmt=DATE_FORMAT))
    root.addHandler(console_handler)


def get_site_logger(site_name: str) -> logging.Logger:
    """
    Возвращает логгер для конкретного сайта.

    Помимо вывода в консоль (наследуется от корневого),
    добавляет файловый обработчик: logs/<site_name>.log

    Каждый запуск программы дописывает в конец файла,
    так что история ошибок накапливается.
    """
    log_path = LOGS_DIR / f"{site_name}.log"
    logger = logging.getLogger(f"site.{site_name}")

    # Не дублируем обработчики при повторных вызовах
    if logger.handlers:
        return logger

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(
        logging.Formatter(FILE_FORMAT, datefmt=FILE_DATE_FORMAT)
    )
    logger.addHandler(file_handler)
    logger.propagate = True  # события также идут в консоль через корневой логгер
    return logger
