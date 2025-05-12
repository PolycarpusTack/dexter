@echo off
echo Starting Dexter backend development server...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Set environment variables
set APP_MODE=debug

REM Start the server
echo Starting server on http://localhost:8000
uvicorn app.main:app --reload --port 8000

REM If server fails to start, provide some debugging information
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Server failed to start. Here are some debugging tips:
    echo 1. Make sure all dependencies are installed: run setup_dev_env.bat
    echo 2. Check for import errors in the console output
    echo 3. Try running with different modes: set APP_MODE=minimal and start again
    echo 4. If Redis is causing issues, make sure Redis server is installed and running
)
