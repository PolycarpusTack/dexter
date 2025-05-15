# API Migration Plan

This document outlines the plan for migrating from the old API client architecture to the new unified API client.

## Files to Remove

The following files are obsolete and should be removed after the migration is complete:

```
- /frontend/src/api/aiApi.ts
- /frontend/src/api/alertsApi.ts
- /frontend/src/api/analyticsApi.ts
- /frontend/src/api/apiClient.ts
- /frontend/src/api/config.ts
- /frontend/src/api/configApi.d.ts
- /frontend/src/api/deadlockApi.ts
- /frontend/src/api/discover.ts
- /frontend/src/api/discoverApi.ts
- /frontend/src/api/enhancedApiClient.ts
- /frontend/src/api/enhancedDeadlockApi.ts
- /frontend/src/api/enhancedIssuesApi.ts
- /frontend/src/api/errorAnalyticsApi.ts
- /frontend/src/api/eventApi.ts
- /frontend/src/api/eventsApi.ts
- /frontend/src/api/issuesApi.ts
- /frontend/src/api/modelApi.ts
- /frontend/src/api/optimizedApiExample.ts
- /frontend/src/api/unified/alertsApi.js
- /frontend/src/api/unified/analyzersApi.js
- /frontend/src/api/unified/apiClient.js
- /frontend/src/api/unified/apiConfig.js
- /frontend/src/api/unified/discoverApi.js
- /frontend/src/api/unified/eventsApi.js
- /frontend/src/api/unified/index.js
- /frontend/src/api/unified/issuesApi.js
- /frontend/src/api/unified/pathResolver.js
```

Create a new index.ts file in the api directory that re-exports everything from the unified API:

```typescript
// /frontend/src/api/index.ts
export * from './unified';
export { default } from './unified';
```

## Migration Steps

### 1. Identify Components Using the Old API

Use grep to find all components that import from the old API:

```bash
grep -r "import.*from.*api\/[^u]" --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" frontend/src/
```

### 2. Update Imports

For each component that uses the old API, update the imports:

```typescript
// Old
import { getIssues } from '../api/issuesApi';
import { getEvents } from '../api/eventsApi';

// New
import { api } from '../api/unified';
// Or use the index.ts re-export
import { api } from '../api';
```

### 3. Update API Calls

Update API calls to use the new API:

```typescript
// Old
const issues = await getIssues({ orgSlug, projectSlug });

// New
const issues = await api.issues.getIssues({
  organizationSlug: orgSlug,
  projectSlug: projectSlug
});
```

### 4. Migrate to Hooks

For components that make direct API calls, migrate to the React Query hooks:

```typescript
// Old
const [issues, setIssues] = useState([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  getIssues({ orgSlug, projectSlug })
    .then(data => {
      setIssues(data);
      setIsLoading(false);
    })
    .catch(error => {
      console.error(error);
      setIsLoading(false);
    });
}, [orgSlug, projectSlug]);

// New
import { hooks } from '../api/unified';

const { data, isLoading, error } = hooks.useIssues({
  organizationSlug: orgSlug,
  projectSlug: projectSlug
});

const issues = data?.items || [];
```

### 5. Update Error Handling

Replace custom error handling with the new error handler:

```typescript
// Old
try {
  const data = await getIssues({ orgSlug, projectSlug });
  return data;
} catch (error) {
  console.error("Failed to fetch issues:", error);
  throw error;
}

// New
import { utils } from '../api/unified';

const handleError = utils.createErrorHandler({
  module: 'IssuesComponent',
  showNotifications: true
});

try {
  const data = await api.issues.getIssues({
    organizationSlug: orgSlug,
    projectSlug: projectSlug
  });
  return data;
} catch (error) {
  handleError(error, {
    operation: 'fetchIssues',
    context: { orgSlug, projectSlug }
  });
  throw error;
}
```

### 6. Test Thoroughly

After making the changes, test thoroughly to ensure:

- All API calls work correctly
- Error handling works as expected
- Loading states are handled properly
- Data is correctly displayed

### 7. Remove Obsolete Files

Once all components have been migrated and tested, remove the obsolete files listed above.

## Migration Checklist

- [ ] Create compatibility layer (src/api/index.ts)
- [ ] Update EventTable component imports
- [ ] Update EventDetail component imports
- [ ] Update IssuesPage component imports
- [ ] Update Header component imports
- [ ] Update Settings component imports
- [ ] Update DeadlockDisplay component imports
- [ ] Update ExplainError component imports
- [ ] Verify all components work correctly with the new API
- [ ] Run all tests to ensure they pass
- [ ] Remove obsolete files

## Compatibility Layer (Optional)

To make the migration smoother, you can create a compatibility layer that maintains the old API signatures but uses the new API internally:

```typescript
// /frontend/src/api/compat.ts
import { api } from './unified';

// Export functions with the old signatures
export function getIssues({ orgSlug, projectSlug, ...rest }) {
  return api.issues.getIssues({
    organizationSlug: orgSlug,
    projectSlug: projectSlug,
    ...rest
  });
}

export function getEvents({ orgSlug, projectSlug, ...rest }) {
  return api.events.getEvents({
    organizationSlug: orgSlug,
    projectSlug: projectSlug,
    ...rest
  });
}

// Add more compatibility functions as needed
```

Then update the main index.ts to export the compatibility layer:

```typescript
// /frontend/src/api/index.ts
export * from './unified';
export * from './compat';
export { default } from './unified';
```

This allows you to gradually migrate components over time while maintaining backward compatibility.

## Dependencies

- All components using the old API client should be updated to use the new API.
- The React Query library should be installed and configured.
- The Zod library should be installed for validation.

## Conclusion

By following this migration plan, you can safely transition from the old API client architecture to the new unified API client. The new architecture provides better type safety, error handling, and performance optimizations, while maintaining a clean and consistent interface for components.

The migration can be done gradually, component by component, to minimize risk and ensure a smooth transition.