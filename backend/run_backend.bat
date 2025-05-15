@echo off
echo Starting Dexter backend server...

echo Activating virtual environment...
call .\venv\Scripts\activate

echo Checking dependencies...
pip show pydantic-settings >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo pydantic-settings not found. Installing...
    pip install pydantic-settings
)

echo Starting backend server...
uvicorn app.main:app --reload --port 8000

echo Done!