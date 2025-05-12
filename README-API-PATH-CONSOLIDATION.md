# API Path Configuration Consolidation

## Overview

The Dexter project previously had two separate API path configuration systems, causing confusion and maintenance challenges. This update consolidates these systems into a single, more powerful configuration approach.

## What Changed

1. Implemented a YAML-based configuration system for API endpoints
2. Created a robust path resolution mechanism with parameter validation
3. Added deprecation warnings to the old system
4. Created a comprehensive migration guide for developers

## Directory Structure

```
backend/app/
├── config/
│   ├── api/
│   │   ├── __init__.py             # Initialization code
│   │   ├── models.py               # Pydantic models for configuration
│   │   ├── path_mappings.py        # Core path manager implementation
│   │   └── endpoints/              # YAML configuration files
│   │       ├── issues.yaml
│   │       ├── events.yaml
│   │       └── projects.yaml
│   ├── api_paths.py                # Legacy system (deprecated)
│   └── settings.py                 # Application settings
├── utils/
│   └── path_resolver.py            # Path resolution utilities
├── services/
│   └── sentry_client.py            # Updated API client
└── models/
    └── sentry.py                   # Data models
```

## Benefits

1. **Maintainability**: All API endpoints are defined in structured YAML files
2. **Type Safety**: Pydantic models ensure configuration integrity
3. **Feature-Rich**: Support for HTTP methods, caching policies, and more
4. **Extensibility**: Easy to add new endpoints and categories
5. **Backward Compatibility**: Old code continues to work with deprecation warnings

## How to Use

### Adding a New Endpoint

1. Find the appropriate YAML file in `backend/app/config/api/endpoints/`
2. Add your endpoint definition:

```yaml
categories:
  my_category:
    endpoints:
      my_endpoint:
        path: "/my-path/{param}/"
        method: "GET"
        description: "My endpoint description"
        cache_ttl: 300
```

3. Use the endpoint in your code:

```python
from app.utils.path_resolver import get_full_url

url = get_full_url("my_category", "my_endpoint", param="value", sentry_base_url=base_url)
```

### Migration from Old System

See the detailed migration guide in `docs/api_path_migration_guide.md`.

## Testing

Run tests for the new system:

```bash
pytest backend/tests/test_api_path_manager.py
```

## Next Steps

1. Migrate all existing code to the new system
2. Add integration tests
3. Remove the deprecated system in a future release
