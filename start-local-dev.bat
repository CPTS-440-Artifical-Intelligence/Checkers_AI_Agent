@echo off
setlocal

set "ROOT=%~dp0"
set "API_PORT=%~1"
if "%API_PORT%"=="" set "API_PORT=8000"

set "API_HOST=127.0.0.1"

if not exist "%ROOT%api\start-local-api.bat" (
  echo [error] Could not find api\start-local-api.bat
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [error] npm was not found on PATH. Install Node.js and try again.
  pause
  exit /b 1
)

echo [launch] Starting API server window...
start "Checkers API" /D "%ROOT%api" cmd /k "call start-local-api.bat %API_PORT%"

echo [launch] Starting frontend server window...
start "Checkers Web" /D "%ROOT%web" cmd /k "npm.cmd run dev"

echo.
echo ==============================================
echo Checkers local dev servers are launching
echo.
echo Frontend (Vite): http://localhost:5173
echo API (FastAPI):   http://%API_HOST%:%API_PORT%
echo API health:      http://%API_HOST%:%API_PORT%/api/health
echo.
echo Two new terminal windows were opened:
echo - Checkers API
echo - Checkers Web
echo ==============================================
echo.
echo Keep those windows open while developing.
pause
