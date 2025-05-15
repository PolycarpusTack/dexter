@echo off
echo Dexter - Clean Setup Script
echo ========================
echo.

echo Step 1: Removing existing virtual environments...
if exist backend\venv (
    rmdir /s /q backend\venv
    echo - Removed backend\venv
)
if exist backend\venv-py312 (
    rmdir /s /q backend\venv-py312
    echo - Removed backend\venv-py312
)
echo.

echo Step 2: Setting up backend environment with Python 3.12...
cd backend
python -m venv venv
echo - Created new virtual environment
call venv\Scripts\activate
echo - Activated virtual environment
pip install -r requirements.txt
echo - Installed dependencies
cd ..
echo.

echo Step 3: Setting up frontend...
cd frontend
npm install
echo - Installed npm dependencies
cd ..
echo.

echo Setup complete!
echo.
echo To start the backend:
echo   cd backend
echo   venv\Scripts\activate
echo   uvicorn app.main:app --reload --port 8000
echo.
echo To start the frontend:
echo   cd frontend
echo   npm run dev
echo.
pause