@echo off
echo Starting simplified Dexter backend...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Set environment variables
set ENVIRONMENT=development
set REDIS_URL=

REM Start the simplified server
echo Starting simplified server on http://localhost:8002
python -m app.main_simplified

REM If direct execution fails, try uvicorn
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying with uvicorn...
    uvicorn app.main_simplified:app --reload --port 8002
)
