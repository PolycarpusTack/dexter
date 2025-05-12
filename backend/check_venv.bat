@echo off
echo Checking virtual environment...

call venv\Scripts\activate.bat

echo Installed packages:
pip list

echo.
echo Checking for redis package specifically:
pip show redis

echo.
echo Installing from requirements.txt:
pip install -r requirements.txt

echo.
echo Done! Now try running 'uvicorn app.main:app --reload --port 8000'
