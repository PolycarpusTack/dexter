@echo off
echo Starting Dexter backend with Python 3.13 compatibility...
echo =======================================================

echo Activating virtual environment...
call venv\Scripts\activate

echo Verifying Python 3.13 compatibility fixes...
python fix_pydantic_settings_direct.py

echo Starting backend server...
python -m uvicorn app.main:app --reload --port 8000

pause