@echo off
setlocal

set "ROOT=%~dp0"
set "API_DIR=%ROOT%api"
set "WEB_DIR=%ROOT%web"

set "API_HOST=127.0.0.1"
set "API_PORT=%~1"
if "%API_PORT%"=="" set "API_PORT=8000"

set "WEB_PORT=%~2"
if "%WEB_PORT%"=="" set "WEB_PORT=5173"

set "API_ORIGIN=http://%API_HOST%:%API_PORT%"
set "HEALTH_URL=%API_ORIGIN%/api/health"
set "CHECKERS_API_TARGET=%API_ORIGIN%"
set "FRONTEND_URL=http://localhost:%WEB_PORT%"

if not exist "%API_DIR%\start-local-api.bat" (
  echo [error] Could not find api\start-local-api.bat
  pause
  exit /b 1
)

if not exist "%WEB_DIR%\package.json" (
  echo [error] Could not find web\package.json
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [error] npm was not found on PATH. Install Node.js and try again.
    pause
    exit /b 1
  )
)

echo [launch] Starting API server window...
start "Checkers API" /D "%API_DIR%" cmd /k "call start-local-api.bat %API_PORT%"

echo [wait] Waiting for API health: %HEALTH_URL%
set /a "MAX_WAIT_SECONDS=90"
set /a "ELAPSED=0"

:wait_backend
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%HEALTH_URL%' -UseBasicParsing -TimeoutSec 2 > $null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  if %ELAPSED% GEQ %MAX_WAIT_SECONDS% (
    echo [warn] API health check timed out after %MAX_WAIT_SECONDS%s. Starting frontend anyway.
    goto launch_frontend
  )
  set /a "ELAPSED+=1"
  timeout /t 1 /nobreak >nul
  goto wait_backend
)

:launch_frontend
echo [launch] Starting frontend server window...
start "Checkers Web" /D "%WEB_DIR%" cmd /k "set CHECKERS_API_TARGET=%CHECKERS_API_TARGET% && npm.cmd run dev"

timeout /t 2 /nobreak >nul
start "" "%FRONTEND_URL%"

echo.
echo ==============================================
echo Checkers local dev servers are launching
echo.
echo Frontend (Vite): %FRONTEND_URL%
echo API (FastAPI):   %API_ORIGIN%
echo API health:      %HEALTH_URL%
echo Vite proxy env:  CHECKERS_API_TARGET=%CHECKERS_API_TARGET%
echo.
echo Args:
echo 1. API port (default 8000)
echo 2. Web port shown/opened (default 5173)
echo ==============================================
echo.
pause
