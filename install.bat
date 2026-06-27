@echo off
echo Installing CandSync dependencies...
echo.

echo [1/2] Installing backend dependencies...
cd /d %~dp0backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Backend install failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Installing frontend dependencies...
cd /d %~dp0frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Frontend install failed!
    pause
    exit /b 1
)

echo.
echo Installation complete!
echo Run start.bat to launch CandSync
pause
