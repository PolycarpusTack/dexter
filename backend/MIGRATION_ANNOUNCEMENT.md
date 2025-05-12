# 📢 Dexter Architecture Migration Announcement

## What's Happening

We've completed a significant architectural improvement to the Dexter backend! The codebase now uses a consolidated, configuration-driven architecture that replaces the multiple `main_*.py` files with a single, flexible entry point.

## Why This Matters

This migration brings several key benefits:

✅ **Reduced Duplication**: Core application setup is now in one place  
✅ **Improved Maintainability**: Changes only need to be made in one place  
✅ **Configuration-Driven**: Different modes controlled by configuration rather than separate code files  
✅ **Enhanced Error Handling**: Consistent error handling across all modes  
✅ **Better Logging**: Centralized logging with more detailed information  
✅ **Easier Mode Switching**: Simple environment variable to switch between modes

## What's Changed

1. **Single Entry Point**: `app/main.py` is now the only entry point for all modes
2. **Mode Selection**: Use the `APP_MODE` environment variable instead of different main files
3. **YAML Configuration**: Configuration files in the `config/` directory
4. **Core Module**: New `app/core/` module with centralized functionality
5. **Backward Compatibility**: Old `main_*.py` files redirect to the new architecture with deprecation warnings

## What's Not Changed

1. **Functionality**: All existing functionality remains the same
2. **API Endpoints**: No changes to existing API endpoints
3. **Service Logic**: Business logic remains unchanged
4. **Batch Files**: Updated to use the new architecture, but names remain the same

## How to Use the New Architecture

### Running the Application

```bash
# Instead of: python -m app.main_debug
# Now use:
set APP_MODE=debug && python -m app.main

# Or for PowerShell:
$env:APP_MODE="debug"; python -m app.main
```

### Batch Files

All existing batch files have been updated to use the new architecture:

```bash
# These still work the same:
run_minimal.bat
start_dev_server.bat
run_simplified.bat
```

### Configuration

Edit the YAML files in the `config/` directory to customize each mode:

```yaml
# config/debug.yaml
DEBUG: true
LOG_LEVEL: DEBUG
ENABLE_REAL_TIME: true
```

## Adoption Timeline

We'll be following a gradual adoption strategy:

1. **Phase 1 (Current)**: Both architectures coexist with backward compatibility
2. **Phase 2 (Weeks 2-6)**: New features use the new architecture
3. **Phase 3 (Weeks 6-12)**: Existing features migrate to the new architecture
4. **Phase 4 (Weeks 12+)**: Complete migration and remove backward compatibility

## Resources

- [QUICK_REFERENCE.md](QUICK_REFERENCE.md): Developer's quick reference guide
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md): Detailed migration information
- [ADOPTION_STRATEGY.md](ADOPTION_STRATEGY.md): Phase-by-phase adoption plan

## Support

- **Slack Channel**: #dexter-migration
- **Office Hours**: Tuesdays 2-3 PM
- **GitHub Issues**: Use the "migration" tag

## Feedback

We welcome your feedback on the new architecture! Please share your thoughts, questions, or concerns in the #dexter-migration Slack channel or directly with the architecture team.
