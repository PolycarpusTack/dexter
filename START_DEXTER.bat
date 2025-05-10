@echo off
echo Starting Dexter Development Environment...
echo.

:: Set window titles
title Dexter Developer Console

:: Check if backend is running
echo Checking backend status...
curl -s http://localhost:8001/health >nul 2>&1
if %errorlevel% neq 0 (
    echo Backend is not running. Starting backend...
    start "Dexter Backend" cmd /k "cd backend && call venv\Scripts\activate && python run.py"
    timeout /t 5 >nul
) else (
    echo Backend is already running on port 8001
)

:: Check if frontend is running
echo.
echo Checking frontend status...
curl -s http://localhost:5175 >nul 2>&1
if %errorlevel% neq 0 (
    echo Frontend is not running. Starting frontend...
    start "Dexter Frontend" cmd /k "cd frontend && call start-dev.bat"
) else (
    echo Frontend is already running or will start on a different port
    echo Starting frontend anyway to allow Vite to choose an available port...
    start "Dexter Frontend" cmd /k "cd frontend && npm run dev"
)

echo.
echo Dexter is starting up...
echo.
echo Backend: http://localhost:8001
echo Frontend: http://localhost:5175 (or next available port)
echo API Docs: http://localhost:8001/docs
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul
