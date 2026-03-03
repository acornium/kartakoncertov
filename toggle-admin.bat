@echo off
REM toggle-admin.bat - enable/disable admin entry for dev
SETLOCAL
set ENV_FILE=.env.local
if "%~1"=="on" goto enable
if "%~1"=="off" goto disable

if exist %ENV_FILE% (
  echo Found %ENV_FILE%. Choose action: on/off
) else (
  echo %ENV_FILE% not found. Choose action: on/off
)
exit /b 1

:enable
echo NEXT_PUBLIC_ENABLE_ADMIN=true> %ENV_FILE%
echo Admin entry enabled.
exit /b 0

:disable
if exist %ENV_FILE% (
  del %ENV_FILE%
)
echo Admin entry disabled.
exit /b 0
