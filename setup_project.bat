@echo off
echo Dexter Project Setup Script
echo =========================
echo.
echo This script will set up both the backend and frontend components.
echo It will create a clean environment and install all dependencies.
echo.
echo Press Ctrl+C to cancel or any key to continue...
pause > nul

REM Clean up existing virtual environments
echo.
echo Cleaning up existing virtual environments...
if exist backend\venv (
    rmdir /s /q backend\venv
    echo - Removed backend\venv
)
if exist backend\venv-py312 (
    rmdir /s /q backend\venv-py312
    echo - Removed backend\venv-py312
)

REM Setup backend
echo.
echo Setting up backend with Python 3.12...
cd backend
python -m venv venv
echo - Created virtual environment
call venv\Scripts\activate
echo - Activated virtual environment
pip install -r requirements.txt
echo - Installed Python dependencies
cd ..

REM Setup frontend
echo.
echo Setting up frontend...
cd frontend
echo - Installing npm dependencies (this may take a while)...
npm install

REM Fix ESM/CommonJS compatibility issues
echo - Installing specific dependency versions to fix ESM issues...
npm install @tanstack/react-query@4.36.1 @tanstack/react-query-devtools@4.36.1 --save

echo - Creating optimized package.json overrides...
echo {
echo   "type": "module",
echo   "dependencies": {
echo     "@tanstack/react-query": "^4.36.1",
echo     "@tanstack/react-query-devtools": "^4.36.1"
echo   }
echo } > fix-package.json

echo - Patching node_modules to ensure ESM compatibility...
copy /Y fix-package.json node_modules\@tanstack\react-query\package.json
copy /Y fix-package.json node_modules\@tanstack\react-query-devtools\package.json
cd ..

echo.
echo ===============================================
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
echo For convenience, you can use:
echo   - backend\start_backend.bat to start the backend
echo   - frontend\start-dev.bat to start the frontend
echo ===============================================
echo.
pause