# Store Migration Guide

## Overview

The monolithic `appStore` has been refactored into domain-specific stores to follow the Single Responsibility Principle. This improves code organization, makes testing easier, and reduces unnecessary re-renders.

## New Store Structure

### 1. **authStore** - Authentication & Organization Context
```typescript
import { useAuthStore } from '@/store';

// Access auth state
const { userId, apiToken, organizationSlug, projectSlug } = useAuthStore();

// Actions
const { setOrgProject, clearAuth, isAuthenticated } = useAuthStore();
```

### 2. **uiStore** - UI Preferences
```typescript
import { useUIStore } from '@/store';

// Access UI state
const { darkMode, displayPreferences } = useUIStore();

// Actions
const { toggleDarkMode, updateDisplayPreference } = useUIStore();
```

### 3. **selectionStore** - Current Selection State
```typescript
import { useSelectionStore } from '@/store';

// Access selection
const { selectedIssueId, selectedEventId } = useSelectionStore();

// Actions
const { setSelectedIssue, clearSelection } = useSelectionStore();
```

### 4. **filterStore** - Filters and Search
```typescript
import { useFilterStore } from '@/store';

// Access filters
const { statusFilter, searchQuery } = useFilterStore();

// Actions
const { setStatusFilter, setSearchQuery, resetFilters } = useFilterStore();
```

### 5. **keyboardStore** - Keyboard Shortcuts
```typescript
import { useKeyboardStore } from '@/store';

// Access keyboard settings
const { enabled, customShortcuts } = useKeyboardStore();

// Actions
const { setEnabled, setCustomShortcut } = useKeyboardStore();
```

### 6. **aiStore** - AI Model & Prompt Engineering
```typescript
import { useAIStore } from '@/store';

// Access AI settings
const { activeAIModel, promptEngineeringPreferences } = useAIStore();

// Actions
const { setActiveAIModel, updatePromptEngineeringLevel } = useAIStore();
```

## Migration Steps

### Automatic Migration

1. The migration will run automatically on first load after the update
2. All existing data from `appStore` will be migrated to the new stores
3. The old store will be cleared after migration

### Manual Migration (if needed)

```typescript
import { migrateFromAppStore } from '@/store';

// Call this once in your app initialization
migrateFromAppStore();
```

## Updating Components

### Before (using appStore)
```typescript
import useAppStore from '@/store/appStore';

function MyComponent() {
  const { 
    organizationSlug, 
    darkMode, 
    selectedIssueId,
    setSelectedIssue,
    toggleDarkMode 
  } = useAppStore();
  
  // Component logic
}
```

### After (using individual stores)
```typescript
import { useAuthStore, useUIStore, useSelectionStore } from '@/store';

function MyComponent() {
  const { organizationSlug } = useAuthStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const { selectedIssueId, setSelectedIssue } = useSelectionStore();
  
  // Component logic
}
```

### Using Convenience Hooks

For common use cases, convenience hooks are provided:

```typescript
import { useAuth, useFiltersAndSelection } from '@/store';

function MyComponent() {
  // Auth convenience hook
  const { isAuthenticated, organizationSlug, setOrgProject } = useAuth();
  
  // Filters and selection convenience hook
  const { 
    statusFilter, 
    selectedIssueId, 
    setStatusFilter, // Automatically clears selection when filter changes
    setSelectedIssue 
  } = useFiltersAndSelection();
}
```

## Benefits of the New Structure

1. **Better Performance**: Components only re-render when their specific store data changes
2. **Clearer Dependencies**: It's obvious which data a component depends on
3. **Easier Testing**: Each store can be tested in isolation
4. **Better TypeScript Support**: Each store has focused, specific types
5. **Maintainability**: Each store has a single responsibility

## Backward Compatibility

The old `appStore` remains available during the transition period but is marked as deprecated. It will be removed in a future version.

## Common Patterns

### Accessing Multiple Stores
```typescript
function MyComponent() {
  const auth = useAuthStore();
  const ui = useUIStore();
  const selection = useSelectionStore();
  
  // Use destructuring for cleaner code
  const { organizationSlug } = auth;
  const { darkMode } = ui;
  const { selectedIssueId } = selection;
}
```

### Store Subscriptions
```typescript
// Subscribe to specific store changes
useEffect(() => {
  const unsubscribe = useAuthStore.subscribe(
    (state) => state.organizationSlug,
    (orgSlug) => {
      console.log('Organization changed:', orgSlug);
    }
  );
  
  return unsubscribe;
}, []);
```

### Direct Store Access (outside components)
```typescript
// Get current state
const currentOrg = useAuthStore.getState().organizationSlug;

// Update state
useAuthStore.getState().setOrgProject('my-org', 'my-project');
```

## Troubleshooting

### Data Not Migrating
- Check browser console for migration logs
- Manually trigger migration: `migrateFromAppStore()`
- Clear localStorage and re-login if needed

### Type Errors
- Update imports from `useAppStore` to individual stores
- Use the TypeScript migration tool: `npx ts-migrate`

### Performance Issues
- Ensure you're not importing all stores when you only need one
- Use store selectors to minimize re-renders

## Future Improvements

1. Add store devtools for debugging
2. Implement store middleware for logging
3. Add store persistence strategies per domain
4. Create more granular stores if needed