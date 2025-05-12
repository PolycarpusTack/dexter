# API Path Configuration Migration Guide

This guide outlines the process for migrating from the old API path configuration system to the new unified system. The new system provides a more structured, maintainable approach to managing API endpoints with enhanced features.

## Why Migrate?

The new system offers several advantages:

1. **Centralized Configuration** - All API paths are defined in YAML files for easy maintenance
2. **Enhanced Features** - Support for HTTP methods, headers, caching policy, and more
3. **Better Organization** - Endpoints are grouped by category and functionality
4. **Type Safety** - Pydantic models ensure configuration integrity
5. **Documentation** - Built-in support for endpoint descriptions

## Migration Steps

### Step 1: Identify Current Usage

Find all places in your code that use the old path system:

```python
# Old pattern using the deprecated ApiPathConfig
from app.config.api_paths import api_paths

path = api_paths.ISSUES_LIST.resolve(org=org_slug, project=project_slug)
```

### Step 2: Update Imports

Replace old imports with new path resolver:

```python
# New pattern using path_resolver
from app.utils.path_resolver import resolve_path, get_full_url

# Option 1: Using the compatibility function (easier transition)
from app.utils.path_resolver import legacy_resolve_path

path = legacy_resolve_path("ISSUES_LIST", org=org_slug, project=project_slug)

# Option 2: Using the new system directly (recommended)
path = resolve_path("issues", "list", 
                    organization_slug=org_slug, 
                    project_slug=project_slug)

# Get complete URL including base URL
url = get_full_url("issues", "list", 
                  organization_slug=org_slug, 
                  project_slug=project_slug)
```

### Step 3: Update API Client Methods

Update your API client implementations to use the new system:

```python
# Old implementation
async def get_issues(self, org_slug, project_slug, **params):
    path = api_paths.ISSUES_LIST.resolve(org=org_slug, project=project_slug)
    url = f"{self.base_url}{path}"
    return await self._request("GET", url, params=params)

# New implementation
async def get_issues(self, org_slug, project_slug, **params):
    url = get_full_url(
        "issues", "list", 
        organization_slug=org_slug,
        project_slug=project_slug,
        sentry_base_url=self.base_url
    )
    return await self._request("GET", url, params=params)
```

### Step 4: Add New Endpoints

When adding new endpoints, define them in the appropriate YAML file:

1. Find or create the relevant YAML file in `backend/app/config/api/endpoints/`
2. Add the endpoint definition following the established pattern
3. Use the new endpoint in your code with `resolve_path()` or `get_full_url()`

Example:

```yaml
# In backend/app/config/api/endpoints/projects.yaml
version: "1.0"
base_url: "{sentry_base_url}"
categories:
  projects:
    name: "Projects"
    base_path: "/api/0/organizations/{organization_slug}"
    endpoints:
      list:
        path: "/projects/"
        method: "GET"
        description: "List organization projects"
        cache_ttl: 3600
```

```python
# In your code
url = get_full_url("projects", "list", 
                  organization_slug=org_slug,
                  sentry_base_url=settings.sentry_base_url)
```

## Backwards Compatibility

A compatibility layer is provided to ease migration:

- The old `api_paths.py` file is maintained but issues deprecation warnings
- The `legacy_resolve_path()` function maps old path keys to the new system
- All old paths continue to work but will be removed in a future version

## Migration Checklist

- [ ] Update all direct usages of `api_paths` to use the new system
- [ ] Update API client methods to use `get_full_url()`
- [ ] Add any missing endpoints to the YAML configuration files
- [ ] Update tests to use the new system
- [ ] Remove the compatibility layer once migration is complete

## Troubleshooting

If you encounter issues during migration:

1. Check that all required path parameters are provided with the correct names
2. Verify that the endpoint is defined in the YAML configuration
3. Check the logs for any warnings or errors from the path resolver
4. Use the `api_path_manager` directly to debug configuration issues:

```python
from app.config.api.path_mappings import api_path_manager

# Check if an endpoint exists
endpoint = api_path_manager.get_endpoint("category", "name")
print(endpoint)

# Debug path resolution
path = api_path_manager.resolve_path("category", "name", **params)
print(f"Resolved path: {path}")
```

## Timeline

- **Current Phase**: Dual systems with deprecation warnings
- **Next Release**: Migrate all core functionality 
- **Future Release**: Remove the old system entirely

Please complete your migration before the next major release to avoid disruption.
