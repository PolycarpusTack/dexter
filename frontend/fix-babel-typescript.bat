@echo off
echo Installing required Babel packages for TypeScript and React...
cd ..
npm install --save-dev @babel/preset-env @babel/preset-react @babel/preset-typescript @babel/plugin-transform-react-jsx
echo Done. Now try running 'npm run build' in the frontend directory.
