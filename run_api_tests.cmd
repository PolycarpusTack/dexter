@echo off
echo Running Dexter API Integration Tests...
echo ==================================

cd %~dp0
python tests\integration\api\run_integration_tests.py

if %errorlevel% equ 0 (
    echo.
    echo Tests completed successfully!
) else (
    echo.
    echo Tests failed with errors!
)

echo.
echo See detailed results in tests\integration\api\integration_test_report.txt
echo ==================================
pause
