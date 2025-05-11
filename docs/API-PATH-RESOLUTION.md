# API Path Resolution System

## Overview

The API Path Resolution System provides a centralized configuration for managing API endpoint paths across the Dexter application. This system ensures consistency between frontend, backend, and Sentry API paths while providing features like parameter validation, caching configuration, and automatic path resolution.

## Architecture

```
Frontend                   Backend                    Sentry API
   │                         │                           │
   │                         │                           │
   └─── API Path Manager ───┴─── Path Mappings ────────┘
           (Central Configuration)
```

## Components

### 1. Path Mappings Configuration

Located in:
- Backend: `backend/app/config/api/path_mappings.py`
- Frontend: `frontend/src/config/api/pathMappings.ts`

Defines all API endpoints with:
- Frontend path pattern
- Backend path pattern
- Sentry API path pattern
- HTTP method
- Path parameters
- Query parameters
- Cache TTL
- Authentication requirements

### 2. Path Resolver Service (Backend)

Located in: `backend/app/services/path_resolver_service.py`

Features:
- Path pattern matching
- Parameter extraction
- URL building
- Parameter validation
- Cache TTL lookup

### 3. Enhanced Sentry Client (Backend)

Located in: `backend/app/services/enhanced_sentry_client.py`

Features:
- Uses path resolver for all API calls
- Standardized error handling
- Automatic pagination support
- Request/response logging

### 4. Enhanced API Client (Frontend)

Located in: `frontend/src/api/enhancedApiClient.ts`

Features:
- Path resolution for API calls
- Type-safe endpoint calling
- Automatic parameter validation
- Retry configuration

## Usage Examples

### Backend Usage

```python
from app.services.enhanced_sentry_client import EnhancedSentryClient

# Using the enhanced client
client = EnhancedSentryClient()

# Call an endpoint by name
result = await client.call_endpoint('list_issues', {
    'organization_slug': 'my-org',
    'project_slug': 'my-project',
    'status': 'unresolved'
})

# Or use convenience methods
issues = await client.list_project_issues(
    organization_slug='my-org',
    project_slug='my-project',
    status='unresolved'
)
```

### Frontend Usage

```typescript
import { enhancedApiClient } from '@/api/enhancedApiClient';

// Call an endpoint by name
const result = await enhancedApiClient.callEndpoint('listIssues', {
  organization_slug: 'my-org',
  project_slug: 'my-project',
  status: 'unresolved'
});

// Or use convenience methods
const issues = await enhancedApiClient.listIssues({
  organization_slug: 'my-org',
  project_slug: 'my-project',
  status: 'unresolved'
});
```

## Adding New Endpoints

### 1. Add to Path Mappings

Backend (`path_mappings.py`):
```python
"new_endpoint": ApiEndpoint(
    name="new_endpoint",
    frontend_path="/api/v1/new-endpoint/{id}",
    backend_path="/organizations/{organization_slug}/new-endpoint/{id}",
    sentry_path="/api/0/new-endpoint/{id}/",
    method=HttpMethod.GET,
    path_params=["organization_slug", "id"],
    query_params=["filter", "sort"],
    cache_ttl=300,
    description="Description of the new endpoint"
)
```

Frontend (`pathMappings.ts`):
```typescript
newEndpoint: new ApiEndpointConfig(
  'newEndpoint',
  '/api/v1/new-endpoint/{id}',
  '/organizations/{organization_slug}/new-endpoint/{id}',
  '/api/0/new-endpoint/{id}/',
  HttpMethod.GET,
  ['organization_slug', 'id'],
  ['filter', 'sort'],
  true,
  300,
  'Description of the new endpoint'
)
```

### 2. Add to Backend Router

```python
@router.get(
    "/{organization_slug}/new-endpoint/{id}",
    response_model=Dict[str, Any],
    summary="Get New Endpoint",
    description="Description of the new endpoint"
)
async def get_new_endpoint(
    organization_slug: str,
    id: str,
    filter: Optional[str] = None,
    sort: Optional[str] = None,
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client)
):
    params = {
        'organization_slug': organization_slug,
        'id': id,
        'filter': filter,
        'sort': sort
    }
    
    return await sentry_client.call_endpoint('new_endpoint', params)
```

### 3. Add Frontend Convenience Method

```typescript
// In enhancedApiClient.ts
async getNewEndpoint(params: {
  organization_slug: string;
  id: string;
  filter?: string;
  sort?: string;
}, options?: ApiCallOptions) {
  return this.callEndpoint('newEndpoint', params, undefined, options);
}
```

## Migration Guide

### From Old API Client to Enhanced Client

#### Backend Migration

Before:
```python
# Direct Sentry API call
url = f"{self.base_url}/projects/{org}/{project}/issues/"
response = await self.client.get(url, headers=self.headers, params=params)
```

After:
```python
# Using enhanced client
result = await self.call_endpoint('list_issues', {
    'organization_slug': org,
    'project_slug': project,
    **params
})
```

#### Frontend Migration

Before:
```typescript
// Direct API call
const response = await apiClient.get(
  `/organizations/${org}/projects/${project}/issues`,
  { params }
);
```

After:
```typescript
// Using enhanced client
const response = await enhancedApiClient.listIssues({
  organization_slug: org,
  project_slug: project,
  ...params
});
```

## Benefits

1. **Centralized Configuration**: All API paths are defined in one place
2. **Type Safety**: Full TypeScript support with generated types
3. **Parameter Validation**: Automatic validation of required parameters
4. **Path Resolution**: No more manual string interpolation
5. **Cache Configuration**: Centralized cache TTL management
6. **Error Handling**: Standardized error handling across all endpoints
7. **Documentation**: Self-documenting API configuration

## Performance Considerations

- Path resolution is done in-memory and is very fast
- Cache TTLs are centrally managed for optimal performance
- Request deduplication prevents duplicate API calls
- Retry logic is built into the enhanced clients

## Security

- All endpoints require authentication by default
- Path parameters are automatically validated
- Query parameters are properly encoded
- Sensitive data is never logged

## Troubleshooting

### Common Issues

1. **Unknown Endpoint Error**
   - Ensure the endpoint is defined in both backend and frontend path mappings
   - Check for typos in the endpoint name

2. **Missing Parameters Error**
   - Verify all required path parameters are provided
   - Check the parameter names match the configuration

3. **Path Resolution Failure**
   - Ensure path patterns match between frontend and backend
   - Verify parameter placeholders use correct syntax (`{param}`)

### Debugging

Enable debug logging:

Backend:
```python
import logging
logging.getLogger('app.services.path_resolver_service').setLevel(logging.DEBUG)
```

Frontend:
```typescript
// Set in browser console
localStorage.setItem('DEBUG', 'api:*');
```

## Future Enhancements

1. **Automatic OpenAPI Generation**: Generate OpenAPI spec from path mappings
2. **Request/Response Validation**: Add schema validation for all endpoints
3. **Metrics Collection**: Automatic performance metrics for each endpoint
4. **GraphQL Support**: Extend system to support GraphQL endpoints
5. **Dynamic Path Loading**: Load path mappings from external configuration
