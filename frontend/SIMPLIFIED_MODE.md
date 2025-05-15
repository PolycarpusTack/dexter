# Dexter: Simplified Mode

## Overview
You are viewing Dexter in simplified mode. This mode was activated to bypass dependency issues with React Query and other complex libraries.

## Why Simplified Mode?
The full Dexter application uses several modern React libraries that can sometimes cause compatibility issues:
- React Query for data fetching
- Mantine UI for components
- Various ESM/CommonJS compatibility challenges

Simplified mode removes these dependencies to provide a basic functioning version of the UI.

## What's Available in Simplified Mode
- Basic navigation and routing
- Simple placeholders for main pages
- Core styling and layout

## How to Re-enable Full Features
To restore the full functionality, we need to:

1. Fix the React Query dependency issues:
```bash
cd frontend
npm install @tanstack/react-query@4.29.19 @tanstack/react-query-devtools@4.29.19 --save-exact
```

2. Rollback to the standard entry point by editing `index.html`:
```html
<!-- Change this line -->
<script type="module" src="/src/main-simple.tsx"></script>
<!-- To this -->
<script type="module" src="/src/main.tsx"></script>
```

## For Additional Help
Please consult the Dexter documentation or seek help from the development team.

**Note**: This simplified mode is intended as a temporary solution while we resolve the dependency issues in the full application.