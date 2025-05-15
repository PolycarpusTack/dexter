@echo off
echo ===================================
echo Dexter Backend - Dependency Fixer
echo ===================================
echo.

REM Check if venv-py312 exists, if not create it
if not exist "venv-py312\Scripts\activate.bat" (
    echo Creating Python virtual environment (venv-py312)...
    python -m venv venv-py312
)

REM Activate virtual environment
echo Activating virtual environment...
call venv-py312\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip

REM Uninstall potentially incompatible packages
echo Uninstalling potentially incompatible packages to prevent conflicts...
pip uninstall -y pydantic pydantic-settings fastapi uvicorn starlette

REM Install packages with compatible versions
echo Installing core packages with compatible versions...
pip install fastapi==0.109.2
pip install uvicorn[standard]==0.27.1
pip install starlette==0.31.1
pip install pydantic==2.3.0
pip install pydantic-settings==2.0.3

echo Installing additional dependencies...
pip install httpx==0.27.0
pip install cachetools==5.3.3
pip install redis==5.0.1

REM Install dev dependencies
echo Installing development dependencies...
pip install pytest==7.4.0
pip install pytest-asyncio==0.21.0
pip install black==23.9.1
pip install isort==5.12.0
pip install flake8==6.0.0
pip install mypy==1.5.1

REM Run pydantic compatibility fix script
echo.
echo Running Pydantic compatibility fixes...
python fix_pydantic_compatibility.py

echo.
echo ===================================
echo Installation complete!
echo ===================================
echo.
echo To start the development server, run:
echo   cd backend
echo   call venv-py312\Scripts\activate.bat
echo   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo Or use one of the batch files:
echo   run_minimal.bat
echo   run_simplified.bat
echo.
pause