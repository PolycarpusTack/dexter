@echo off
echo Starting Dexter backend without Redis...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Set environment variable to indicate no Redis
set REDIS_URL=

REM Start the server
echo Starting server on http://localhost:8001
uvicorn app.main:app --reload --port 8001

echo.
echo If the server failed to start, check the error messages and try:
echo 1. Run setup_dev_env.bat to install all dependencies
echo 2. Try running with redis-stub.py: python redis-stub.py
