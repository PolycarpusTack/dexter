# Enhanced Error Logging System

This document describes the enhanced error logging system implemented in Dexter to provide persistent, scalable, and configurable error handling.

## Overview

The error logging system replaces the previous in-memory logging with a more robust approach that:

1. Writes logs to rotating files
2. Provides structured JSON logging for errors
3. Maintains a small in-memory cache for API access
4. Configurable via environment variables or .env file
5. Separates general application logs from error logs

## Configuration Options

The following settings can be configured in the `.env` file or through environment variables:

```
# Logging Settings
LOG_LEVEL=INFO                 # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FORMAT=standard            # standard or json
LOG_FILE_PATH=logs/dexter.log  # Path for the main log file (relative to app root)
LOG_MAX_SIZE=10485760          # Maximum size of log files before rotation (default: 10MB)
LOG_BACKUP_COUNT=5             # Number of backup files to keep when rotating
LOG_TO_CONSOLE=true            # Whether to output logs to console

# Error Handling Settings
RECENT_ERRORS_LIMIT=100        # Number of recent errors to keep in memory for API access
INCLUDE_STACK_TRACE=           # Override whether to include stack traces (defaults to DEBUG setting)
```

## Log Files

The system creates and maintains several log files in the `logs/` directory:

- `dexter.log`: General application logs (and rotated files with suffix .1, .2, etc.)
- `errors.json`: All error logs in JSON format (ERROR level and above)
- `structured_errors.json`: Structured error logs with request context

## Usage in Code

### Logging General Messages

```python
import logging

logger = logging.getLogger(__name__)

# Standard logging levels
logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message", exc_info=True)  # Include stack trace
logger.critical("Critical message")
```

### Accessing the Error Handler

```python
from app.middleware.error_handler import error_handler

# Getting recent errors (for API endpoints)
recent_errors = error_handler.get_error_log(limit=50)

# Getting errors by category
from app.middleware.error_handler import ErrorCategory
validation_errors = error_handler.get_errors_by_category(
    ErrorCategory.VALIDATION, limit=20
)
```

### Creating Custom Errors

```python
from app.middleware.error_handler import create_api_error, ErrorCode, ErrorCategory

# Creating a custom API error
my_error = create_api_error(
    message="Custom error message",
    status_code=400,
    error_code=ErrorCode.INVALID_INPUT,
    category=ErrorCategory.VALIDATION,
    details={"field": "username", "issue": "too_short"},
    retryable=True
)

# Using convenience functions
from app.middleware.error_handler import validation_error, not_found_error

# Validation error
raise validation_error(field="email", message="Invalid email format")

# Not found error
raise not_found_error(resource="User", identifier="123")
```

## How It Works

1. When an error occurs, the `error_handler` processes it:
   - Categorizes the error
   - Formats it for response to the client
   - Logs it to the persistent logging system
   - Adds it to the in-memory cache (limited size)

2. Logs are written to files with rotation:
   - When a log file reaches the configured size, it's renamed with a suffix
   - A new log file is created
   - Old log files are deleted when the maximum number is reached

3. Error logs are structured:
   - Includes timestamp, error type, message, category, code
   - Captures request context (path, method, headers, etc.)
   - Includes stack trace for server errors
   - Formatted as JSON for easy parsing and analysis

## Improvements Over Previous Implementation

1. **Persistence**: Logs survive application restarts
2. **Scalability**: Rotating log files prevent disk space issues
3. **Structured Data**: JSON format for automated processing
4. **Configurability**: Extensive options for different environments
5. **Performance**: Minimal in-memory storage reduces memory usage
6. **Separation of Concerns**: Error handling separate from logging

## Diagnostic Endpoints

The API provides diagnostic endpoints for accessing error information:

- `GET /api/v1/diagnostics/errors?limit=50`: Get recent errors from in-memory cache

## Recommendations for Production

For production environments, consider:

1. Setting `LOG_LEVEL=WARNING` to reduce log volume
2. Setting `LOG_FORMAT=json` for easier log processing
3. Setting `LOG_TO_CONSOLE=false` if using container logs
4. Configuring log collection for parsing the JSON error logs
5. Implementing a log forwarding solution to a centralized logging system
