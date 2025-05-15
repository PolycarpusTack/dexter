@echo off
echo Installing pydantic_settings package...
call venv-py312\Scripts\activate.bat
pip install pydantic_settings
echo Installation complete!
pause