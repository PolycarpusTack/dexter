# EventTable Components Migration Guide

This document provides step-by-step instructions for migrating the EventTable components to use the unified API client architecture.

## Files to Update

- `/frontend/src/components/EventTable/EventTable.tsx`
- `/frontend/src/components/EventTable/EnhancedEventTable.tsx`
- `/frontend/src/components/EventTable/EnhancedEventTable.jsx`
- `/frontend/src/components/EventTable/columns/SummaryCell.tsx`
- `/frontend/src/components/EventTable/bulk-actions/BulkActionBar.tsx`
- `/frontend/src/hooks/useEventData.ts`
- `/frontend/src/hooks/useEventFrequency.ts`

## Migration Steps

### 1. Update Import Statements

Replace imports from the old API modules with imports from the unified API client:

```typescript
// Old
import { apiClient } from '../../api/apiClient';
import { fetchEvents } from '../../api/eventsApi';

// New
import { api } from '../../api/unified';
```

### 2. Update API Calls in EventTable.tsx

```typescript
// Old
const fetchData = async () => {
  try {
    const response = await apiClient.get('/events', {
      params: {
        organizationSlug,
        projectSlug,
        query,
        sort
      }
    });
    setEvents(response.data.items || []);
    setLoading(false);
  } catch (error) {
    setError(error);
    setLoading(false);
  }
};

// New
const fetchData = async () => {
  try {
    const response = await api.events.getEvents({
      organizationSlug,
      projectSlug,
      query,
      sort
    });
    setEvents(response.items || []);
    setLoading(false);
  } catch (error) {
    setError(error);
    setLoading(false);
  }
};
```

### 3. Update EnhancedEventTable.tsx to use React Query Hooks

```typescript
// Old
const [events, setEvents] = useState<Event[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetchEvents({
        organizationSlug,
        projectSlug,
        query,
        sort
      });
      setEvents(response.items || []);
      setLoading(false);
    } catch (error) {
      setError(error as Error);
      setLoading(false);
    }
  };
  
  fetchData();
}, [organizationSlug, projectSlug, query, sort]);

// New
const { 
  data, 
  isLoading, 
  error 
} = hooks.useEvents({
  organizationSlug,
  projectSlug,
  query,
  sort
});

const events = data?.items || [];
```

### 4. Update SummaryCell.tsx to use AI API

```typescript
// Old
import { explainError } from '../../../api/aiApi';

const handleExplain = async () => {
  try {
    setLoading(true);
    const explanation = await explainError(event.id);
    setExplanation(explanation.explanation);
    setLoading(false);
  } catch (error) {
    setError(error as Error);
    setLoading(false);
  }
};

// New
import { api } from '../../../api/unified';

const handleExplain = async () => {
  try {
    setLoading(true);
    const explanation = await api.ai.explainErrorByEventId(event.id);
    setExplanation(explanation.explanation);
    setLoading(false);
  } catch (error) {
    setError(error as Error);
    setLoading(false);
  }
};
```

### 5. Update BulkActionBar.tsx

```typescript
// Old
import { bulkUpdateIssues } from '../../../api/issuesApi';

const handleBulkResolve = async () => {
  try {
    await bulkUpdateIssues({
      organizationSlug,
      projectSlug,
      issueIds: selectedIds,
      data: { status: 'resolved' }
    });
    onSuccess();
  } catch (error) {
    onError(error as Error);
  }
};

// New
import { api } from '../../../api/unified';

const handleBulkResolve = async () => {
  try {
    await api.issues.bulkUpdateIssues({
      organizationSlug,
      projectSlug,
      issueIds: selectedIds,
      data: { status: 'resolved' }
    });
    onSuccess();
  } catch (error) {
    onError(error as Error);
  }
};
```

### 6. Update useEventData.ts Hook

```typescript
// Old
import { fetchEventDetails } from '../api/eventsApi';

export function useEventData(eventId: string, orgSlug: string, projectSlug: string) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!eventId) return;
    
    const fetchData = async () => {
      try {
        const eventData = await fetchEventDetails(orgSlug, projectSlug, eventId);
        setData(eventData);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, orgSlug, projectSlug]);
  
  return { data, isLoading, error };
}

// New
import { hooks } from '../api/unified';

export function useEventData(eventId: string, orgSlug: string, projectSlug: string) {
  return hooks.useEvent(orgSlug, projectSlug, eventId);
}
```

### 7. Update useEventFrequency.ts Hook

```typescript
// Old
import { getErrorFrequency } from '../api/errorAnalyticsApi';

// New
import { api } from '../api/unified';

// Then update the function call inside the hook:
const data = await api.analytics.getErrorFrequency(issueId, timeRange);
```

## Testing

After migrating each component, perform the following tests:

1. **TypeScript Validation**: Run `npm run typecheck` to ensure types are correct
2. **Functionality Testing**: Verify that the component works as expected
3. **Error Handling**: Test error scenarios to ensure errors are properly handled

## Common Issues and Solutions

### Type Errors

If you encounter type errors like:

```
Property 'items' does not exist on type 'unknown'
```

Ensure you're using the correct type definitions from the unified API:

```typescript
import { Event, EventsResponse } from '../../api/unified';
```

### API Parameter Mismatch

If parameters don't match between old and new APIs:

```typescript
// Old
query: searchTerm,
orgSlug: organization

// New
query: searchTerm,
organizationSlug: organization
```

Use the compatibility layer if needed, or update all parameter names.

### Custom Error Handling

If the component has custom error handling, update it to use the unified approach:

```typescript
import { utils } from '../../api/unified';

const handleError = utils.createErrorHandler({
  module: 'EventTable',
  showNotifications: true
});

try {
  // API call
} catch (error) {
  handleError(error, {
    operation: 'fetchEvents',
    context: { organizationSlug, projectSlug }
  });
}
```

## Conclusion

By following these steps, you should be able to successfully migrate EventTable components to use the unified API client architecture. The migration improves type safety, error handling, and maintainability while ensuring consistent API usage across the application.