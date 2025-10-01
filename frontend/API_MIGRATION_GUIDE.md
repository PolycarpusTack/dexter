# API Migration Guide

## Overview

This guide documents the unified API architecture and migration from legacy API clients.

## Quick Start

### Using the Unified API

```typescript
// Import from the central API export
import { api, hooks } from '@/api';

// Or import specific modules
import { api } from '@/api';
import { useEvents } from '@/api/hooks';

// Making API calls
const events = await api.events.getEvents({ organization: 'org-slug' });
const issue = await api.issues.getIssue({ issueId: '123' });

// Using hooks
const { data, loading, error } = useEvents({ organization: 'org-slug' });
```

### Migration from Legacy APIs

#### Before (Legacy)
```typescript
import { eventApi } from '../api/eventApi';
import { issuesApi } from '../api/issuesApi';

// Direct API calls
const events = await eventApi.fetchEvents();
const issues = await issuesApi.getIssues();
```

#### After (Unified)
```typescript
import { api } from '@/api';

// Unified API calls
const events = await api.events.getEvents({ organization: 'org-slug' });
const issues = await api.issues.getIssues({ organization: 'org-slug' });
```

## API Structure

```
src/api/
├── unified/               # Unified API implementation
│   ├── index.ts          # Main export
│   ├── enhancedApiClient.ts
│   ├── apiConfig.ts
│   ├── apiResolver.ts
│   ├── errorHandler.ts
│   ├── eventsApi.ts
│   ├── issuesApi.ts
│   ├── aiApi.ts
│   ├── configApi.ts
│   └── hooks/            # React Query hooks
│       ├── useEvents.ts
│       ├── useIssues.ts
│       └── useAi.ts
└── index.ts              # Central export
```

## Key Features

1. **Type Safety**: All API responses are validated with Zod schemas
2. **Error Handling**: Centralized error handling with proper notifications
3. **Caching**: Built-in request caching and deduplication
4. **Retries**: Automatic retry logic for transient failures
5. **React Query Integration**: Hooks for easy data fetching in components

## Common Patterns

### Fetching Data with Hooks

```typescript
function MyComponent() {
  const { data, loading, error } = useEvents({
    organization: 'org-slug',
    query: 'is:unresolved'
  });

  if (loading) return <Loader />;
  if (error) return <ErrorDisplay error={error} />;
  
  return <EventList events={data.items} />;
}
```

### Direct API Calls

```typescript
async function handleSubmit(data: FormData) {
  try {
    const result = await api.issues.updateIssue({
      issueId: '123',
      data: { status: 'resolved' }
    });
    showSuccess('Issue resolved');
  } catch (error) {
    showError('Failed to update issue');
  }
}
```

### Validated API Calls

```typescript
import { useValidatedApi } from '@/hooks/useValidatedApi';
import { EventSchema } from '@/types';

function MyComponent() {
  const { execute, loading } = useValidatedApi(
    api.events.getEvent,
    {
      schema: EventSchema,
      onSuccess: (event) => console.log('Valid event:', event),
      errorTitle: 'Failed to load event'
    }
  );

  return (
    <Button onClick={() => execute('event-123')} loading={loading}>
      Load Event
    </Button>
  );
}
```

## Error Handling

All API errors are handled consistently:

1. Network errors trigger automatic retries
2. Validation errors show detailed messages
3. Auth errors redirect to login
4. Rate limits trigger backoff

```typescript
try {
  const data = await api.events.getEvents({ organization: 'org' });
} catch (error) {
  if (error.retryable) {
    // Will be retried automatically
  } else if (error.status === 401) {
    // Redirect to login
  } else {
    // Show error notification
  }
}
```

## Debugging

Enable debug logging:

```typescript
// In development
localStorage.setItem('API_DEBUG', 'true');

// API calls will log:
// - Request details
// - Response data
// - Cache hits/misses
// - Retry attempts
```

## Migration Checklist

- [ ] Update imports to use `@/api` or `@/api/unified`
- [ ] Replace direct API calls with unified API methods
- [ ] Add proper error handling
- [ ] Use React Query hooks where appropriate
- [ ] Add Zod validation for critical endpoints
- [ ] Remove legacy API imports
- [ ] Test error scenarios

## Support

For questions or issues:
1. Check the API documentation in `/docs/api`
2. Review the unified API source code
3. Contact the platform team