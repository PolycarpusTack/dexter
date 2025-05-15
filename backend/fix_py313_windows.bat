@echo off
echo Python 3.13 Compatibility Fixer for Windows
echo ==========================================

echo Activating virtual environment...
call venv\Scripts\activate

echo Step 1: Uninstalling existing pydantic-settings...
pip uninstall -y pydantic-settings

echo Step 2: Installing compatible versions...
pip install pydantic==2.3.0 pydantic-settings==1.2.5 fastapi==0.109.2 uvicorn==0.27.1

echo Step 3: Applying direct fix for pydantic-settings...
python fix_pydantic_settings_direct.py

echo Python 3.13 compatibility fix applied.
echo You can now run the backend with: python -m uvicorn app.main:app --reload --port 8000

pause