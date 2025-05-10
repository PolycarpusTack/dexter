@echo off
echo Finding process using port 5175...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5175') do (
    echo Killing process %%a
    taskkill /PID %%a /F
)
echo Done!
