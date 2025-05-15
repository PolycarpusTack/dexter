@echo off
echo ===================================
echo Dexter Backend - Run with Fixed Dependencies
echo ===================================
echo.

REM Check if the dependencies are installed
if not exist "venv-py312\Scripts\activate.bat" (
    echo Virtual environment not found. Running fix_dependencies.bat first...
    call fix_dependencies.bat
) else (
    echo Activating virtual environment...
    call venv-py312\Scripts\activate.bat
)

REM Set environment variables
set APP_MODE=minimal

REM Run the backend server
echo Starting the backend server in minimal mode...
echo.
echo You can change the mode by setting APP_MODE to one of the following:
echo   - minimal (current)
echo   - debug
echo   - enhanced
echo   - simplified
echo.
echo Press Ctrl+C to stop the server
echo.
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

pause