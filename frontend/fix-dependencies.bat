@echo off
echo Fixing Rollup native module issue...
cd ..
npm install @rollup/rollup-win32-x64-msvc --no-save
echo Done. Now try running 'npm run build' in the frontend directory.
