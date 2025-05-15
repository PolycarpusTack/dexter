@echo off
echo Fixing frontend ESM/CommonJS compatibility issues...
echo =================================================

cd frontend

echo Installing dependencies...
npm install

echo Installing specific dependency versions to fix ESM issues...
npm install @tanstack/react-query@4.36.1 @tanstack/react-query-devtools@4.36.1

echo Creating optimized package.json override...
echo {
echo   "type": "module",
echo   "dependencies": {
echo     "@tanstack/react-query": "^4.36.1",
echo     "@tanstack/react-query-devtools": "^4.36.1"
echo   }
echo } > fix-package.json

echo Patching node_modules to ensure ESM compatibility...
copy /Y fix-package.json node_modules\@tanstack\react-query\package.json
copy /Y fix-package.json node_modules\@tanstack\react-query-devtools\package.json

echo Starting development server...
npm run dev

echo.
echo If you encounter any issues:
echo 1. Delete the node_modules folder
echo 2. Run "npm install" to reinstall dependencies
echo 3. Run this script again
echo.