@echo off
setlocal
title Dastyar

rem Find Python/npm even when they are only in the AutoClaw vendor folder.

set "ROOT=%~dp0"
set "VENDOR_PY=C:\Users\pubgm\AppData\Local\Programs\AutoClaw2\resources\vendor\python\python.exe"
set "VENDOR_NODE=C:\Users\pubgm\AppData\Local\Programs\AutoClaw2\resources\vendor\node"

rem --- python ---
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY if exist "%VENDOR_PY%" set "PY=%VENDOR_PY%"
if not defined PY if exist "C:\Python313\python.exe" set "PY=C:\Python313\python.exe"
if not defined PY (
  echo [ERROR] Python not found. Install Python 3.11+ from python.org
  pause
  exit /b 1
)

rem --- node: always prefer vendor node so npm.cmd can find node.exe ---
if exist "%VENDOR_NODE%\npm.cmd" (
  set "PATH=%VENDOR_NODE%;%PATH%"
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js 20+ from nodejs.org
  pause
  exit /b 1
)

echo [ok] python = %PY%
echo [ok] npm    = ok

if not exist "%ROOT%backend\.env" (
  copy "%ROOT%backend\.env.example" "%ROOT%backend\.env" >nul
  echo [ok] backend\.env created.
)

"%PY%" -c "import fastapi" >nul 2>nul
if errorlevel 1 (
  echo [1/2] Installing backend packages...
  "%PY%" -m pip install -r "%ROOT%backend\requirements.txt"
) else (
  echo [1/2] Backend packages already installed.
)

if not exist "%ROOT%frontend\node_modules" (
  echo [2/2] Installing frontend packages... first run may take a few minutes.
  pushd "%ROOT%frontend"
  call npm install --no-audit --no-fund
  popd
) else (
  echo [2/2] Frontend packages already installed.
)

start "Dastyar API" /D "%ROOT%backend" cmd /k ""%PY%" -m uvicorn main:app --reload --port 8000"
start "Dastyar UI"  /D "%ROOT%frontend" cmd /k npm run dev

timeout /t 6 >nul
start "" http://localhost:5173

echo.
echo   API:  http://localhost:8000/docs
echo   UI:   http://localhost:5173
echo.
echo   Keep the two opened windows running.
pause
