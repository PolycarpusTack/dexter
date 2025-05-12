@echo off
echo Setting up dependencies for the new Dexter architecture...
echo.

echo Installing core dependencies...
pip install fastapi uvicorn pydantic pyyaml python-dotenv sentry-sdk httpx

echo.
echo Installation complete!
echo.
echo You can now test the migration with:
echo   python test_quick.py
echo.
