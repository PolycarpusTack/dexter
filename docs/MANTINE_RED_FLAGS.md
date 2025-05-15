# 🚩 Mantine Red Flags: Common Issues & Solutions

This document outlines critical issues encountered when working with Mantine UI and their solutions, based on real problems we resolved in our project.

## 🚩 Red Flag #1: CSS Variables Resolver Crashes
**Error message:** `TypeError: value.forEach is not a function`

**Root issue:** Mantine's `defaultCssVariablesResolver` loops through every color in your theme and calls `value.forEach` on it. This requires every color to be an array with 10 shades.

**Common mistakes:**
- Using string colors: `primary: '#3B82F6'`
- Using object colors: `primary: { light: '#D1FAE5', dark: '#047857' }`
- Arrays with fewer than 10 shades: `primary: ['#E7F5FF', '#D0EBFF', '#A5D8FF']`
- Custom semantic colors as strings: `background: colors.neutral[50]`

**Solution:**
```typescript
colors: {
  // Correct: Array with exactly 10 shades
  blue: [
    colors.primary[50], colors.primary[100], colors.primary[200], 
    colors.primary[300], colors.primary[400], colors.primary[500],
    colors.primary[600], colors.primary[700], colors.primary[800], 
    colors.primary[900],
  ],
  
  // Correct: Convert semantic colors to 10-item arrays
  background: [
    colors.neutral[50], colors.neutral[50], colors.neutral[50], 
    colors.neutral[50], colors.neutral[50], colors.neutral[50],
    colors.neutral[50], colors.neutral[50], colors.neutral[50], 
    colors.neutral[50],
  ],
}
```

## 🚩 Red Flag #2: Invalid CSS Selector Syntax
**Error message:** `Warning: Unsupported style property &[data-active="true"]. Did you mean &[dataActive="true"]?`

**Root issue:** Mantine components use camelCase format for data attributes in their style objects, not hyphenated format.

**Common mistakes:**
- Using hyphenated format in theme component styles: `'&[data-active="true"]'`
- Mixing selector formats between theme and CSS

**Solution:**
```typescript
// IN THEME COMPONENT STYLES:
// Use camelCase format
Tabs: {
  styles: (theme) => ({
    tab: {
      '&[dataActive="true"]': {  // ✅ Correct
        borderBottomColor: theme.colors.blue[6],
      },
    },
  }),
},

// IN GLOBAL CSS:
// Use hyphenated format
.mantine-NavLink-root[data-active="true"] {  // ✅ Correct
  background-color: var(--primary-light);
}
```

## 🚩 Red Flag #3: Incomplete CSS Variables Configuration
**Error message:** Various styling issues and inconsistencies

**Root issue:** Missing or incorrect cssVariables configuration in the Mantine theme.

**Common mistakes:**
- Missing cssVariables object
- Empty include array
- Missing defaultColorScheme

**Solution:**
```typescript
// Complete cssVariables configuration
cssVariables: {
  include: ['color', 'fontFamily', 'fontSize', 'radius', 'spacing'],
  variables: {
    // Specific variable mappings improve consistency
    '--mantine-color-primary': colors.primary[500],
    '--mantine-color-text': colors.neutral[800],
    // More variables...
  },
  darkVariables: {}, // Can be empty if not using dark mode
  defaultColorScheme: 'light',
},
```

## 🚩 Red Flag #4: Incorrect MantineProvider Setup
**Error message:** Theme not applying correctly, CSS variables missing

**Root issue:** Missing critical props on the MantineProvider component.

**Common mistakes:**
- Missing `withCssVariables` prop
- Missing `defaultColorScheme` prop
- Duplicate CSS imports causing conflicts

**Solution:**
```jsx
// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import App from './App';
import dexterTheme from './theme/theme';
// Import styles once, in the right file
import './styles.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MantineProvider 
      theme={dexterTheme} 
      withCssVariables  // ✅ Critical prop
      defaultColorScheme="light"  // ✅ Critical prop
    >
      <App />
    </MantineProvider>
  </React.StrictMode>
);
```

## 🚩 Red Flag #5: Duplicate Style Definitions
**Error message:** CSS specificity conflicts, inconsistent styling

**Root issue:** Same styles defined in both theme.ts and global CSS files.

**Common mistakes:**
- Defining component styles in both the theme and CSS files
- Importing the same CSS multiple times
- Overriding theme styles with global CSS unintentionally

**Solution:**
- Choose one location for each style (either theme or CSS)
- For component-specific styles, prefer theme.components
- For global styles, use theme.globalStyles or a separate CSS file
- Audit and remove duplicate definitions

