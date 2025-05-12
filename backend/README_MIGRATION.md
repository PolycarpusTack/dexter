# Dexter Backend Architecture Migration

## 🚀 Migration Complete

The Dexter backend has been successfully migrated from multiple `main_*.py` files to a consolidated, configuration-driven architecture. This migration provides several benefits:

- **Single source of truth** for application setup
- **Configuration-driven behavior** rather than code duplication
- **Consistent error handling** across all application modes
- **Improved maintainability** with clear separation of concerns
- **Enhanced logging and observability**

## 📂 New Directory Structure

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

## 📋 How to Run the Application

### 🔄 No Changes for Existing Scripts

All existing batch files (`run_minimal.bat`, `start_dev_server.bat`, etc.) have been updated to work with the new architecture. You can continue to use them as before.

### 🆕 Using the New Architecture Directly

You can also directly run the application with different modes using environment variables:

```bash
# Run with default mode
python -m app.main

# Run with debug mode
set APP_MODE=debug
python -m app.main

# Run with minimal mode
set APP_MODE=minimal
python -m app.main

# Run with enhanced mode
set APP_MODE=enhanced
python -m app.main

# Run with simplified mode
set APP_MODE=simplified
python -m app.main
```

Or using a single command:

```bash
set APP_MODE=debug && python -m app.main
```

### 🔍 Testing the Architecture

You can test all modes with the included test script:

```bash
python test_new_architecture.py
```

## ⚙️ Configuration System

The new architecture uses a layered configuration system:

1. **Default values** defined in `AppSettings` class
2. **Base configuration** from `config/base.yaml`
3. **Mode-specific configuration** from `config/<mode>.yaml`
4. **Environment variables** (highest precedence)

To modify settings for a specific mode, edit the corresponding YAML file in the `config/` directory.

## 🔄 Backward Compatibility

For backward compatibility, the old `main_*.py` files now act as shims that redirect to the new architecture. They include deprecation warnings to encourage using the new approach.

## 🚫 Deprecation Notice

The shim files (`main_debug.py`, `main_minimal.py`, etc.) are deprecated and will be removed in a future version. Please update any custom scripts to use the new approach:

```diff
- python -m app.main_debug
+ set APP_MODE=debug && python -m app.main
```

## 📚 Further Documentation

For more detailed information about the migration, please refer to the `MIGRATION_GUIDE.md` file.
