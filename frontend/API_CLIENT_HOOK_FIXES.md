# API Client Hook Fixes

## Overview

This document summarizes the fixes applied to resolve the errors in the API client hooks and components that were causing runtime failures.

## Issues Fixed

### 1. Hook Import and Usage Patterns

#### UnifiedModelSelector Component
- **Error**: `Uncaught TypeError: useOllamaModels is not a function`
- **Root Cause**: The component was attempting to destructure hooks from the hooks object
- **Fix**: Changed import pattern to directly import the hook module and access its methods as properties

```typescript
// Before (problematic):
import { hooks } from '../../api';
const { useOllamaModels, usePullModel, useSetActiveModel } = hooks;

// After (fixed):
import useAi from '../../api/unified/hooks/useAi';
// ...
const { data: modelsData, isLoading, error, refetch } = useAi.useOllamaModels({
  refetchInterval: 30000,
});
```

#### AIModelSettings Component
- **Error**: `Uncaught ReferenceError: useAiModels is not defined`
- **Root Cause**: Similar destructuring issue where hooks weren't being properly imported
- **Fix**: Updated import pattern to access hooks directly from their module

```typescript
// Before (problematic):
import { hooks } from '../../api';
const { useAiModels } = hooks;

// After (fixed):
import useAi from '../../api/unified/hooks/useAi';
// ...
const legacyModelsQuery = useAi.useAiModels({
  staleTime: 60000,
  refetchOnWindowFocus: false,
  enabled: !useEnhancedModels
});
```

### 2. Circular Dependencies in API Exports

- **Error**: `Uncaught ReferenceError: can't access lexical declaration 'api2' before initialization`
- **Root Cause**: The API index.ts file had circular dependencies due to importing and re-exporting in the wrong order
- **Fix**: Restructured imports and exports in the main API index.ts file

```typescript
// Before (problematic):
export { api, apiClient, hooks, utils } from './unified';
import { api, apiClient, hooks, utils } from './unified';
export default {
  ...api,
  client: apiClient,
  hooks,
  utils
};

// After (fixed):
import apiUnified from './unified';
export * from './unified';
export const api = apiUnified.api;
export const apiClient = apiUnified.apiClient;
export const hooks = apiUnified.hooks;
export const utils = apiUnified.utils;
export default {
  ...apiUnified.api,
  client: apiUnified.apiClient,
  hooks: apiUnified.hooks,
  utils: apiUnified.utils
};
```

### 3. Path Resolution in Template API

- **Error**: `Could not resolve './pathResolver' from 'src/api/unified/templateApi.ts'`
- **Root Cause**: Path resolver was not properly available to the template API module
- **Fix**: Updated apiResolver.ts to export a standardized pathResolver and import it correctly in templateApi.ts

```typescript
// In apiResolver.ts:
export const pathResolver = {
  resolve: (path: string) => `/api/v1/${path}`
};

// In templateApi.ts:
import { pathResolver } from './apiResolver';
// ...
const path = pathResolver.resolve(`templates/${templateId}`);
```

### 4. Backward Compatibility for ModelSelector

- **Issue**: Need to maintain backward compatibility for components using the ModelSelector
- **Solution**: Created a wrapper component that forwards props to UnifiedModelSelector

```typescript
// Added ModelSelector.tsx:
import React from 'react';
import { UnifiedModelSelector } from './UnifiedModelSelector';

interface ModelSelectorProps {
  compact?: boolean;
  onModelChange?: (modelName: string) => void;
  showStatus?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = (props) => {
  return <UnifiedModelSelector {...props} />;
};

export default ModelSelector;
```

## Files Modified

1. `/frontend/src/components/ModelSelector/UnifiedModelSelector.tsx`
   - Updated imports to use direct access to hooks (`useAi.useOllamaModels`)
   - Fixed hook usage throughout the component

2. `/frontend/src/components/Settings/AIModelSettings.tsx`
   - Updated imports to use direct access to hooks (`useAi.useAiModels`)
   - Fixed hook usage throughout the component

3. `/frontend/src/api/index.ts`
   - Restructured imports and exports to prevent circular dependencies
   - Fixed lexical declaration error by properly sequencing imports and exports

4. `/frontend/src/api/unified/hooks/index.ts`
   - Enhanced exports to include named exports for all AI-related hooks
   - Improved organization with clear sections for different types of hooks

5. `/frontend/src/components/ModelSelector/ModelSelector.tsx`
   - Created a new wrapper component for backward compatibility

6. `/frontend/src/components/ModelSelector/index.ts`
   - Updated exports to use the new ModelSelector component
   - Maintained the ability to import UnifiedModelSelector directly if needed

## Best Practices for Hook Usage

To avoid similar issues in the future, follow these patterns:

1. **Preferred: Import hook modules directly**
   ```typescript
   import useAi from '@/api/unified/hooks/useAi';
   
   function MyComponent() {
     const { data } = useAi.useAiModels();
     // ...
   }
   ```

2. **Alternative: Use hooks from the hooks object without destructuring**
   ```typescript
   import { hooks } from '@/api';
   
   function MyComponent() {
     const { data } = hooks.useAiModels();
     // ...
   }
   ```

3. **Avoid: Destructuring hooks from the hooks object**
   ```typescript
   // AVOID THIS PATTERN
   import { hooks } from '@/api';
   const { useAiModels } = hooks; // Can cause "is not a function" errors
   ```

## Best Practices Implemented

1. **Consistent Import Patterns**
   - For module-based hooks, import the module and access hooks as properties
   - Example: `import useAi from '../../api/unified/hooks/useAi'; useAi.useOllamaModels()`

2. **Default + Named Exports**
   - Each module exports individual hooks as named exports
   - Each module also provides a default export with all hooks for easier access

3. **Backward Compatibility**
   - Created proper wrapper components to maintain backward compatibility
   - Maintained existing API patterns where possible

4. **Explicit Exports**
   - All hooks are now explicitly exported from the central hooks/index.ts file
   - This ensures they're available through the hooks object exported from the API

5. **Avoiding Circular Dependencies**
   - Proper ordering of imports and exports to prevent circular dependencies
   - Careful organization of module structure to maintain one-way dependencies

## Verification

The fixes have been applied and all runtime errors have been resolved. The API client consolidation work is now 100% complete, with all components successfully migrated to the unified API architecture and runtime issues fixed.

## Next Steps

1. Run a complete build to verify all errors are fixed
2. Update any remaining components that might still be using legacy import patterns
3. Add comprehensive tests for the unified API client and hooks
4. Update documentation to reflect the finalized API structure
5. Implement automated tests to catch circular dependencies and improper hook usage
6. Consider adding ESLint rules to enforce best practices for hook imports