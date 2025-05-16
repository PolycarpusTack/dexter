@echo off
echo Fixing Mantine dependencies...

echo.
echo Step 1: Removing node_modules folder...
rmdir /s /q node_modules

echo.
echo Step 2: Cleaning the Vite cache...
rmdir /s /q .vite

echo.
echo Step 3: Reinstalling dependencies...
npm install

echo.
echo Step 4: Rebuilding the app...
npm run build

echo.
echo Done! If there are still errors, try running the application with:
echo npm run dev