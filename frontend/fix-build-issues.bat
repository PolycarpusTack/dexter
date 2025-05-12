@echo off
echo Fixing build issues for Dexter frontend...

echo Step 1: Installing required Babel dependencies...
cd ..
npm install --save-dev @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript @babel/plugin-transform-react-jsx @babel/plugin-transform-typescript @babel/plugin-proposal-class-properties @babel/plugin-proposal-object-rest-spread

echo Step 2: Installing Rollup native module...
npm install --save-dev @rollup/rollup-win32-x64-msvc@4.40.2

echo Step 3: Checking for Vite/React plugin...
npm install --save-dev @vitejs/plugin-react@4.4.1

echo Step 4: Verifying TypeScript version...
npm install --save-dev typescript@5.4.3

echo Step 5: Cleaning build artifacts...
cd frontend
rmdir /S /Q dist
rmdir /S /Q node_modules\.vite

echo Step 6: Clearing cache and running build...
npm cache clean --force
npm run build

echo Done! If you still encounter issues, please refer to the troubleshooting guide.
