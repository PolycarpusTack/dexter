@echo off
echo Starting simplified Dexter backend...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Set environment variables
set ENVIRONMENT=development
set REDIS_URL=
set APP_MODE=simplified

REM Start the simplified server
echo Starting simplified server on http://localhost:8002
python -m app.main

REM If direct execution fails, try uvicorn
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying with uvicorn...
    uvicorn app.main:app --reload --port 8002
)
