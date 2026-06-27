@echo off
echo Starting CandSync...
echo.

echo [1/2] Starting Backend on port 5000...
start "CandSync Backend" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 /nobreak > nul

echo [2/2] Starting Frontend on port 5173...
start "CandSync Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo CandSync is starting up!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Default login: admin@candsync.com / Admin@123
pause
