# Unified API Developer Guide

## Introduction

This guide provides a comprehensive overview of the unified API client architecture in the Dexter application. It covers the core concepts, components, and best practices for working with the API.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [API Configuration](#api-configuration)
4. [Making API Calls](#making-api-calls)
5. [Error Handling](#error-handling)
6. [Data Validation](#data-validation)
7. [React Query Integration](#react-query-integration)
8. [Testing](#testing)
9. [Best Practices](#best-practices)
10. [Migration Guide](#migration-guide)

## Architecture Overview

The unified API client architecture is designed to provide a consistent, type-safe, and efficient way to interact with backend services. It follows these key principles:

- **Single Source of Truth**: All API endpoints are defined in a central configuration file
- **Type Safety**: All API requests and responses are validated at runtime with Zod
- **Error Handling**: Comprehensive error handling with specific error types and recovery strategies
- **Caching and Performance**: Optimized data fetching with React Query for caching and state management
- **Modularity**: Domain-specific API modules for different functional areas

The architecture is structured as follows:

```
frontend/src/api/
├── unified/                  # Unified API client architecture
│   ├── apiConfig.ts          # API endpoint configuration
│   ├── enhancedApiClient.ts  # Core API client implementation
│   ├── pathResolver.ts       # Dynamic path resolution
│   ├── errorHandler.ts       # Unified error handling
│   ├── index.ts              # Main entry point for API access
│   ├── hooks/                # React Query hooks
│   │   ├── useEvents.ts      # Events API hooks
│   │   ├── useIssues.ts      # Issues API hooks
│   │   ├── useAi.ts          # AI API hooks
│   │   └── ...
│   ├── eventsApi.ts          # Events API module
│   ├── issuesApi.ts          # Issues API module
│   ├── analyzersApi.ts       # Analyzers API module
│   ├── aiApi.ts              # AI API module
│   └── ...
├── archived/                 # Deprecated API modules (for backward compatibility)
│   ├── enhancedDeadlockApi.ts
│   ├── aiApi.ts
│   └── ...
└── index.ts                  # Entry point with backward compatibility
```

## Core Components

### Enhanced API Client

The `enhancedApiClient` is the core of the architecture, responsible for making HTTP requests to the backend. It provides:

- HTTP method wrappers (GET, POST, PUT, DELETE)
- Request/response interceptors
- Automatic retries with exponential backoff
- Request caching
- Request deduplication
- Response validation

```typescript
// Example of the enhancedApiClient in action
import enhancedApiClient from './enhancedApiClient';

const response = await enhancedApiClient.callEndpoint<ResponseType>(
  'category',
  'endpoint',
  pathParams,
  queryParams,
  body,
  options
);
```

### Path Resolver

The `pathResolver` dynamically constructs API paths based on the configured endpoints and parameters. It handles:

- Parameter substitution in URL paths
- URL encoding of parameters
- Validation of required parameters

```typescript
// Example of the pathResolver in action
import { resolveApiPath } from './pathResolver';

const path = resolveApiPath('issues', 'getIssue', { issueId: '123' });
// Result: '/api/issues/123'
```

### Error Handler

The `errorHandler` provides a unified way to handle API errors across the application. It includes:

- Error categorization (network, validation, server, etc.)
- Retry decisions based on error type
- Error recovery strategies
- Consistent error notifications

```typescript
// Example of the errorHandler in action
import { createErrorHandler } from './errorHandler';

const handleEventsError = createErrorHandler({
  module: 'EVENTS_API',
  showNotifications: true,
  logToConsole: true
});

try {
  // API call
} catch (error) {
  handleEventsError(error, {
    operation: 'getEvents',
    context: { projectId, timeRange }
  });
}
```

## API Configuration

All API endpoints are defined in the `apiConfig.ts` file, which serves as the single source of truth for the API structure. The configuration includes:

- API categories (events, issues, analyzers, etc.)
- Endpoints within each category
- Path templates
- Required parameters
- HTTP methods

```typescript
// Example of API configuration
export const apiConfig: ApiConfiguration = {
  events: {
    getEvents: {
      path: '/api/organizations/:organization/projects/:projectId/events',
      method: 'GET',
      requiredParams: ['organization', 'projectId']
    },
    getEvent: {
      path: '/api/organizations/:organization/projects/:projectId/events/:eventId',
      method: 'GET',
      requiredParams: ['organization', 'projectId', 'eventId']
    }
  },
  // Other categories...
};
```

## Making API Calls

### Direct API Calls

Domain-specific API modules provide typed functions for each endpoint:

```typescript
// Example of using the eventsApi module
import { getEvents, getEvent } from '../api/unified/eventsApi';

// Get events for a project
const events = await getEvents({
  organization: 'my-org',
  projectId: 'my-project',
  timeRange: '24h'
});

// Get a specific event
const event = await getEvent({
  organization: 'my-org',
  projectId: 'my-project',
  eventId: 'event-123'
});
```

### Using the Unified API

For consistent access across the application, use the main API entry point:

```typescript
// Example of using the unified API
import { api } from '../api/unified';

// Get events for a project
const events = await api.events.getEvents({
  organization: 'my-org',
  projectId: 'my-project',
  timeRange: '24h'
});

// Get explanations from AI
const explanation = await api.ai.explainError({
  eventId: 'event-123',
  options: {
    includeRecommendations: true
  }
});
```

## Error Handling

All API calls should include proper error handling. The architecture provides a consistent approach:

```typescript
// Example of error handling
import { api } from '../api/unified';
import { showErrorNotification } from '../utils/errorHandling';

try {
  const events = await api.events.getEvents({
    organization: 'my-org',
    projectId: 'my-project',
    timeRange: '24h'
  });
  
  // Process events...
  
} catch (error) {
  // Handle API error
  showErrorNotification({
    title: 'Failed to fetch events',
    message: error instanceof Error ? error.message : 'Unknown error',
    error: error instanceof Error ? error : undefined
  });
  
  // Fall back to empty data
  return [];
}
```

## Data Validation

All API responses are validated at runtime using [Zod](https://github.com/colinhacks/zod), providing runtime type safety:

```typescript
// Example of Zod schema and validation
import { z } from 'zod';

// Define schema
export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  timestamp: z.string(),
  level: z.string(),
  // Other fields...
});

// Validate response
try {
  const validatedEvents = z.array(eventSchema).parse(response);
  return validatedEvents;
} catch (validationError) {
  console.warn('Event validation failed:', validationError);
  // Either throw or return unvalidated data
  return response;
}
```

## React Query Integration

The unified API integrates with [React Query](https://tanstack.com/query) for efficient data fetching, caching, and state management. Custom hooks provide a simple interface:

```typescript
// Example of React Query hooks
import { useEvents, useEventById } from '../api/unified/hooks';

// In a component
const { 
  data: events, 
  isLoading, 
  error, 
  refetch 
} = useEvents({
  organizationId: 'my-org',
  projectId: 'my-project',
  timeRange: '24h'
});

// Get a specific event
const { 
  data: event,
  isLoading: isEventLoading
} = useEventById(
  'my-org',
  'my-project',
  'event-123'
);
```

## Testing

The unified API is designed to be easily testable. Here are the different types of tests:

### Unit Tests

Unit tests focus on individual functions and modules:

```typescript
// Example of unit testing an API module
import { vi, describe, it, expect } from 'vitest';
import * as eventsApi from '../eventsApi';
import enhancedApiClient from '../enhancedApiClient';

// Mock dependencies
vi.mock('../enhancedApiClient', () => ({
  default: {
    callEndpoint: vi.fn()
  }
}));

describe('Events API', () => {
  it('should fetch events with the correct parameters', async () => {
    // Mock the API response
    vi.mocked(enhancedApiClient.callEndpoint).mockResolvedValueOnce({
      items: [],
      meta: { total: 0 }
    });
    
    // Call the function
    await eventsApi.getEvents({
      organization: 'test-org',
      projectId: 'test-project'
    });
    
    // Assert that callEndpoint was called with the right parameters
    expect(enhancedApiClient.callEndpoint).toHaveBeenCalledWith(
      'events',
      'getEvents',
      { organization: 'test-org', projectId: 'test-project' },
      {},
      null,
      undefined
    );
  });
});
```

### Integration Tests

Integration tests use MSW to mock API responses:

```typescript
// Example of integration testing
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { resolveApiPath } from '../pathResolver';
import * as eventsApi from '../eventsApi';

// Set up MSW server
const eventsPath = resolveApiPath('events', 'getEvents', { 
  organization: ':organization', 
  projectId: ':projectId' 
});

const server = setupServer(
  rest.get(eventsPath, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        items: [{ id: '123', title: 'Test Event' }],
        meta: { total: 1 }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test
it('should fetch events from the API', async () => {
  const result = await eventsApi.getEvents({
    organization: 'test-org',
    projectId: 'test-project'
  });
  
  expect(result.items).toHaveLength(1);
  expect(result.items[0].id).toBe('123');
});
```

### Component Tests

Component tests verify that components work correctly with the API:

```typescript
// Example of component testing with the API
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EventList from '../EventList';
import * as hooks from '../../api/unified/hooks';

// Mock the hooks
vi.mock('../../api/unified/hooks', () => ({
  useEvents: vi.fn()
}));

// Create a query client for testing
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

// Wrapper with provider
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Test
it('should render events from the API', async () => {
  // Mock the hook
  vi.mocked(hooks.useEvents).mockReturnValue({
    data: {
      items: [{ id: '123', title: 'Test Event' }],
      meta: { total: 1 }
    },
    isLoading: false,
    error: null,
    refetch: vi.fn()
  } as any);
  
  render(<EventList projectId="test-project" />, { wrapper });
  
  // Check that the event is rendered
  expect(screen.getByText('Test Event')).toBeInTheDocument();
});
```

## Best Practices

### 1. Use Domain-Specific API Modules

Always use the appropriate domain-specific API module for a given task:

```typescript
// Good
import { api } from '../api/unified';
const events = await api.events.getEvents(params);

// Avoid direct calls to enhancedApiClient
import enhancedApiClient from '../api/unified/enhancedApiClient';
const events = await enhancedApiClient.callEndpoint('events', 'getEvents', ...);
```

### 2. Prefer React Query Hooks

In components, use the React Query hooks for automatic caching and state management:

```typescript
// Good
import { useEvents } from '../api/unified/hooks';
const { data, isLoading, error } = useEvents(params);

// Avoid direct API calls in components
import { api } from '../api/unified';
const [data, setData] = useState(null);
useEffect(() => {
  api.events.getEvents(params).then(setData);
}, []);
```

### 3. Always Handle Errors

Every API call should include error handling:

```typescript
// Good
try {
  const events = await api.events.getEvents(params);
} catch (error) {
  handleEventsError(error, { operation: 'getEvents', context: params });
}

// In components, React Query handles this for you
const { data, error } = useEvents(params);
if (error) {
  // Handle error
}
```

### 4. Validate Response Data

Always validate response data using Zod schemas:

```typescript
// Good
const validatedEvents = eventSchema.parse(response);

// API modules do this for you
const events = await api.events.getEvents(params);
// events is already validated
```

### 5. Use Type Inference

Leverage Zod's type inference for type safety:

```typescript
// Good
import { z } from 'zod';
import { eventSchema } from '../api/unified/eventsApi';

type Event = z.infer<typeof eventSchema>;
```

## Migration Guide

If you're migrating from the old API clients to the unified API, follow these steps:

### 1. Identify API Usage

Identify where you're using the old API clients:

```typescript
// Old API usage
import { getEvents } from '../api/eventApi';
```

### 2. Find Unified API Equivalent

Look up the equivalent function in the unified API:

```typescript
// Unified API equivalent
import { api } from '../api/unified';
// or specific import
import { getEvents } from '../api/unified/eventsApi';
```

### 3. Update Parameters

Update the function parameters according to the new API:

```typescript
// Old API call
const events = await getEvents(organizationSlug, projectSlug);

// New API call
const events = await api.events.getEvents({
  organization: organizationSlug,
  projectId: projectSlug
});
```

### 4. Update Error Handling

Implement proper error handling with the new API:

```typescript
// Old error handling
try {
  const events = await getEvents(org, project);
} catch (error) {
  console.error('Error fetching events:', error);
}

// New error handling
try {
  const events = await api.events.getEvents({
    organization: org,
    projectId: project
  });
} catch (error) {
  handleEventsError(error, {
    operation: 'getEvents',
    context: { organization: org, projectId: project }
  });
}
```

### 5. Switch to React Query Hooks

For components, switch to the React Query hooks:

```typescript
// Old component code
const [events, setEvents] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchEvents = async () => {
    try {
      const result = await getEvents(org, project);
      setEvents(result);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchEvents();
}, [org, project]);

// New component code with React Query
const {
  data: events,
  isLoading,
  error
} = useEvents({
  organizationId: org,
  projectId: project
});
```

## Conclusion

The unified API client architecture provides a robust, type-safe, and efficient way to interact with backend services. By following the patterns and best practices outlined in this guide, you'll be able to build reliable and maintainable features that leverage the full power of the architecture.

For specific questions or further assistance, refer to the API documentation or contact the development team.