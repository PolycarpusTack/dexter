# API Implementation Guide

## Overview

This guide provides detailed instructions for implementing API clients in the Dexter project following our consolidated architecture. It covers best practices, patterns, and examples to ensure consistent, maintainable, and type-safe API integration.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Client Hierarchy](#api-client-hierarchy)
3. [Path Configuration](#path-configuration)
4. [Error Handling](#error-handling)
5. [Type Safety](#type-safety)
6. [Performance Optimization](#performance-optimization)
7. [Testing Strategies](#testing-strategies)
8. [Implementation Examples](#implementation-examples)
9. [Migration Guidelines](#migration-guidelines)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview

The Dexter API architecture follows a layered approach:

1. **Base API Client Layer**: Core HTTP request functionality with error handling, retries, and performance optimizations.
2. **Path Resolution Layer**: Maps between frontend paths, backend paths, and external API paths.
3. **API Module Layer**: Feature-specific API methods organized by domain (issues, events, etc.).
4. **Hook Layer**: React hooks that leverage the API modules and provide component-ready state management.
5. **Component Layer**: UI components that consume the hooks for data display and interaction.

This separation of concerns allows for:
- Clear responsibility boundaries
- Easier testing and maintenance
- Consistent error handling
- Type safety throughout the stack
- Performance optimizations at appropriate layers

## API Client Hierarchy

### EnhancedApiClient

The `EnhancedApiClient` provides core HTTP functionality with these features:
- HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Automatic retries for transient errors
- Response caching and optimization
- Request deduplication and batching
- Structured error handling and logging

```typescript
// Usage example:
import { apiClient } from './apiClient';

const data = await apiClient.get<ResponseType>('/endpoint', { 
  params: { key: 'value' } 
});
```

### PathAwareApiClient

The `PathAwareApiClient` extends the base client with path resolution:
- Path-based endpoint access
- Parameter validation
- Consistent URL generation
- Path parameter substitution

```typescript
// Usage example:
import { enhancedApiClient } from './enhancedApiClient';

const data = await enhancedApiClient.callEndpoint<ResponseType>(
  'endpointName',
  { paramKey: 'value' }
);
```

## Path Configuration

### 1. Endpoint Definition

Endpoints are defined in the central `pathMappings.ts` file:

```typescript
// Example endpoint definition
export const API_MAPPINGS: Record<string, ApiEndpointConfig> = {
  getIssue: new ApiEndpointConfig(
    'getIssue',
    '/api/v1/issues/{issue_id}',
    '/organizations/{organization_slug}/issues/{issue_id}',
    '/api/0/issues/{issue_id}/',
    HttpMethod.GET,
    ['organization_slug', 'issue_id'],
    [],
    true,
    60, // Cache TTL in seconds
    'Get issue details'
  ),
};
```

### 2. Path Parameters

Path parameters are denoted with `{parameter_name}` syntax and are automatically replaced with actual values when making requests:

```typescript
// Parameter substitution
const url = endpoint.resolveBackendPath({
  organization_slug: 'my-org',
  issue_id: '123'
});
// Result: '/organizations/my-org/issues/123'
```

### 3. Parameter Validation

The system validates required parameters before making requests:

```typescript
// Parameter validation
const validation = apiPathManager.validateParams('getIssue', params);
if (!validation.isValid) {
  throw new Error(`Missing required parameters: ${validation.missingParams.join(', ')}`);
}
```

## Error Handling

### 1. Error Factory

The `ErrorFactory` creates structured error objects with context:

```typescript
import ErrorFactory from '../utils/errorFactory';

// Create a specific error type
const error = ErrorFactory.createApiError(
  'Failed to fetch issue details',
  404,
  responseData,
  {
    originalError: err,
    metadata: {
      issueId: '123',
      operation: 'getIssue'
    }
  }
);
```

### 2. Module-Specific Error Handlers

Each API module should define its own error handler:

```typescript
import { createErrorHandler } from '../utils/errorHandling';

// Create module-specific error handler
const handleIssuesError = createErrorHandler('Issues API Error', {
  context: { apiModule: 'issuesApi' }
});

// Use in try/catch blocks
try {
  // API call
} catch (error) {
  handleIssuesError(error, {
    operation: 'fetchIssue',
    issueId,
    projectId
  });
  throw error;
}
```

### 3. Error Retry Strategy

Transient errors (network issues, timeouts) are automatically retried:

```typescript
// Configure retry strategy
const retryConfig = {
  maxRetries: 3,
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000, // Exponential backoff
  retryableStatusCodes: [408, 429, 502, 503, 504]
};

// Use in API call
const data = await enhancedApiClient.callEndpoint<ResponseType>(
  'endpointName',
  params,
  data,
  { retryConfig }
);
```

## Type Safety

### 1. Request Parameter Types

Define explicit interfaces for API parameters:

```typescript
export interface FetchIssuesOptions {
  limit?: number;
  cursor?: string;
  query?: string;
  projectId?: string;
  status?: string;
  sort?: string;
  environment?: string;
}

// Use in function signature
export const fetchIssues = async (
  options: FetchIssuesOptions = {}
): Promise<IssuesResponse> => {
  // Implementation
};
```

### 2. Response Types

Define explicit interfaces for API responses:

```typescript
export interface Issue {
  id: string;
  title: string;
  count: number;
  status: string;
  firstSeen: string;
  lastSeen: string;
  project: {
    id: string;
    name: string;
    slug?: string;
  };
}

export interface IssuesResponse {
  issues: Issue[];
  links?: {
    previous?: { cursor: string };
    next?: { cursor: string };
  };
}
```

### 3. Response Validation with Zod

Use Zod for runtime validation of API responses:

```typescript
import { z } from 'zod';

// Define schema
const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  count: z.number(),
  status: z.string(),
  firstSeen: z.string().datetime(),
  lastSeen: z.string().datetime(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().optional()
  })
});

const issuesResponseSchema = z.object({
  issues: z.array(issueSchema),
  links: z.object({
    previous: z.object({ cursor: z.string() }).optional(),
    next: z.object({ cursor: z.string() }).optional()
  }).optional()
});

// Infer types from schema
type Issue = z.infer<typeof issueSchema>;
type IssuesResponse = z.infer<typeof issuesResponseSchema>;

// Validate response
const response = await apiClient.get('/issues');
try {
  const validatedResponse = issuesResponseSchema.parse(response);
  return validatedResponse;
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle validation error
    console.error('Invalid API response format:', error.errors);
  }
  throw error;
}
```

## Performance Optimization

### 1. Response Caching

Cache API responses to reduce duplicate requests:

```typescript
// Enable caching with options
apiClient.updateOptimizations({
  enableCaching: true,
  cacheOptions: {
    ttl: 5 * 60 * 1000, // 5 minutes
    storage: 'localStorage'
  }
});

// Cache is automatically used for GET requests
const data = await apiClient.get<ResponseType>('/endpoint');

// Manual cache invalidation when needed
apiClient.invalidateCache('/endpoint');
```

### 2. Request Deduplication

Prevent duplicate in-flight requests:

```typescript
// Enable deduplication
apiClient.updateOptimizations({
  enableDeduplication: true
});

// Duplicate requests to the same URL are combined
const [response1, response2] = await Promise.all([
  apiClient.get('/endpoint'),
  apiClient.get('/endpoint') // This won't trigger a second network request
]);
```

### 3. Request Batching

Batch multiple requests into a single network call:

```typescript
// Enable batching
apiClient.updateOptimizations({
  enableBatching: true
});

// Batch multiple GET requests
const [users, projects, issues] = await apiClient.batchGet([
  '/users',
  '/projects',
  '/issues'
]);
```

## Testing Strategies

### 1. Mock API Responses

Use MSW (Mock Service Worker) for API mocking:

```typescript
// In test setup
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/issues', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        issues: [
          { id: '1', title: 'Test Issue', status: 'open' }
        ]
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 2. Unit Testing API Modules

Test API modules with mocked responses:

```typescript
import { fetchIssues } from './issuesApi';

describe('issuesApi', () => {
  it('should fetch issues successfully', async () => {
    // Test implementation
    const result = await fetchIssues({ limit: 10 });
    
    // Assertions
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].id).toBe('1');
  });
  
  it('should handle API errors', async () => {
    // Override handler for this test
    server.use(
      rest.get('/api/issues', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    // Test implementation and assertion
    await expect(fetchIssues()).rejects.toThrow();
  });
});
```

### 3. Component Integration Testing

Test components that use API hooks:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import IssuesList from './IssuesList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('IssuesList', () => {
  it('should render issues from API', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <IssuesList />
      </QueryClientProvider>
    );
    
    // Wait for API call to resolve
    await waitFor(() => {
      expect(screen.getByText('Test Issue')).toBeInTheDocument();
    });
  });
});
```

## Implementation Examples

### Basic API Module

```typescript
// issuesApi.ts
import { enhancedApiClient } from './enhancedApiClient';
import { createErrorHandler } from '../utils/errorHandling';
import { z } from 'zod';

// Types
export interface FetchIssuesOptions {
  limit?: number;
  cursor?: string;
  query?: string;
  projectId?: string;
  status?: string;
}

// Schemas
const issueSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string()
});

const issuesResponseSchema = z.object({
  issues: z.array(issueSchema),
  links: z.object({
    previous: z.object({ cursor: z.string() }).optional(),
    next: z.object({ cursor: z.string() }).optional()
  }).optional()
});

// Type inference
export type Issue = z.infer<typeof issueSchema>;
export type IssuesResponse = z.infer<typeof issuesResponseSchema>;

// Error handler
const handleIssuesError = createErrorHandler('Issues API Error', {
  context: { apiModule: 'issuesApi' }
});

// API methods
export const fetchIssues = async (
  options: FetchIssuesOptions = {}
): Promise<IssuesResponse> => {
  try {
    // Transform options to API parameters
    const params = {
      organization_slug: 'my-org',
      project_slug: 'my-project',
      limit: options.limit,
      cursor: options.cursor,
      query: options.query,
      status: options.status
    };
    
    // Make API call
    const response = await enhancedApiClient.callEndpoint(
      'listIssues',
      params
    );
    
    // Validate response
    const validatedResponse = issuesResponseSchema.parse(response);
    return validatedResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation error
      handleIssuesError(new Error('Invalid API response format'), {
        operation: 'fetchIssues',
        validationErrors: error.errors,
        ...options
      });
    } else {
      // Handle API error
      handleIssuesError(error, {
        operation: 'fetchIssues',
        ...options
      });
    }
    throw error;
  }
};

export default {
  fetchIssues
};
```

### React Query Hook

```typescript
// useIssues.ts
import { useQuery, useMutation, UseQueryOptions } from '@tanstack/react-query';
import { fetchIssues, FetchIssuesOptions, IssuesResponse, Issue } from '../api/issuesApi';

// Query key factory
const issuesKeys = {
  all: ['issues'] as const,
  lists: () => [...issuesKeys.all, 'list'] as const,
  list: (filters: FetchIssuesOptions) => [...issuesKeys.lists(), filters] as const,
  details: () => [...issuesKeys.all, 'detail'] as const,
  detail: (id: string) => [...issuesKeys.details(), id] as const,
};

// Hooks
export const useIssues = (
  options: FetchIssuesOptions = {},
  queryOptions?: UseQueryOptions<IssuesResponse>
) => {
  return useQuery({
    queryKey: issuesKeys.list(options),
    queryFn: () => fetchIssues(options),
    ...queryOptions
  });
};

export const useUpdateIssueStatus = () => {
  return useMutation({
    mutationFn: ({ issueId, status }: { issueId: string; status: string }) => 
      updateIssueStatus(issueId, status),
    onSuccess: (data, variables) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: issuesKeys.detail(variables.issueId) });
      queryClient.invalidateQueries({ queryKey: issuesKeys.lists() });
    }
  });
};
```

## Migration Guidelines

### From Legacy API to Consolidated API

1. **Step 1: Identify Existing API Usage**
   ```typescript
   // Old approach
   import apiClient from './apiClient';
   
   const fetchData = async () => {
     const response = await apiClient.get('/issues');
     return response.data;
   };
   ```

2. **Step 2: Create TypeScript Interfaces**
   ```typescript
   export interface Issue {
     id: string;
     title: string;
     status: string;
   }
   
   export interface IssuesResponse {
     issues: Issue[];
   }
   ```

3. **Step 3: Update Import and Implementation**
   ```typescript
   // New approach
   import { enhancedApiClient } from './enhancedApiClient';
   
   const fetchData = async (): Promise<IssuesResponse> => {
     return await enhancedApiClient.callEndpoint<IssuesResponse>(
       'listIssues',
       { organization_slug: 'my-org', project_slug: 'my-project' }
     );
   };
   ```

4. **Step 4: Add Error Handling**
   ```typescript
   const fetchData = async (): Promise<IssuesResponse> => {
     try {
       return await enhancedApiClient.callEndpoint<IssuesResponse>(
         'listIssues',
         { organization_slug: 'my-org', project_slug: 'my-project' }
       );
     } catch (error) {
       handleApiError(error, {
         operation: 'fetchData'
       });
       throw error;
     }
   };
   ```

## Troubleshooting

### Common Issues and Solutions

1. **"Unknown Endpoint" Error**
   - **Cause**: The endpoint name doesn't exist in path mappings
   - **Solution**: Check the endpoint name against available endpoints using `apiPathManager.listEndpoints()`

2. **"Missing Required Parameters" Error**
   - **Cause**: Required path parameters are missing
   - **Solution**: Check the required parameters using `apiPathManager.getEndpoint('endpointName')`

3. **Typescript Type Errors**
   - **Cause**: Response type doesn't match expected interface
   - **Solution**: Use Zod for runtime validation and update interface definitions

4. **Network Errors Not Retrying**
   - **Cause**: Retry configuration not properly set
   - **Solution**: Check retry configuration and ensure appropriate error codes are included

5. **Cache Not Working**
   - **Cause**: Caching might be disabled or TTL expired
   - **Solution**: Check cache configuration and TTL settings

### Debugging Techniques

1. **Enable Debug Logging**
   ```typescript
   import { setDebugLevel } from '../utils/logger';
   
   // Enable verbose logging for API requests
   setDebugLevel('api', 'verbose');
   ```

2. **Inspect API Requests**
   ```typescript
   const debugApiCall = async () => {
     const client = apiClient.getAxiosInstance();
     client.interceptors.request.use(request => {
       console.log('Request:', request);
       return request;
     });
   };
   ```

3. **Test Endpoint Resolution**
   ```typescript
   const testEndpoint = (name, params) => {
     try {
       const endpoint = apiPathManager.getEndpoint(name);
       if (!endpoint) {
         console.error(`Endpoint "${name}" not found`);
         return;
       }
       
       console.log('Endpoint:', endpoint);
       console.log('Resolved Path:', endpoint.resolveBackendPath(params));
       
       const validation = apiPathManager.validateParams(name, params);
       console.log('Validation:', validation);
     } catch (error) {
       console.error('Error:', error);
     }
   };
   ```

## Conclusion

Following these guidelines will ensure consistent API implementation across the Dexter project. The consolidated API architecture provides a robust foundation for type-safe, maintainable, and performant API integrations.

For any questions or issues, please refer to the troubleshooting section or contact the development team.