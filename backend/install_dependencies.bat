@echo off
echo Installing required dependencies for Dexter backend...

call venv\Scripts\activate.bat

echo Installing Redis client...
pip install redis

echo Installing httpx (async HTTP client)...
pip install httpx

echo Installing other required packages...
pip install pydantic-settings fastapi uvicorn python-dotenv

echo Done! Now try running 'uvicorn app.main:app --reload --port 8000'
