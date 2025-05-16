# Mantine v7 Fix Instructions

## Issue

The application is encountering an error with Mantine imports: 

```
Uncaught SyntaxError: The requested module 'http://localhost:5175/node_modules/.vite/deps/@mantine_styles.js?v=4632ef4c' doesn't provide an export named: 'useTheme'
```

This is happening because Mantine v7 moved `useTheme` from `@mantine/styles` to `@mantine/core` and renamed it to `useMantineTheme`.

## Applied Fixes

1. **Updated Imports in RenderingProgressIndicator.tsx**:
   ```typescript
   // Changed from:
   import { useTheme } from '@mantine/styles';
   // To:
   import { useMantineTheme } from '@mantine/core';
   ```

2. **Updated Theme API Usage**:
   ```typescript
   // Changed from:
   theme.colorScheme === 'dark'
   // To:
   theme.dark
   ```

3. **Added Vite Alias Resolution** (in vite.config.ts):
   ```typescript
   resolve: {
     alias: {
       // Fix for mantine styles import
       '@mantine/styles': '@mantine/core'
     }
   }
   ```

4. **Created Type Declaration Fix** (in src/vite-fix.d.ts):
   ```typescript
   // Add module declaration to avoid import errors with @mantine/styles
   declare module '@mantine/styles' {
     // Export anything that might be imported from @mantine/styles
     export const createStyles: any;
     export const Global: any;
     export const keyframes: any;
     export const MantineProvider: any;
     export const ColorSchemeProvider: any;
     export const useColorScheme: any;
   }
   ```

## Try These Solutions

If the build is still failing, here are some additional remediation steps:

1. **Run the fix-mantine-deps.bat script**:
   This will:
   - Clean node_modules
   - Clear the Vite cache
   - Reinstall dependencies
   - Rebuild the app

2. **Run the fix-mantine-component.bat script**:
   This will:
   - Replace the problematic component with a fixed version
   - Clean the build cache

3. **Manual Mantine Upgrade**: 
   If the above solutions don't work, you might need to ensure consistent Mantine versions:
   ```bash
   cd frontend
   npm install @mantine/core@7.10.1 @mantine/hooks@7.10.1 @mantine/notifications@7.10.1 @mantine/dates@7.10.1 @mantine/charts@7.10.1
   ```

## Explanation

Mantine v7 introduced breaking changes to the theme API:

1. `useTheme` hook was renamed to `useMantineTheme`
2. `colorScheme` property was replaced with a boolean `dark` property 
3. The `@mantine/styles` package functionality was mostly moved to `@mantine/core`

These changes affect components that use the theme API, like RenderingProgressIndicator.

## Troubleshooting

If you're still seeing issues after applying these fixes:

1. Try completely removing the node_modules folder and reinstalling:
   ```bash
   rm -rf node_modules
   npm install --force
   ```

2. Clear your browser cache completely
3. Try running in a different browser
4. Use Vite's force-clear cache flag:
   ```bash
   npm run dev -- --force
   ```