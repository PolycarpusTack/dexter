@echo off
echo Starting Dexter Frontend Development Server...
echo.

:: Check if port 5175 is in use
netstat -ano | findstr :5175 >nul
if %errorlevel% == 0 (
    echo Port 5175 is already in use. Trying to free it...
    call killport.bat
    timeout /t 2 >nul
)

:: Start the development server
echo Starting Vite dev server...
npm run dev
