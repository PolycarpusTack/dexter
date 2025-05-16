@echo off
echo Cleaning build artifacts...

rd /s /q dist 2>nul
rd /s /q node_modules\.vite 2>nul

npm cache clean --force

echo Clean complete. Ready for fresh build.
echo Run 'npm run build' to build the project.