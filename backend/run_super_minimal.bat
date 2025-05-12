@echo off
echo Starting super minimal Dexter backend (almost no dependencies)...

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start the minimal server
echo Starting minimal server on http://localhost:8005
python -m app.minimal

REM If that fails, try running directly with uvicorn
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Trying alternative method...
    uvicorn app.minimal:app --reload --port 8005
)
