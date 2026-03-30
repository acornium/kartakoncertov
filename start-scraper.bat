@echo off
REM start-scraper.bat - run scraper API as single instance
setlocal
chcp 65001 >nul
set "PYTHONIOENCODING=utf-8"

set "ROOT=%~dp0"
set "SCRAPER_DIR=%ROOT%Event-Collector\scraper"

if not exist "%SCRAPER_DIR%\web_api.py" (
  echo scraper web_api.py not found: "%SCRAPER_DIR%\web_api.py"
  exit /b 1
)

REM Kill existing process listening on scraper port (8081), if any.
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":8081" ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)

cd /d "%SCRAPER_DIR%"
python web_api.py
