@echo off
setlocal

set "HOST=127.0.0.1"
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"
set "CHECKERS_ENGINE_TEMPLATE_MODE=1"

pushd "%~dp0" || (
  echo Failed to enter script directory.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo [setup] Creating virtual environment...
  py -m venv .venv
  if errorlevel 1 goto :error
)

echo [setup] Installing dependencies...
".venv\Scripts\python.exe" -m pip install -e .
if errorlevel 1 goto :error

if not exist "..\engine\pyproject.toml" (
  echo [error] Missing engine package at ..\engine. API requires external engine module.
  goto :error
)

echo [setup] Installing local engine package...
".venv\Scripts\python.exe" -m pip install -e ..\engine
if errorlevel 1 goto :error

echo [run] Starting API at http://%HOST%:%PORT%
echo [run] Test API at http://%HOST%:%PORT%/api/health
echo [run] Engine template mode: %CHECKERS_ENGINE_TEMPLATE_MODE%
echo [run] Close this window to stop the API server.
".venv\Scripts\python.exe" -m uvicorn api.main:app --reload --host %HOST% --port %PORT%
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo API exited with code %EXIT_CODE%.
  pause
)

popd
exit /b %EXIT_CODE%

:error
echo.
echo Setup failed with code %ERRORLEVEL%.
pause
popd
exit /b %ERRORLEVEL%
