# Pydantic Compatibility in Dexter

## Overview

Dexter uses Pydantic for data validation, serialization, and configuration management. This document explains our approach to maintaining compatibility between Pydantic v1 and v2.

## Compatibility Strategy

Dexter is designed to work with Pydantic v2, while maintaining compatibility with Pydantic v1 when necessary. This is achieved through:

1. **Centralized Compatibility Utilities**: We provide a common utility module (`app/utils/pydantic_compat.py`) that handles differences between Pydantic versions.

2. **Version Detection**: The utility module automatically detects the installed Pydantic version and adjusts behavior accordingly.

3. **Compatibility Helper Functions**: Helper functions like `pattern_field()` and `config_class_factory()` abstract away version-specific code.

4. **Continuous Compatibility Checks**: A GitHub Actions workflow and pre-commit hook run compatibility checks to catch regressions.

## Common Pydantic v1 to v2 Changes

| Pydantic v1 | Pydantic v2 | Our Approach |
|-------------|-------------|--------------|
| `regex=` in Field | `pattern=` in Field | Use `pattern_field()` helper |
| `@validator` | `@field_validator` | Import both or use appropriate one based on version |
| `class Config` | `model_config` dictionary | Use `config_class_factory()` helper |
| `schema_extra` | `json_schema_extra` | Handled by `config_class_factory()` |
| `.dict()` | `.model_dump()` | Use version-appropriate method |

## Using Compatibility Utilities

### Pattern Field Example

```python
from app.utils.pydantic_compat import pattern_field

class MyModel(BaseModel):
    # Will use pattern= in v2, regex= in v1
    value: str = pattern_field(r"^[a-z]+$")
```

### Config Example

```python
from app.utils.pydantic_compat import config_class_factory

class MyModel(BaseModel):
    name: str
    
    # Works in both v1 and v2
    model_config = config_class_factory({
        "json_schema_extra": {
            "example": {
                "name": "example"
            }
        }
    })
```

## Automated Compatibility Checks

To check for Pydantic compatibility issues, run:

```bash
# Check all files
python backend/check_pydantic_compatibility.py

# Check specific directory
python backend/check_pydantic_compatibility.py app/models
```

## Fixing Compatibility Issues

To automatically fix common compatibility issues, run:

```bash
# Do a dry run first (no changes)
python backend/fix_pydantic_compatibility.py --dry-run

# Apply fixes
python backend/fix_pydantic_compatibility.py
```

## Pre-commit Hook

Dexter includes a pre-commit hook that checks for Pydantic compatibility issues. To use it:

```bash
# Install pre-commit
pip install pre-commit

# Install the hooks
pre-commit install
```
