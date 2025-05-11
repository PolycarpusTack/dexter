# API Path Configuration System

## Overview

The API Path Configuration System provides a centralized way to manage API endpoints across the Dexter project. It ensures consistency between frontend routes, backend routes, and Sentry API endpoints.

## Architecture

The system consists of:

1. **Path Configuration Files**:
   - Backend: `backend/app/config/api_paths.py`
   - Frontend: `frontend/src/config/apiPaths.ts`

2. **Path Resolver Utilities**:
   - Backend: `backend/app/utils/path_resolver.py`
   - Frontend: `frontend/src/utils/pathResolver.ts`

## Features

### Path Templates

Paths use template syntax with placeholders:
```
/projects/{organization_slug}/{project_slug}/issues/
```

### Parameter Aliases

Common parameter mappings are automatically handled:
- `org` → `organization_slug`
- `project` → `project_slug`  
- `team` → `team_slug`

### Path Categories

Paths are organized by feature area:
- Issues
- Projects
- Organizations
- Teams
- Authentication

## Usage

### Frontend Usage

```typescript
import { API_PATHS, resolvePath, getPath } from '@/config/apiPaths';
import { PathResolver } from '@/utils/pathResolver';

// Get a path mapping
const issueDetailPath = getPath('issues', 'detail');

// Resolve a path with parameters
const resolvedPath = resolvePath(issueDetailPath.sentryPath, {
  id: '12345'
});
// Result: '/issues/12345/'

// Use PathResolver class directly
const url = PathResolver.resolve('/api/projects/{org}/{project}/issues/', {
  org: 'my-org',
  project: 'my-project'
});
// Result: '/api/projects/my-org/my-project/issues/'

// Build URL with query parameters
const urlWithParams = PathResolver.buildUrlWithParams('/api/issues', {
  status: 'resolved',
  sort: 'date'
});
// Result: '/api/issues?status=resolved&sort=date'
```

### Backend Usage

```python
from app.config.api_paths import ApiPathConfig
from app.utils.path_resolver import PathResolver

# Get a path mapping
issue_detail = ApiPathConfig.get_path('issues', 'detail')

# Resolve a path with parameters
resolved_path = PathResolver.resolve(issue_detail.sentry_path, id='12345')
# Result: '/issues/12345/'

# Extract parameters from a path
params = PathResolver.extract_parameters(
    '/api/projects/my-org/my-project/issues/',
    '/api/projects/{organization_slug}/{project_slug}/issues/'
)
# Result: {'organization_slug': 'my-org', 'project_slug': 'my-project'}

# Validate path parameters
is_valid, missing = PathResolver.validate_path_params(
    '/api/issues/{id}',
    {'id': '123'}
)
# Result: (True, [])
```

## Adding New Paths

To add a new API path:

1. Add the path mapping to both backend and frontend configuration files
2. Ensure the path follows consistent naming conventions
3. Include all three path types: frontend, backend, and sentry
4. Add appropriate documentation

Example:

### Backend (Python)
```python
"new_feature": PathMapping(
    frontend_path="/api/v1/features/{id}",
    backend_path="/api/features/{id}",
    sentry_path="/features/{id}/",
    method="GET",
    description="Get feature details"
)
```

### Frontend (TypeScript)
```typescript
newFeature: {
  frontendPath: '/api/v1/features/{id}',
  backendPath: '/api/features/{id}',
  sentryPath: '/features/{id}/',
  method: 'GET',
  description: 'Get feature details'
}
```

## Path Conventions

- Frontend paths use `/api/v1/` prefix
- Backend paths use `/api/` prefix
- Sentry paths match the official Sentry API structure
- Always include trailing slashes for Sentry API paths
- Use snake_case for Python operation names
- Use camelCase for TypeScript operation names

## Testing

The system includes comprehensive tests for path resolution:

```bash
# Run frontend tests
cd frontend
npm test src/utils/__tests__/pathResolver.test.ts

# Run backend tests (when implemented)
cd backend
pytest tests/test_path_resolver.py
```

## Migration Guide

To migrate existing API calls to use the new system:

1. Identify the current hardcoded path
2. Find or add the corresponding path mapping
3. Replace hardcoded path with path resolution
4. Update any query parameter handling

### Before:
```typescript
const url = `/api/0/issues/${issueId}/`;
```

### After:
```typescript
const mapping = getPath('issues', 'detail');
const url = resolvePath(mapping.sentryPath, { id: issueId });
```

## Environment Variables

The system supports environment-specific overrides:

- Frontend: `VITE_SENTRY_API_BASE`, `VITE_BACKEND_API_BASE`
- Backend: `SENTRY_API_BASE`

## Benefits

1. **Consistency**: Single source of truth for API paths
2. **Type Safety**: TypeScript interfaces ensure correct usage
3. **Maintainability**: Easy to update paths in one place
4. **Flexibility**: Support for environment-specific configurations
5. **Documentation**: Self-documenting path structure

## Next Steps

1. Implement backend unit tests for path resolver
2. Add support for WebSocket paths
3. Create migration scripts for existing code
4. Add path validation middleware
5. Implement path versioning support