```typescript
// In theme.ts for component-specific styles
components: {
  NavLink: {
    styles: { /* Component styles here */ }
  }
}

// In styles.css - comment out duplicates
/* Note: NavLink styles are managed in theme.ts */
```

## 🚩 Red Flag #6: Improper CSS Import Order
**Error message:** Style inconsistencies, overrides not working

**Root issue:** CSS files imported in the wrong order or multiple times.

**Common mistakes:**
- Importing Mantine CSS in multiple files
- Custom styles imported before Mantine styles
- Not using @import in the right order in CSS files

**Solution:**
```css
/* styles.css - Correct order */
@import '@mantine/core/styles.css';
@import '@mantine/notifications/styles.css';
/* Other Mantine component CSS */

/* Then custom styles and overrides */
@import './vendor-fixes.css';
/* Your custom styles */
```

Then in your main.tsx:
```tsx
// Just import your main CSS file once
import './styles.css';
```

## 🚩 Red Flag #7: Component Prop Name Changes

**Error message:** `Warning: Unknown event handler property 'onTabChange'. It will be ignored.`

**Root issue:** Mantine v6 changed many component prop names from v5.

**Common mistakes:**
- Using old prop names with the new Mantine version
- Mixing prop naming conventions between different components
- Not updating all usage locations when upgrading

**Solution:**
```jsx
// WRONG (old Mantine v5 props)
<Tabs value={activeTab} onTabChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Tab value="tab1" icon={<IconApi size={14} />}>
      API Settings
    </Tabs.Tab>
  </Tabs.List>
</Tabs>

// CORRECT (new Mantine v6 props)
<Tabs value={activeTab} onChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Tab value="tab1" leftSection={<IconApi size={14} />}>
      API Settings
    </Tabs.Tab>
  </Tabs.List>
</Tabs>
```

Common prop name changes to watch for:
- `onTabChange` → `onChange`
- `icon` → `leftSection`
- `rightIcon` → `rightSection`
- `size="sm"` → `size="compact"`
- `noWrap` → `truncate`
- `withFullWidth` → `fullWidth`

## 🚩 Red Flag #8: API Error Notifications for Expected 404s

**Error message:** Console flooding with 404 errors for non-critical API endpoints

**Root issue:** API endpoints that may not exist in development environments causing error notification floods

**Common mistakes:**
- Not adding error suppression for optional API endpoints
- Using the same error handling for critical and non-critical endpoints
- Not providing fallbacks for optional API features

**Solution:**
```typescript
// In API call
export const fetchSomeOptionalData = async (): Promise<DataType> => {
  try {
    return await enhancedApiClient.callEndpoint<DataType>(
      'someEndpoint',
      'someMethod',
      {},
      {},
      undefined,
      { 
        errorHandling: {
          suppressNotifications: true,  // Suppress UI notifications
          logToConsole: false  // Optional: suppress console logging too
        }
      }
    );
  } catch (error) {
    // Return sensible defaults instead of propagating the error
    console.debug('Optional API endpoint not available - using defaults');
    return { /* default data */ } as DataType;
  }
};

// In error handler
export function showErrorNotification(options: NotificationOptions) {
  // Check if this error should be suppressed from notifications
  if (options.error && (options.error as any).suppressNotifications) {
    console.debug('Suppressing error notification:', options.title);
    return;
  }
  
  // Continue with normal notification display
  displayErrorNotification(options);
}
```

## Diagnostic Checklist

When facing Mantine styling issues, check these in order:

1. ✅ **Theme Colors**: Do all colors in `theme.colors` have exactly 10 shades?
2. ✅ **Data Attributes**: Are you using `dataActive` (camelCase) in theme styles and `data-active` (hyphenated) in CSS?
3. ✅ **CSS Variables**: Is your cssVariables configuration complete with all required properties?
4. ✅ **Provider Props**: Does your MantineProvider have both `withCssVariables` and `defaultColorScheme`?
5. ✅ **Style Conflicts**: Are you defining the same styles in multiple places?
6. ✅ **Import Order**: Are your CSS files imported in the correct order?
7. ✅ **Mantine Version**: Are all your Mantine packages on the same version?
8. ✅ **Component Props**: Have you updated all component props to the latest naming conventions?
9. ✅ **API Error Handling**: Are you suppressing notifications for non-critical API endpoints?

By addressing these common issues, you can avoid most styling and integration problems in Mantine applications.