@echo off
echo Fixing icon dependencies...
echo.
echo Checking for lucide-react...
npm list lucide-react >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo lucide-react not found. Installing...
    npm install lucide-react --save
) else (
    echo lucide-react is already installed.
)
echo.
echo Icons fixed. You can now run npm run build