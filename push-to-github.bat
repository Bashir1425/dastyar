@echo off
chcp 65001 >nul
title Push Dastyar to GitHub
cd /d "%~dp0"

echo.
echo  === Push Dastyar to GitHub ===
echo  Repo: https://github.com/Bashir1425/dastyar
echo.

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin https://github.com/Bashir1425/dastyar.git
)

echo  If a browser opens, sign in with Bashir1425 and click Authorize.
echo  If you see "Repository not found":
echo    1. Open https://github.com/new
echo    2. Name: dastyar   Visibility: Public or Private
echo    3. UNCHECK "Add a README"
echo    4. Create repository
echo    5. Run this file again
echo.

git push -u origin main
echo.
pause
