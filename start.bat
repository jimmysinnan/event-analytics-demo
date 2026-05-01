@echo off
echo.
echo  ==========================================
echo   EVENT Analytics Demo — Demarrage
echo  ==========================================
echo.

start "EA Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8001"
timeout /t 3 /nobreak >nul
start "EA Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5174"

echo  Attente du demarrage (10s)...
timeout /t 10 /nobreak >nul

echo.
echo  Backend  : http://localhost:8001
echo  Frontend : http://localhost:5174
echo.

start "" "http://localhost:5174"
echo  Navigateur ouvert sur http://localhost:5174
echo.
