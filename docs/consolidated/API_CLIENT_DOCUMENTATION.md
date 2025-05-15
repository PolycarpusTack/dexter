# Dexter API Client Documentation

## Overview

The Dexter API client architecture provides a robust, type-safe way to interact with both the Dexter backend API and the Sentry API. It offers a unified approach to API access, error handling, and data validation.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Components](#core-components)
3. [API Configuration](#api-configuration)
4. [Error Handling](#error-handling)
5. [Path Resolution](#path-resolution)
6. [React Hooks](#react-hooks)
7. [API Modules](#api-modules)
8. [Code Examples](#code-examples)
9. [Best Practices](#best-practices)
10. [Migration Guide](#migration-guide)

## Architecture

The API client architecture follows a layered approach:

```
┌─────────────────┐
│  React Hooks    │
└────────┬────────┘
         │
┌────────▼────────┐
│  API Modules    │
└────────┬────────┘
         │
┌────────▼────────┐
│ Enhanced Client │
└────────┬────────┘
         │
┌────────▼────────┐
│  Path Resolver  │
└────────┬────────┘
         │
┌────────▼────────┐
│ API Config      │
└─────────────────┘
```

Each layer serves a specific purpose:

- **React Hooks**: Provides React-specific functionality for data fetching, state management, and component integration.
- **API Modules**: Implements domain-specific API methods (issues, events, etc.) with proper typing and validation.
- **Enhanced Client**: Handles HTTP requests, caching, retries, and error handling.
- **Path Resolver**: Resolves API paths with parameter substitution and validation.
- **API Config**: Defines API endpoints, methods, and paths.

## Core Components

### Enhanced API Client

The `EnhancedApiClient` is the central component of the architecture. It provides:

- HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Request caching with TTL and ETag support
- Request deduplication to avoid duplicate in-flight requests
- Automatic retries with exponential backoff
- Structured error handling

```typescript
import { apiClient } from '@/api/unified';

// Direct API access
const data = await apiClient.get('/api/endpoint');

// Path-aware API access
const issues = await apiClient.callEndpoint(
  'issues',
  'list',
  { organization_slug: 'org1', project_slug: 'proj1' }
);
```

### API Modules

API modules provide domain-specific methods for interacting with the API. They include:

- Type definitions for request parameters and responses
- Zod validation schemas for runtime type checking
- Proper error handling with context
- Normalization of response data

```typescript
import { api } from '@/api/unified';

// Get a list of issues
const issues = await api.issues.getIssues({
  organizationSlug: 'org1',
  projectSlug: 'proj1',
  status: 'unresolved'
});

// Get a single issue
const issue = await api.issues.getIssue('org1', '123');

// Update an issue
await api.issues.updateIssue('org1', '123', { status: 'resolved' });
```

### Path Resolver

The path resolver handles the translation of endpoint names and parameters into actual API paths. It provides:

- Parameter validation to ensure required parameters are provided
- URL encoding of parameter values
- Error handling for invalid paths
- Support for path templates with placeholders

```typescript
import { utils } from '@/api/unified';

// Check if parameters are valid
const validation = utils.validateParams('issues', 'list', {
  organization_slug: 'org1',
  project_slug: 'proj1'
});

if (validation.isValid) {
  // Resolve the path
  const path = utils.resolvePath('issues', 'list', {
    organization_slug: 'org1',
    project_slug: 'proj1'
  });
  // Result: '/organizations/org1/projects/proj1/issues'
}
```

## API Configuration

The API configuration defines all available endpoints, their paths, methods, and parameters. It uses a hierarchical structure:

```typescript
const apiConfig = {
  baseUrl: 'http://api.example.com',
  categories: {
    issues: {
      basePath: '/organizations/{organization_slug}/projects/{project_slug}',
      endpoints: {
        list: {
          name: 'listIssues',
          path: '/issues',
          method: HttpMethod.GET,
          description: 'List project issues',
          requiresAuth: true,
          cacheTTL: 300, // 5 minutes
        },
        // Other endpoints...
      }
    },
    // Other categories...
  }
};
```

Each endpoint defines:

- **name**: A unique identifier for the endpoint
- **path**: The path template with placeholder parameters
- **method**: The HTTP method (GET, POST, PUT, DELETE, PATCH)
- **description**: A description of the endpoint
- **requiresAuth**: Whether authentication is required
- **cacheTTL**: Cache time-to-live in seconds (optional)

## Error Handling

The API client includes a comprehensive error handling system:

- **Error Categories**: Network, authentication, server, client, validation, and rate limiting errors
- **Error Factory**: Creates structured error objects with appropriate metadata
- **Error Handler**: Provides context-aware error handling with notifications
- **Retryable Errors**: Automatically retries transient errors with exponential backoff

```typescript
import { ErrorFactory, createErrorHandler } from '@/api/unified';

// Create a module-specific error handler
const handleIssuesError = createErrorHandler({
  module: 'IssuesAPI',
  showNotifications: true,
  logToConsole: true
});

try {
  // Make API call
  const response = await apiClient.get('/issues');
} catch (error) {
  // Handle error with context
  handleIssuesError(error, {
    operation: 'getIssues',
    context: { organizationSlug, projectSlug }
  });
}
```

## Path Resolution

The path resolver maps between endpoint names, parameters, and actual API paths:

1. **Path Templates**: Endpoints are defined with path templates (e.g., `/users/{user_id}`)
2. **Parameter Substitution**: Parameters are substituted into the templates
3. **URL Encoding**: Parameter values are URL encoded
4. **Validation**: Parameters are validated to ensure required ones are provided

Example path resolution flow:

```
Endpoint: 'issues.list'
Parameters: { organization_slug: 'org1', project_slug: 'proj1' }

Category Base Path: '/organizations/{organization_slug}/projects/{project_slug}'
⬇️ (Replace parameters)
'/organizations/org1/projects/proj1'

Endpoint Path: '/issues'
⬇️ (Combine)
Final Path: '/organizations/org1/projects/proj1/issues'
```

## React Hooks

React hooks provide component-friendly access to API functionality:

- **Data Fetching**: Query hooks for fetching data with caching and refetching
- **Data Mutation**: Mutation hooks for modifying data with optimistic updates
- **Error Handling**: Automatic error handling with notifications
- **Loading States**: Loading states for UI feedback

```typescript
import { hooks } from '@/api/unified';

// Component using hooks
function IssuesList() {
  // Fetch issues
  const { data, isLoading, error } = hooks.useIssues({
    organizationSlug: 'org1',
    projectSlug: 'proj1',
    status: 'unresolved'
  });

  // Update an issue
  const updateIssueMutation = hooks.useUpdateIssue();
  
  // Handle click
  const handleResolve = (issueId) => {
    updateIssueMutation.mutate({
      organizationSlug: 'org1',
      issueId,
      data: { status: 'resolved' }
    });
  };
  
  // Render component
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <ul>
      {data.items.map(issue => (
        <li key={issue.id}>
          {issue.title}
          <button onClick={() => handleResolve(issue.id)}>
            Resolve
          </button>
        </li>
      ))}
    </ul>
  );
}
```

## API Modules

The unified API client includes several API modules for different domains:

### Issues API

The Issues API provides methods for working with Sentry issues:

```typescript
import { api } from '@/api/unified';

// Get a list of issues
const issues = await api.issues.getIssues({
  organizationSlug: 'org1',
  projectSlug: 'proj1'
});

// Get issue details
const issue = await api.issues.getIssue('org1', 'issue-id');

// Update an issue
await api.issues.updateIssue('org1', 'issue-id', {
  status: 'resolved',
  assignee: 'user-id'
});

// Bulk update issues
await api.issues.bulkUpdateIssues({
  organizationSlug: 'org1',
  projectSlug: 'proj1',
  issueIds: ['issue-1', 'issue-2'],
  data: { status: 'resolved' }
});

// Convenience methods
await api.issues.resolveIssue('org1', 'issue-id');
await api.issues.ignoreIssue('org1', 'issue-id');
await api.issues.assignIssue('org1', 'issue-id', 'user-id');
```

### Events API

The Events API provides methods for working with Sentry events:

```typescript
import { api } from '@/api/unified';

// Get a list of events
const events = await api.events.getEvents({
  organizationSlug: 'org1',
  projectSlug: 'proj1',
  query: 'error.type:TypeError'
});

// Get event details
const event = await api.events.getEvent('org1', 'proj1', 'event-id');

// Get event tags
const tags = await api.events.getEventTags('org1', 'proj1', 'event-id');

// Get related events for an issue
const relatedEvents = await api.events.getRelatedEvents('org1', 'issue-id');

// Get latest event for an issue
const latestEvent = await api.events.getLatestEvent('org1', 'issue-id');
```

### Discover API

The Discover API provides methods for custom queries:

```typescript
import { api, DiscoverQuery } from '@/api/unified';

// Execute a discover query
const query: DiscoverQuery = {
  field: ['transaction', 'count()'],
  query: 'event.type:transaction',
  orderby: '-count'
};

const results = await api.discover.executeQuery({
  organizationSlug: 'org1',
  query
});

// Get saved queries
const savedQueries = await api.discover.getSavedQueries({
  organizationSlug: 'org1'
});

// Save a query
await api.discover.saveQuery(
  'org1',
  'High Error Transactions',
  query,
  true // isPublic
);
```

### Alerts API

The Alerts API provides methods for working with alert rules:

```typescript
import { api } from '@/api/unified';

// Get a list of alert rules
const rules = await api.alerts.getAlertRules('org1');

// Get alert rule details
const rule = await api.alerts.getAlertRule('org1', 'rule-id');

// Create alert rule
const newRule = await api.alerts.createAlertRule('org1', {
  name: 'High Error Rate',
  conditions: [
    { type: 'error_count', value: 100 }
  ],
  actions: [
    { type: 'email', targetIdentifier: 'team@example.com' }
  ]
});

// Update alert rule
await api.alerts.updateAlertRule('org1', 'rule-id', {
  status: 'disabled'
});

// Delete alert rule
await api.alerts.deleteAlertRule('org1', 'rule-id');
```

### AI API

The AI API provides methods for AI-powered error analysis:

```typescript
import { api } from '@/api/unified';

// Get available models
const models = await api.ai.getModels();

// Get error explanation for an event
const explanation = await api.ai.explainErrorByEventId(
  'event-id',
  'model-id'
);

// Get error explanation for an issue
const explanation = await api.ai.explainErrorByIssueId('issue-id');

// Get error explanation for text
const explanation = await api.ai.explainErrorText(
  'TypeError: Cannot read property "x" of undefined',
  'at Component.render (/app/src/components/Example.js:42:5)'
);
```

## Code Examples

### Basic API Call

```typescript
import { apiClient } from '@/api/unified';

async function fetchData() {
  try {
    // Make API call
    const data = await apiClient.get('/api/data');
    
    // Use data
    console.log(data);
  } catch (error) {
    console.error('API call failed:', error);
  }
}
```

### Using API Module

```typescript
import { api } from '@/api/unified';

async function fetchIssues(organizationSlug, projectSlug) {
  try {
    // Use API module
    const issues = await api.issues.getIssues({
      organizationSlug,
      projectSlug,
      status: 'unresolved'
    });
    
    // Use data
    return issues;
  } catch (error) {
    console.error('Failed to fetch issues:', error);
    throw error;
  }
}
```

### Using React Hooks

```tsx
import React from 'react';
import { hooks } from '@/api/unified';

function IssuesList({ organizationSlug, projectSlug }) {
  // Fetch issues
  const { 
    data, 
    isLoading, 
    error,
    refetch
  } = hooks.useIssues({
    organizationSlug,
    projectSlug,
    status: 'unresolved'
  });
  
  // Update issue mutation
  const updateIssue = hooks.useUpdateIssue();
  
  // Handle resolve
  const handleResolve = (issueId) => {
    updateIssue.mutate({
      organizationSlug,
      issueId,
      data: { status: 'resolved' }
    }, {
      onSuccess: () => {
        // Refetch issues after successful update
        refetch();
      }
    });
  };
  
  // Render component
  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return (
    <div>
      <h2>Issues</h2>
      <ul>
        {data.items.map(issue => (
          <li key={issue.id}>
            {issue.title}
            <button 
              onClick={() => handleResolve(issue.id)}
              disabled={updateIssue.isLoading}
            >
              Resolve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Error Handling

```typescript
import { utils, ErrorCategory } from '@/api/unified';

// Create custom error handler
const handleError = utils.createErrorHandler({
  module: 'MyComponent',
  showNotifications: true,
  logToConsole: true
});

try {
  // Make API call
  const data = await api.issues.getIssues({
    organizationSlug: 'org1',
    projectSlug: 'proj1'
  });
} catch (error) {
  // Handle with context
  handleError(error, {
    operation: 'fetchIssues',
    context: { organizationSlug: 'org1', projectSlug: 'proj1' }
  });
  
  // Or handle based on category
  if (error.category === ErrorCategory.AUTH) {
    // Handle authentication error
  } else if (error.category === ErrorCategory.NETWORK) {
    // Handle network error
  } else if (error.category === ErrorCategory.SERVER) {
    // Handle server error
  }
}
```

## Best Practices

### 1. Use API Modules for Domain-Specific Logic

Prefer using the API modules (e.g., `api.issues`, `api.events`) over direct client access. They provide:

- Type-safe parameters and responses
- Validation of data
- Consistent error handling
- Domain-specific methods

```typescript
// Good
import { api } from '@/api/unified';
const issues = await api.issues.getIssues({ organizationSlug, projectSlug });

// Avoid direct access when possible
import { apiClient } from '@/api/unified';
const issues = await apiClient.get('/organizations/.../issues');
```

### 2. Leverage React Hooks for Components

Use the provided React hooks for component integration:

- They handle loading and error states
- They provide automatic cache invalidation
- They integrate with React Query for optimizations

```tsx
// Good
import { hooks } from '@/api/unified';

function IssuesList() {
  const { data, isLoading, error } = hooks.useIssues({
    organizationSlug: 'org1',
    projectSlug: 'proj1'
  });
  
  // ...
}

// Avoid direct API calls in components
import { api } from '@/api/unified';

function IssuesList() {
  const [issues, setIssues] = useState([]);
  const [isLoading, setLoading] = useState(true);
  
  useEffect(() => {
    api.issues.getIssues({
      organizationSlug: 'org1',
      projectSlug: 'proj1'
    }).then(data => {
      setIssues(data.items);
      setLoading(false);
    });
  }, []);
  
  // ...
}
```

### 3. Proper Error Handling

Always handle errors appropriately:

- Use the error handler to provide context
- Show notifications for user-facing errors
- Log errors for debugging
- Use try/catch blocks to prevent silent failures

```typescript
import { utils } from '@/api/unified';

const handleError = utils.createErrorHandler({
  module: 'MyModule',
  showNotifications: true
});

try {
  // Make API call
} catch (error) {
  handleError(error, {
    operation: 'myOperation',
    context: { additionalData }
  });
}
```

### 4. Type Safety with Zod Validation

Use Zod schemas to validate API responses:

- They enforce type safety at runtime
- They provide clear error messages for invalid data
- They help catch API changes early

```typescript
import { z } from 'zod';

// Define schema
const responseSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number()
});

// Validate response
try {
  const validatedData = responseSchema.parse(responseData);
  return validatedData;
} catch (error) {
  console.warn('Response validation failed:', error);
  // Return unvalidated data as fallback
  return responseData;
}
```

## Migration Guide

If you're migrating from the old API client to the new unified architecture, follow these steps:

### 1. Import from the Unified API

Replace old imports with the new unified ones:

```typescript
// Old
import { fetchIssues } from '@/api/issuesApi';
import { useIssues } from '@/hooks/useIssues';

// New
import { api, hooks } from '@/api/unified';
// Then use api.issues.getIssues and hooks.useIssues
```

### 2. Update Method Names and Parameters

Adjust method names and parameters to match the new API:

```typescript
// Old
const issues = await fetchIssues({
  organizationId: 'org1',
  projectId: 'proj1',
  statusFilter: 'unresolved',
  searchTerm: 'error'
});

// New
const issues = await api.issues.getIssues({
  organizationSlug: 'org1',
  projectSlug: 'proj1',
  status: 'unresolved',
  query: 'error'
});
```

### 3. Update React Hooks

Replace old hooks with the new ones:

```typescript
// Old
import { useIssuesList } from '@/hooks/useIssues';

const { issues, loading, error } = useIssuesList({
  orgId: 'org1',
  projectId: 'proj1'
});

// New
import { hooks } from '@/api/unified';

const { data, isLoading, error } = hooks.useIssues({
  organizationSlug: 'org1',
  projectSlug: 'proj1'
});

// Access issues via data.items
const issues = data?.items || [];
```

### 4. Update Error Handling

Replace old error handling with the new approach:

```typescript
// Old
try {
  await api.doSomething();
} catch (error) {
  handleApiError(error);
}

// New
import { utils } from '@/api/unified';

const handleApiError = utils.createErrorHandler({
  module: 'MyComponent',
  showNotifications: true
});

try {
  await api.issues.getIssue('org1', 'issue-id');
} catch (error) {
  handleApiError(error, {
    operation: 'getIssue',
    context: { organizationSlug: 'org1', issueId: 'issue-id' }
  });
}
```

### 5. Replace Direct Client Access

Replace direct client access with API modules:

```typescript
// Old
import apiClient from '@/api/apiClient';
const data = await apiClient.get('/api/endpoint');

// New
import { api } from '@/api/unified';
const issues = await api.issues.getIssues({
  organizationSlug: 'org1',
  projectSlug: 'proj1'
});
```

---

## Conclusion

The unified API client architecture provides a robust, type-safe, and maintainable way to interact with APIs in the Dexter application. By following the patterns and best practices outlined in this documentation, you can ensure consistent and reliable API access throughout the application.