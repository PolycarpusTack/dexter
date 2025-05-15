# Python 3.13 Compatibility Guide

This document addresses compatibility issues between our project and Python 3.13.

## Known Issues

### 1. FastAPI Body Parameter Conflict

Python 3.13 introduces compatibility issues with FastAPI, particularly with the `Body` class parameter naming. The error appears as:

```
TypeError: fastapi.params.Body.__init__() got multiple values for keyword argument 'json_json_json_json_schema_extra'
```

This error occurs because of a change in how Pydantic v2 and FastAPI interact with Python 3.13's handling of keyword parameters.

### 2. Pydantic-Settings RootModel Import Error

When using pydantic-settings with certain versions of Pydantic in Python 3.13, you may encounter:

```
ImportError: cannot import name 'RootModel' from 'pydantic'
```

This happens because newer versions of pydantic-settings try to import `RootModel` which isn't available in all Pydantic versions.

## Solutions

### 1. Run the Fix Script (Recommended)

#### For Windows:

```
fix_py313_windows.bat
```

This does a direct fix specifically for Windows environments:
1. Uninstalls existing pydantic-settings
2. Installs compatible dependency versions
3. Applies a direct fix to the RootModel issue
4. Works with Python 3.13 virtual environments

#### For Linux/Mac:

```bash
./update_repo_for_python313.sh
```

This script:
1. Fixes Pydantic compatibility issues
2. Patches FastAPI for Python 3.13
3. Fixes pydantic-settings compatibility
4. Installs compatible dependency versions

### 2. Individual Fix Scripts

If you need more granular control, you can run the scripts individually:

```bash
# Fix FastAPI parameter conflicts
python3 fix_fastapi_py313.py

# Fix Pydantic field compatibility
python3 fix_pydantic_compatibility.py

# Fix pydantic-settings compatibility
python3 fix_pydantic_settings.py
```

### 3. Use Compatible Dependency Versions

We've pinned to specific versions known to work with Python 3.13:

```bash
pip install -r requirements-fixed.txt
```

This installs:
- fastapi==0.109.2
- uvicorn==0.27.1
- pydantic==2.3.0
- pydantic-settings==1.2.5

### 4. Use Python 3.11 or 3.12 (Alternative)

For maximum stability, consider using Python 3.11 or 3.12 for development and production until these issues are fully resolved in the upstream libraries.

The project's `pyproject.toml` specifies compatibility with Python `^3.10`, so Python 3.10, 3.11, and 3.12 are all officially supported versions.

## Verification

After applying the fixes, you can verify everything is working with:

```bash
python3 run_test_python313.sh
```

This script will:
1. Apply all compatibility fixes
2. Test creating a FastAPI Body parameter (which previously failed)
3. Report success or failure

## Additional Resources

- [FastAPI GitHub Issue about Python 3.13 compatibility](https://github.com/tiangolo/fastapi/issues/9700)
- [Pydantic Issue about json_schema_extra duplication](https://github.com/pydantic/pydantic/issues/5165)
- [Pydantic-Settings Compatibility GitHub Issue](https://github.com/pydantic/pydantic-settings/issues/104)

## Updating This Guide

Please update this guide as new compatibility issues are discovered or resolved. Include:
- Clear error descriptions
- Steps to reproduce
- Solutions
- Reference to upstream issue if available