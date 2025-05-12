# Dexter Backend Migration Guide

This guide explains how to migrate from the multiple `main_*.py` files structure to the new consolidated architecture.

## Table of Contents

1. [Overview](#overview)
2. [Directory Structure](#directory-structure)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

## Overview

The new architecture consolidates the multiple `main_*.py` files (`main.py`, `main_debug.py`, `main_minimal.py`, `main_enhanced.py`, `main_simplified.py`) into a single entry point with a modular, configuration-driven approach. This provides several benefits:

- **Single source of truth** for application setup
- **Configuration-driven behavior** rather than code duplication
- **Consistent error handling** across all application modes
- **Improved maintainability** with clear separation of concerns
- **Enhanced logging and observability**

## Directory Structure

The new architecture follows this structure:

```
backend/
├── app/
│   ├── core/                  # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py          # Configuration management
│   │   ├── factory.py         # App factory functions
│   │   ├── logging.py         # Logging configuration
│   │   └── middleware.py      # Middleware definitions
│   ├── routers/               # API endpoints
│   │   ├── __init__.py        # Router setup
│   │   ├── events.py
│   │   ├── issues.py
│   │   └── ...
│   ├── __init__.py
│   └── main.py                # Single entry point
├── config/                    # Configuration files
│   ├── base.yaml              # Base configuration
│   ├── debug.yaml             # Debug mode overrides
│   ├── minimal.yaml           # Minimal mode overrides
│   ├── enhanced.yaml          # Enhanced mode overrides
│   └── simplified.yaml        # Simplified mode overrides
└── ...
```

## Step-by-Step Migration

### 1. Testing the New Architecture

Before completely replacing the existing main files, you can test the new architecture by using the new `main_new.py` file:

```bash
# Run with default mode
python -m app.main_new

# Run with specific mode
APP_MODE=debug python -m app.main_new
```

### 2. Replace the Existing Files

Once you've confirmed the new architecture works correctly, you can replace the existing files:

1. Save backups of your current main files:
   ```bash
   cp app/main.py app/main.py.bak
   cp app/main_debug.py app/main_debug.py.bak
   cp app/main_minimal.py app/main_minimal.py.bak
   cp app/main_enhanced.py app/main_enhanced.py.bak
   cp app/main_simplified.py app/main_simplified.py.bak
   ```

2. Update the main file to use the new factory:
   ```bash
   cp app/main_new.py app/main.py
   ```

3. Replace the old main files with shims that use the new architecture:
   ```python
   # main_debug.py
   import os
   import warnings

   warnings.warn(
       "main_debug.py is deprecated and will be removed in a future version. "
       "Please use 'APP_MODE=debug python -m app.main' instead.",
       DeprecationWarning,
       stacklevel=2
   )

   # Set environment variable for mode
   os.environ["APP_MODE"] = "debug"

   # Import the app from main
   from app.main import app

   # Keep this for backwards compatibility
   if __name__ == "__main__":
       import uvicorn
       uvicorn.run("app.main_debug:app", host="0.0.0.0", port=8000, reload=True)
   ```

   Create similar shim files for `main_minimal.py`, `main_enhanced.py`, and `main_simplified.py`.

### 3. Update Batch Files and Scripts

Update any batch files or scripts that reference the old main files. For example:

- `run_minimal.bat`: Change `python -m app.main_minimal` to `set APP_MODE=minimal && python -m app.main`
- `start_dev_server.bat`: Change `python -m app.main_debug` to `set APP_MODE=debug && python -m app.main`

## Configuration

### Environment Variables

The application can be configured using environment variables:

```bash
# Set the application mode
set APP_MODE=debug

# Override other settings
set OLLAMA_BASE_URL=http://localhost:11434
set ENABLE_DEADLOCK_ANALYSIS=true
set LOG_LEVEL=DEBUG
```

### YAML Configuration

You can also configure the application using YAML files in the `config/` directory:

- `base.yaml`: Common settings for all modes
- `debug.yaml`: Settings for debug mode
- `minimal.yaml`: Settings for minimal mode
- `enhanced.yaml`: Settings for enhanced mode
- `simplified.yaml`: Settings for simplified mode

Example:

```yaml
# config/debug.yaml
DEBUG: true
LOG_LEVEL: DEBUG
RELOAD: true
ENABLE_REAL_TIME: true
```

### Precedence

Configuration values are loaded in this order, with later sources taking precedence:

1. Default values in `AppSettings`
2. `base.yaml`
3. Mode-specific YAML (e.g., `debug.yaml`)
4. Environment variables

## Running the Application

### Basic Usage

```bash
# Run with default mode
python -m app.main

# Run with specific mode
set APP_MODE=debug && python -m app.main

# Run with uvicorn directly
uvicorn app.main:app --reload
```

### Using Batch Files

```bash
# Run with default mode
start_backend.bat

# Run with minimal mode
run_minimal.bat
```

## Troubleshooting

### Common Issues

#### Configuration not loading

Ensure the `config/` directory exists and contains the necessary YAML files. Check file permissions.

#### Routers not being included

Verify that the router modules exist and export a variable named `router` that is a FastAPI `APIRouter` instance.

#### Feature not available in specific mode

Check the configuration file for that mode to ensure the corresponding feature flag is enabled.

### Logging

The application uses Python's built-in logging module. You can adjust the log level using the `LOG_LEVEL` setting.

### Health Check

The application provides a root endpoint (`/`) and a health endpoint (`/health`) that returns basic information about the application status.

## Comparison with Old Structure

| Old File            | New Configuration           | How to Run                                |
|---------------------|-----------------------------|--------------------------------------------|
| `main.py`           | `APP_MODE=default`          | `python -m app.main`                       |
| `main_debug.py`     | `APP_MODE=debug`            | `set APP_MODE=debug && python -m app.main` |
| `main_minimal.py`   | `APP_MODE=minimal`          | `set APP_MODE=minimal && python -m app.main` |
| `main_enhanced.py`  | `APP_MODE=enhanced`         | `set APP_MODE=enhanced && python -m app.main` |
| `main_simplified.py`| `APP_MODE=simplified`       | `set APP_MODE=simplified && python -m app.main` |
