@echo off
echo Fixing Mantine component issue...

echo Step 1: Removing the original component
del src\components\UI\RenderingProgressIndicator.tsx

echo Step 2: Copying the fixed version
copy src\components\UI\RenderingProgressIndicator.mantine-fixed.tsx src\components\UI\RenderingProgressIndicator.tsx

echo Step 3: Cleaning the build cache
rmdir /s /q .vite
rmdir /s /q dist

echo Done! Try building the application again with:
echo npm run build