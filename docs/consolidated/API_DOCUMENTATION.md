# Dexter API Documentation

## Overview

This document provides comprehensive information about the API architecture, endpoints, and usage in the Dexter project. This consolidates information from multiple API-related documents.

## Table of Contents

1. [API Configuration](#api-configuration)
2. [API Path Resolution](#api-path-resolution)
3. [Type Generation](#type-generation)
4. [API Optimization](#api-optimization)
5. [Error Handling](#error-handling)
6. [Coverage and Visualization](#coverage-and-visualization)
7. [Debugging Guide](#debugging-guide)
8. [Example Usage](#example-usage)

## API Configuration

### Base Configuration

The API is configured through the following files:
- `frontend/src/config/apiConfig.ts` - Base configuration
- `frontend/src/config/apiPaths.ts` - Path definitions

### Environment Configuration

The API can be configured for different environments (development, staging, production) by setting the appropriate environment variables:

```
VITE_API_BASE_URL=https://api.example.com
VITE_API_VERSION=v1
```

## API Path Resolution

API paths are dynamically resolved based on the configured base URL and path templates. This allows for flexible path construction and parameter substitution.

### Path Template Format

Path templates use placeholders in the format `:paramName` which are replaced with actual values at runtime:

```typescript
// Template
const issueDetailPath = '/projects/:orgSlug/:projectSlug/issues/:issueId/';

// Usage
const resolvedPath = resolvePath(issueDetailPath, {
  orgSlug: 'my-org',
  projectSlug: 'my-project',
  issueId: '12345'
});
// Result: '/projects/my-org/my-project/issues/12345/'
```

### Query Parameters

Query parameters can be added to any API request:

```typescript
// Example
const params = { statsPeriod: '24h', environment: 'production' };
const url = buildUrl(basePath, params);
```

## Type Generation

The API types are automatically generated from the Sentry API OpenAPI/Swagger specification.

### Generation Process

1. The schema is fetched from `sentry-api.yaml`
2. Types are generated using `openapi-typescript`
3. Generated types are stored in `frontend/src/types/api/sentry-generated.ts`

### Usage Example

```typescript
import { Components } from 'src/types/api/sentry-generated';

// Using a generated type
type Issue = Components.Schemas.Issue;
```

## API Optimization

The API includes several optimization strategies:

1. **Request Batching**: Automatically combines multiple requests into batches
2. **Request Deduplication**: Prevents duplicate concurrent requests 
3. **Response Caching**: Caches responses based on configured TTL values
4. **Retry Management**: Automatically retries failed requests with backoff

### Implementation Details

Request batching is handled through the `requestBatcher.ts` utility. It queues requests and processes them in batches to reduce network overhead.

Request deduplication is managed by the `requestDeduplicator.ts` utility, which tracks in-flight requests and returns the same promise for identical requests.

## Error Handling

The API includes comprehensive error handling with:

1. Categorized error types
2. Human-readable error messages
3. Automatic retry for recoverable errors
4. Error tracking and logging

### Error Categories

- Network errors (connectivity issues)
- Authentication errors (403, 401)
- Rate limiting errors (429)
- Service errors (500, 502, 503)
- Client errors (400, 404, 422)

### Example Usage

```typescript
try {
  const data = await apiClient.get('/endpoint');
} catch (error) {
  if (isAuthError(error)) {
    // Handle authentication error
  } else if (isRateLimitError(error)) {
    // Handle rate limit
  } else {
    // Handle other errors
  }
}
```

## Coverage and Visualization

API coverage is tracked and visualized to ensure comprehensive implementation:

1. Endpoints covered
2. Request/response pairs tested
3. Error cases handled

### Visualization Tools

The API coverage visualization tool in `frontend/src/tools/api-coverage` provides:

- Heat maps for coverage
- Detailed endpoint implementation status
- Integration status tracking

## Debugging Guide

### Common Issues and Solutions

1. **Authentication Failures**
   - Check token validity
   - Verify correct scopes are assigned

2. **Rate Limiting**
   - Implement exponential backoff
   - Use request batching to reduce call frequency

3. **Path Resolution Errors**
   - Verify parameter names match the template
   - Check for missing required parameters

### Debugging Tools

The API includes built-in debugging tools:

- `apiDebugHelper.ts` for request/response logging
- `apiTesterConsole.js` for interactive API testing

## Example Usage

### Basic Usage

```typescript
import { apiClient } from 'src/api';

// GET request
const issues = await apiClient.get('/projects/org/project/issues/');

// POST request
const newIssue = await apiClient.post('/projects/org/project/issues/', {
  title: 'New Issue',
  description: 'Issue description'
});
```

### Advanced Usage

```typescript
import { apiClient } from 'src/api';

// With query parameters
const filteredIssues = await apiClient.get('/projects/org/project/issues/', {
  params: {
    statsPeriod: '24h',
    query: 'is:unresolved'
  }
});

// With custom headers
const response = await apiClient.get('/endpoint', {
  headers: {
    'Custom-Header': 'Value'
  }
});
```
