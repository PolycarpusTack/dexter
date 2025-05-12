# Dexter Architecture Quick Reference

## 📝 Introduction

This quick reference guide provides essential information for working with Dexter's new consolidated architecture.

## 🚀 Running the Application

### Basic Usage

```bash
# Run with default mode
python -m app.main

# Run with specific mode using environment variable
set APP_MODE=debug && python -m app.main
```

### Available Modes

- `default` - Standard configuration
- `debug` - Enhanced logging and development features
- `minimal` - Reduced feature set for lighter resource usage
- `enhanced` - All features enabled with optimized settings
- `simplified` - Core features with simplified configuration

## ⚙️ Configuration System

### Configuration Sources (in order of precedence)

1. **Environment Variables** (highest priority)
2. **Mode-specific YAML** (`config/<mode>.yaml`)
3. **Base YAML** (`config/base.yaml`) 
4. **Default Values** in `AppSettings` class (lowest priority)

### Setting Configuration Values

#### Via Environment Variables

```bash
set APP_MODE=debug
set DEBUG=true
set LOG_LEVEL=DEBUG
set OLLAMA_MODEL=llama3
```

#### Via YAML Files

Edit the appropriate YAML file:

```yaml
# config/debug.yaml
DEBUG: true
LOG_LEVEL: DEBUG
ENABLE_REAL_TIME: true
```

## 🧩 Core Components

### Application Factory

```python
# Create an application instance with custom settings
from app.core.config import get_settings
from app.core.factory import create_app

settings = get_settings()
app = create_app(settings)
```

### Custom Logging

```python
import logging
from app.core.logging import setup_logging
from app.core.config import LogLevel

# Set up logging with custom level
setup_logging(LogLevel.DEBUG)

# Get a logger
logger = logging.getLogger(__name__)
logger.info("This is an info message")
logger.debug("This is a debug message")
```

### Middleware

Middleware is configured automatically based on the application mode. You can manually configure it:

```python
from app.core.middleware import setup_middlewares
from app.core.config import get_settings

settings = get_settings()
setup_middlewares(app, settings)
```

## 🔗 Working with Routers

### Including a Router

Routers are automatically included based on the module structure and feature flags.

To add a new router:

1. Create your router file in `app/routers/` with a variable named `router`
2. Update `app/routers/__init__.py` to include your router:

```python
# Add to _include_core_routers or _include_optional_routers
optional_routers = [
    # ... existing routers
    ("my_feature", "my-feature", settings.ENABLE_MY_FEATURE),
]
```

### Accessing Settings in Routers

```python
from fastapi import APIRouter, Depends
from app.core.config import AppSettings, get_settings

router = APIRouter()

@router.get("/")
async def my_endpoint(settings: AppSettings = Depends(get_settings)):
    """Endpoint that uses application settings."""
    return {
        "feature_enabled": settings.ENABLE_MY_FEATURE,
        "mode": settings.APP_MODE
    }
```

## 🧪 Testing

### Testing with Different Modes

```python
import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_with_specific_mode():
    # Set environment variable
    os.environ["APP_MODE"] = "minimal"
    
    # Create test client
    client = TestClient(app)
    
    # Test endpoint
    response = client.get("/")
    assert response.status_code == 200
```

### Testing Factory Function

```python
from app.core.config import AppMode, get_settings
from app.core.factory import create_app

def test_app_factory():
    # Set environment variable
    os.environ["APP_MODE"] = AppMode.DEBUG.value
    
    # Get settings
    settings = get_settings()
    
    # Create app
    app = create_app(settings)
    assert app is not None
```

## 🚨 Troubleshooting

### Common Issues

- **ImportError**: Make sure all dependencies are installed
- **Missing Features**: Check if the feature flag is enabled for your mode
- **Configuration Not Applied**: Verify environment variable names and YAML structure

### Logs

Logs are generated based on the `LOG_LEVEL` setting:
- Debug mode: Detailed debug logs
- Default mode: Info logs only
- Minimal mode: Warning and error logs only

### Diagnostic Endpoints

- `/` - Basic application information
- `/health` - Health check
- `/api/v1/diagnostics/errors` - Recent errors (if error handler is configured)

## 📚 Further Reading

- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Detailed migration information
- [ADOPTION_STRATEGY.md](ADOPTION_STRATEGY.md) - Phase-by-phase adoption plan
- [README_MIGRATION.md](README_MIGRATION.md) - Overview of the migration
