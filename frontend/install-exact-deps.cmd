@echo off
echo Installing exact versions of critical dependencies...

rem Install React 18
npm install react@18.2.0 react-dom@18.2.0 --save-exact

rem Install React Query 4
npm install @tanstack/react-query@4.29.19 @tanstack/react-query-devtools@4.29.19 --save-exact

echo Installation complete. Now start the dev server with:
echo npm run dev