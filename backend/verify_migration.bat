@echo off
echo Verifying the migration to the new architecture...
echo.

echo Step 1: Testing the default mode...
python -m app.main

echo.
echo Step 2: Testing the debug mode...
set APP_MODE=debug
python -m app.main

echo.
echo Step 3: Testing minimal mode...
set APP_MODE=minimal
python -m app.main

echo.
echo Step 4: Testing enhanced mode...
set APP_MODE=enhanced
python -m app.main

echo.
echo Step 5: Testing simplified mode...
set APP_MODE=simplified
python -m app.main

echo.
echo ALL TESTS COMPLETED - If no errors were shown, the migration was successful!
echo.
echo For more detailed testing, run: python test_new_architecture.py
