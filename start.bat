@echo off
echo Starting Event Analytics Demo...

start "Event Analytics Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --port 8001"
timeout /t 2 /nobreak >nul
start "Event Analytics Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --port 5174"

echo.
echo Backend  : http://localhost:8001
echo Frontend : http://localhost:5174
echo API docs : http://localhost:8001/docs
echo.
echo (Ports differents de l'app Baccha pour eviter les conflits)
echo.
