@echo off
echo Checking backend health...

echo.
echo 1. Health Check:
curl -s http://localhost:8000/health

echo.
echo.
echo 2. Config Endpoint:
curl -s http://localhost:8000/api/v1/config/config -H "Origin: http://localhost:5175"

echo.
echo.
echo 3. AI Models Endpoint:
curl -s http://localhost:8000/api/v1/ai/models -H "Origin: http://localhost:5175"

echo.
echo.
echo 4. Config Status Endpoint:
curl -s http://localhost:8000/api/v1/config/status -H "Origin: http://localhost:5175"

echo.
pause