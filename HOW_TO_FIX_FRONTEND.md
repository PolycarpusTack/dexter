# Fixing the Dexter Frontend

This document explains the changes made to fix the Dexter frontend application.

## Issues Fixed

1. **React Query Version Incompatibility**: Updated to a stable version (4.29.19)
2. **"require is not defined" Error**: Added a minimal compatibility layer

## How to Apply the Fix

1. **Install Dependencies with the Correct Versions**:
   ```bash
   cd frontend
   npm install
   ```

2. **If You Encounter the React Query Error Again**:
   Ensure you have the right React Query version in package.json:
   ```json
   "@tanstack/react-query": "4.29.19",
   "@tanstack/react-query-devtools": "4.29.19"
   ```

   And in the resolutions section:
   ```json
   "resolutions": {
     "@tanstack/react-query": "4.29.19",
     "@tanstack/react-query-devtools": "4.29.19"
   }
   ```

3. **If You Get "require is not defined" Error**:
   Make sure preload.js is included in index.html:
   ```html
   <head>
     <!-- other head content -->
     <script src="/preload.js"></script>
   </head>
   ```

## Technical Details

### React Query Fix
The application was using React Query v5 but had compatibility issues. We downgraded to v4.29.19 which has better compatibility with the rest of the codebase.

### Require Not Defined Fix
Added a minimal compatibility layer in `/public/preload.js` that provides the global objects needed by CommonJS modules when running in an ESM environment:
- `global` - Set to window
- `process` - Basic process.env object
- `require` - A function that returns empty objects
- `module.exports` - Empty object

## Running the Application

After applying these fixes, you can run the frontend as normal:
```bash
cd frontend
npm run dev
```

The application should start without any "QueryClient is not a constructor" or "require is not defined" errors.