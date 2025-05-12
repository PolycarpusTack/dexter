# Build Issues Troubleshooting Guide

## TypeScript Errors
All TypeScript errors have been fixed. The codebase should compile without errors.

## Rollup Native Module Error

If you encounter an error like:
```
Error: Cannot find module @rollup/rollup-win32-x64-msvc. npm has a bug related to optional dependencies...
```

This is a known issue with npm and optional dependencies. Follow these steps to resolve it:

### Solution 1: Clean install (recommended)
```bash
# Delete the node_modules directory and package-lock.json
cd C:/Projects/Dexter
rmdir /S /Q node_modules
del package-lock.json

# Reinstall dependencies
npm install
```

### Solution 2: Install the missing module directly
```bash
# Install the missing native module
npm install @rollup/rollup-win32-x64-msvc
```

### Solution 3: Modify the build script
If the above solutions don't work, you can modify the build script in `package.json`:

1. Change the build script from:
   ```json
   "build": "tsc && vite build"
   ```
   to:
   ```json
   "build": "vite build"
   ```

2. Run the TypeScript checker separately:
   ```bash
   npm run typecheck
   npm run build
   ```

## Long-term Fixes

For a more permanent solution:

1. Add the native module as a direct dependency rather than an optional dependency:
   ```json
   "dependencies": {
     // ...other dependencies
     "@rollup/rollup-win32-x64-msvc": "^4.40.2"
   }
   ```

2. Update your CI/CD scripts to handle this issue by installing the native module as needed.
