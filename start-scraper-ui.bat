@echo off
REM start-scraper-ui.bat - run built-in scraper UI
setlocal
chcp 65001 >nul
set "PYTHONIOENCODING=utf-8"

start "Scraper API" cmd /c ""%~dp0start-scraper.bat""
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8081/scraper-api/ui"
exit /b 0
