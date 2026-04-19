@echo off
setlocal

set "ROOT=%~dp0"
set "CLI_DIR=%ROOT%checkers_cli"
set "VENV_PYTHON=%CLI_DIR%\.venv\Scripts\python.exe"

if not exist "%CLI_DIR%\cli_game.py" (
  echo [error] Could not find checkers_cli\cli_game.py
  pause
  exit /b 1
)

if not exist "%CLI_DIR%\requirements.txt" (
  echo [error] Could not find checkers_cli\requirements.txt
  pause
  exit /b 1
)

where py >nul 2>nul
if errorlevel 1 (
  where python >nul 2>nul
  if errorlevel 1 (
    echo [error] Python was not found on PATH. Install Python and try again.
    pause
    exit /b 1
  )
  set "PYTHON_BOOTSTRAP=python"
) else (
  set "PYTHON_BOOTSTRAP=py"
)

pushd "%CLI_DIR%" || (
  echo [error] Failed to enter checkers_cli directory.
  pause
  exit /b 1
)

if not exist "%VENV_PYTHON%" (
  echo [setup] Creating CLI virtual environment...
  %PYTHON_BOOTSTRAP% -m venv .venv
  if errorlevel 1 goto :error
)

echo [setup] Installing CLI requirements...
"%VENV_PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 goto :error

echo.
echo ==============================================
echo Checkers CLI is starting
echo.
echo Commands:
echo   moves   board   map   reset   help   quit
echo   play N
echo ==============================================
echo.

"%VENV_PYTHON%" cli_game.py
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo CLI exited with code %EXIT_CODE%.
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
