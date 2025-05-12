@echo off
echo Dexter Backend Starter Script
echo ============================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

echo Step 1: Checking installed packages and dependencies...
python -m pip install colorama
python check_dependencies.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Dependency check reported issues.
    echo You may want to install missing dependencies before continuing.
    echo.
    pause
)

echo Step 2: Running Pydantic compatibility check...
python check_pydantic_compatibility.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo WARNING: Pydantic compatibility check failed, but we'll continue anyway.
    echo You can run fix_pydantic_compatibility.py to automatically fix issues.
    echo.
)

echo Step 3: Trying to start with minimal app first...
echo This will test if the basic FastAPI setup is working
echo.
echo Starting on http://localhost:8005
echo Press Ctrl+C to stop and try the next method if this fails
echo.
python -m app.minimal

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Minimal app failed to start. Trying another method...
    echo.
    
    echo Step 4: Trying to start with Redis stub...
    echo This will use a fake Redis implementation
    echo.
    echo Starting on http://localhost:8001
    echo Press Ctrl+C to stop and try the next method if this fails
    echo.
    python redis-stub.py
    
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo Redis stub failed to start. Trying full app with dependency protection...
        echo.
        
        echo Step 5: Trying to start full app with REDIS_URL empty...
        echo This will force in-memory cache only
        echo.
        echo Starting on http://localhost:8000
        echo.
        set REDIS_URL=
        uvicorn app.main:app --reload --port 8000
    )
)

echo.
echo If all methods failed, try these troubleshooting steps:
echo 1. Run 'python fix_pydantic_compatibility.py' to fix Pydantic v2 issues
echo 2. Run 'setup_dev_env.bat' to install all dependencies
echo 3. Make sure you have the correct Python version (3.10+)
echo 4. Check for any error messages in the console
echo 5. Try running 'python -m pip install --upgrade pip fastapi uvicorn redis httpx pydantic'
echo.
