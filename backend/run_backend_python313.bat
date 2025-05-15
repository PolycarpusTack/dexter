@echo off
echo Starting Dexter backend server with Python 3.13 compatibility fixes...

echo Activating virtual environment...
call .\venv\Scripts\activate

echo Applying Python 3.13 compatibility fixes...
python fix_pydantic_compatibility.py
python fix_fastapi_py313.py
python fix_pydantic_settings.py

echo Checking dependencies...
pip show pydantic-settings >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo pydantic-settings not found. Installing...
    pip install pydantic-settings==1.2.5
)

echo Starting backend server...
uvicorn app.main:app --reload --port 8000

echo Done!