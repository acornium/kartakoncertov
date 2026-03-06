@echo off
REM start-local.bat - installs deps if missing and starts Next.js dev server
SETLOCAL
if NOT EXIST "node_modules" (
  echo node_modules not found. Installing dependencies...
  npm install
) else (
  echo node_modules found. Skipping install.
)

echo Starting development server (npm run dev -- --webpack)...
npm run dev -- --webpack

ENDLOCAL
pause
