@echo off
echo Installing missing dependencies...

echo Activating virtual environment...
call .\venv\Scripts\activate

echo Installing pydantic-settings...
pip install pydantic-settings

echo Done! The backend should now run properly.