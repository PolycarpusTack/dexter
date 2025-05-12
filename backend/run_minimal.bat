@echo off
echo Starting minimal Dexter backend (no dependencies)...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Set environment variable for the minimal mode
set APP_MODE=minimal

REM Start the minimal server
echo Starting minimal server on http://localhost:8002
uvicorn app.main:app --reload --port 8002
