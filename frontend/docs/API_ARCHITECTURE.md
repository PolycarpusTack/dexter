# API Architecture Documentation

## Overview

The Dexter frontend uses a unified API client architecture that provides:
- Centralized API configuration
- Type-safe request/response handling
- Built-in error handling and retry logic
- Request caching and deduplication
- React Query integration for data fetching

## Directory Structure

```
frontend/src/api/
├── index.ts              # Main export point for all API functionality
└── unified/              # Unified API client implementation
    ├── apiConfig.ts      # API endpoints configuration
    ├── enhancedApiClient.ts  # Core API client with advanced features
    ├── apiResolver.ts    # Dynamic path resolution
    ├── errorHandler.ts   # Unified error handling
    ├── types.ts          # TypeScript interfaces and types
    ├── hooks/            # React Query hooks for each domain
    │   ├── useEvents.ts
    │   ├── useIssues.ts
    │   ├── useAi.ts
    │   └── ...
    └── [domain]Api.ts    # Domain-specific API modules
        ├── eventsApi.ts
        ├── issuesApi.ts
        ├── aiApi.ts
        └── ...
```

## Core Components

### 1. Enhanced API Client (`enhancedApiClient.ts`)

The core API client that handles all HTTP requests with:
- Automatic retry with exponential backoff
- Request caching with TTL support
- Request deduplication
- Progress tracking for uploads/downloads
- Axios interceptors for authentication

```typescript
const client = new EnhancedApiClient({
  baseUrl: config.sentryUrl,
  timeout: 30000,
  defaultHeaders: {
    'Authorization': `Bearer ${apiToken}`
  }
});
```

### 2. API Configuration (`apiConfig.ts`)

Centralized configuration for all API endpoints:

```typescript
export const apiConfig = {
  endpoints: {
    events: {
      base: '/api/v1',
      endpoints: {
        getEvent: { path: '/events/{eventId}', method: HttpMethod.GET },
        listEvents: { path: '/events', method: HttpMethod.GET }
      }
    },
    // ... other categories
  }
};
```

### 3. Path Resolver (`apiResolver.ts`)

Dynamic path resolution with parameter substitution:

```typescript
// Resolves to: /api/v1/events/123
resolvePath('events', 'getEvent', { eventId: '123' });
```

### 4. Error Handler (`errorHandler.ts`)

Unified error handling with categorization:

```typescript
export const handleApiError = (error: unknown): ApiError => {
  // Categorizes errors and provides consistent error objects
  return {
    message: 'Error description',
    category: ErrorCategory.Network,
    isRetryable: true
  };
};
```

## Usage Patterns

### Direct API Calls

For imperative API calls outside of React components:

```typescript
import { api } from '@/api';

// Fetch a single event
const event = await api.events.getEvent('event-123');

// List issues with query parameters
const issues = await api.issues.listIssues({
  organization: 'my-org',
  project: 'my-project',
  query: 'is:unresolved'
});
```

### React Query Hooks

For declarative data fetching in React components:

```typescript
import { hooks } from '@/api';

function MyComponent() {
  // Fetch events with automatic caching and refetching
  const { data, isLoading, error } = hooks.useEvents({
    organization: 'my-org',
    project: 'my-project'
  });
  
  // Mutations with optimistic updates
  const mutation = hooks.useUpdateIssue();
  
  const handleUpdate = () => {
    mutation.mutate({
      issueId: '123',
      status: 'resolved'
    });
  };
}
```

### Error Handling

All API errors are automatically handled and categorized:

```typescript
try {
  const data = await api.events.getEvent('123');
} catch (error) {
  if (error.category === ErrorCategory.NotFound) {
    // Handle 404 error
  } else if (error.isRetryable) {
    // Handle transient error
  }
}
```

### Request Options

Advanced request options for specific use cases:

```typescript
const response = await api.events.getEvent('123', {
  cache: true,          // Enable caching
  cacheTime: 300000,    // Cache for 5 minutes
  retry: 3,             // Retry 3 times on failure
  retryDelay: 1000,     // Wait 1s between retries
  signal: abortSignal,  // Support request cancellation
  onUploadProgress: (progress) => {
    console.log(`Upload: ${progress.loaded}/${progress.total}`);
  }
});
```

## Type Safety

All API modules use Zod for runtime validation:

```typescript
const eventSchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.string(),
  // ... other fields
});

export type Event = z.infer<typeof eventSchema>;
```

## Testing

Each API module has comprehensive tests:

```typescript
// Unit tests for API modules
frontend/src/api/unified/tests/eventsApi.test.ts

// Integration tests for hooks
frontend/src/api/unified/tests/hooks/useEvents.test.tsx

// End-to-end tests
frontend/src/api/unified/tests/integration/
```

## Migration Guide

To migrate from the old API client to the unified architecture:

1. Update imports:
   ```typescript
   // Old
   import { fetchEvents } from '@/api/eventsApi';
   
   // New
   import { api, hooks } from '@/api';
   ```

2. Replace imperative calls:
   ```typescript
   // Old
   const events = await fetchEvents(org, project);
   
   // New
   const events = await api.events.listEvents({ organization: org, project });
   ```

3. Use React Query hooks:
   ```typescript
   // Old
   const [events, setEvents] = useState([]);
   useEffect(() => {
     fetchEvents(org, project).then(setEvents);
   }, [org, project]);
   
   // New
   const { data: events = [] } = hooks.useEvents({ organization: org, project });
   ```

## Best Practices

1. **Always use hooks in React components** for automatic caching and state management
2. **Handle errors appropriately** based on their category
3. **Use request options** for fine-grained control when needed
4. **Validate responses** with Zod schemas for runtime type safety
5. **Add tests** for new API functionality
6. **Document new endpoints** in the API configuration

## Future Enhancements

- WebSocket support for real-time updates
- GraphQL integration
- Request batching for performance
- Offline support with service workers
- API versioning strategy