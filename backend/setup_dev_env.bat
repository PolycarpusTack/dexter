@echo off
echo Setting up development environment for Dexter backend...

REM Check if virtual environment exists, if not create it
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists.
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Update pip to the latest version
echo Updating pip...
python -m pip install --upgrade pip

REM Install dependencies from multiple sources to make sure everything is covered
echo Installing dependencies from requirements.txt...
pip install -r requirements.txt

echo Installing Redis specifically...
pip install redis[hiredis]

echo Installing additional packages that might be needed...
pip install pydantic-settings fastapi uvicorn python-dotenv httpx cachetools

REM Check if Poetry is installed and use it if available
where poetry >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo Poetry found, installing dependencies using Poetry...
    poetry install
) else (
    echo Poetry not found, skipping Poetry installation.
)

echo Installation complete!
echo Now you can run 'uvicorn app.main:app --reload --port 8000' to start the server.

REM Optional: List installed packages
echo.
echo Installed packages:
pip list

