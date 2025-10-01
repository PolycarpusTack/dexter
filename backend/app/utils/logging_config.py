"""
Logging configuration for the Dexter application.

This module provides a centralized logging configuration that can be
used throughout the application for consistent logging.
"""

import logging
import os
import json
from pathlib import Path
import traceback
import sys
import re
from typing import Any

from app.config import settings

# Define log format based on environment
STANDARD_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Sensitive patterns to mask in logs
SENSITIVE_PATTERNS = [
    # API tokens, authorization headers
    (r"(Bearer\s+)([a-zA-Z0-9_\-]{20,})", r"\1***MASKED***"),
    (r'(token["\':=\s]+)([a-zA-Z0-9_\-]{20,})', r"\1***MASKED***"),
    (r'(authorization["\':=\s]+)([a-zA-Z0-9_\-]{20,})', r"\1***MASKED***"),
    # Generic patterns for secrets
    (r'(password["\':=\s]+)([^\s\'"]{8,})', r"\1***MASKED***"),
    (r'(secret["\':=\s]+)([^\s\'"]{8,})', r"\1***MASKED***"),
    (r'(key["\':=\s]+)([a-zA-Z0-9_\-]{20,})', r"\1***MASKED***"),
]


def mask_sensitive_data(message: str) -> str:
    """
    Mask sensitive data in log messages.

    Args:
        message: The log message to process

    Returns:
        The message with sensitive data masked
    """
    masked_message = message

    for pattern, replacement in SENSITIVE_PATTERNS:
        masked_message = re.sub(pattern, replacement, masked_message, flags=re.IGNORECASE)

    return masked_message


def mask_token(token: str, visible_chars: int = 8) -> str:
    """
    Mask a token for safe logging.

    Args:
        token: The token to mask
        visible_chars: Number of characters to show at the beginning

    Returns:
        Masked token string
    """
    if not token:
        return "None"

    if len(token) <= visible_chars:
        return "***MASKED***"

    return f"{token[:visible_chars]}{'*' * 20}"


def sanitize_log_data(data: Any) -> Any:
    """
    Recursively sanitize data structures for logging.

    Args:
        data: Data to sanitize (dict, list, str, etc.)

    Returns:
        Sanitized data with sensitive information masked
    """
    if isinstance(data, dict):
        sanitized = {}
        for key, value in data.items():
            # Check if key indicates sensitive data
            key_lower = key.lower()
            if any(
                sensitive in key_lower
                for sensitive in ["token", "password", "secret", "key", "auth"]
            ):
                sanitized[key] = mask_token(str(value)) if value else value
            else:
                sanitized[key] = sanitize_log_data(value)
        return sanitized
    elif isinstance(data, list):
        return [sanitize_log_data(item) for item in data]
    elif isinstance(data, str):
        return mask_sensitive_data(data)
    else:
        return data


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs log records as JSON strings with sensitive data masking."""

    def format(self, record):
        # Sanitize the log message
        sanitized_message = mask_sensitive_data(record.getMessage())

        log_record = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": sanitized_message,
            "module": record.module,
            "file": record.pathname,
            "line": record.lineno,
        }

        # Add exception information if available
        if record.exc_info:
            log_record["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": mask_sensitive_data(str(record.exc_info[1])),
                "traceback": mask_sensitive_data(traceback.format_exc()),
            }

        # Add extra data if available (sanitized)
        if hasattr(record, "data") and record.data:
            log_record["data"] = sanitize_log_data(record.data)

        return json.dumps(log_record)


class SafeFormatter(logging.Formatter):
    """Custom formatter that masks sensitive data in standard log format."""

    def format(self, record):
        # Create a copy of the record to avoid modifying the original
        record_copy = logging.makeLogRecord(record.__dict__)

        # Sanitize the message
        if record_copy.msg:
            if isinstance(record_copy.msg, str):
                record_copy.msg = mask_sensitive_data(record_copy.msg)
            # Handle formatted messages
            record_copy.args = tuple(
                mask_sensitive_data(str(arg)) if isinstance(arg, str) else arg
                for arg in (record_copy.args or ())
            )

        return super().format(record_copy)


def get_log_level():
    """Get log level from settings."""
    # Support both new (upper-case Enum) and legacy lower-case attributes
    level_attr = getattr(settings, "LOG_LEVEL", getattr(settings, "log_level", "INFO"))
    try:
        level_str = (level_attr.value if hasattr(level_attr, "value") else str(level_attr)).upper()
    except Exception:
        level_str = "INFO"
    level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    return level_map.get(level_str, logging.INFO)


def create_logs_directory():
    """Create logs directory if it doesn't exist."""
    log_dir = Path("logs")
    if not log_dir.exists():
        log_dir.mkdir(parents=True)
    return log_dir


def configure_logging():
    """Configure application-wide logging."""
    log_level = get_log_level()
    log_dir = create_logs_directory()

    # Create formatters based on settings (always use safe formatters)
    log_format = getattr(settings, "LOG_FORMAT", getattr(settings, "log_format", "standard"))
    if str(log_format).lower() == "json":
        main_formatter = JSONFormatter()
    else:
        main_formatter = SafeFormatter(STANDARD_FORMAT)

    # Always use JSON for the error log
    error_formatter = JSONFormatter()

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers to avoid duplication
    if root_logger.handlers:
        root_logger.handlers.clear()

    # Console handler for development
    log_to_console = getattr(settings, "LOG_TO_CONSOLE", getattr(settings, "log_to_console", True))
    if bool(log_to_console):
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(main_formatter)
        console_handler.setLevel(log_level)
        root_logger.addHandler(console_handler)

    # File handler for all logs
    log_file_path = getattr(settings, "LOG_FILE_PATH", getattr(settings, "log_file_path", None))
    log_max_size = int(
        getattr(settings, "LOG_MAX_SIZE", getattr(settings, "log_max_size", 10 * 1024 * 1024))
    )
    log_backup_count = int(
        getattr(settings, "LOG_BACKUP_COUNT", getattr(settings, "log_backup_count", 5))
    )
    if log_file_path:
        log_file = log_dir / os.path.basename(str(log_file_path))
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=log_max_size,
            backupCount=log_backup_count,
            encoding="utf-8",
        )
        file_handler.setFormatter(main_formatter)
        file_handler.setLevel(log_level)
        root_logger.addHandler(file_handler)

    # JSON file handler for error logs (ERROR and above)
    error_handler = logging.handlers.RotatingFileHandler(
        log_dir / "errors.json",
        maxBytes=log_max_size,
        backupCount=log_backup_count,
        encoding="utf-8",
    )
    error_handler.setFormatter(error_formatter)
    error_handler.setLevel(logging.ERROR)
    root_logger.addHandler(error_handler)

    # Set external loggers to warning level to reduce noise
    for logger_name in ["uvicorn", "uvicorn.access", "fastapi"]:
        ext_logger = logging.getLogger(logger_name)
        ext_logger.setLevel(logging.WARNING)

    # Create specific logger for error handling
    error_logger = logging.getLogger("dexter.errors")
    error_logger.setLevel(log_level)

    # Add specialized handler for structured error logs
    structured_handler = logging.handlers.RotatingFileHandler(
        log_dir / "structured_errors.json",
        maxBytes=log_max_size,
        backupCount=log_backup_count,
        encoding="utf-8",
    )
    structured_handler.setFormatter(error_formatter)
    structured_handler.setLevel(logging.INFO)  # Capture all error logs
    error_logger.addHandler(structured_handler)

    logger = logging.getLogger(__name__)
    logger.info("Logging configured successfully")
    return error_logger


# Create and expose the error logger
error_logger = configure_logging()


def log_error_with_context(error_data):
    """Log structured error data with context."""
    # Sanitize error data before logging
    sanitized_data = sanitize_log_data(error_data)
    error_logger.error(
        sanitized_data.get("error_message", "Error occurred"), extra={"data": sanitized_data}
    )


def safe_log(logger: logging.Logger, level: int, message: str, *args, **kwargs):
    """
    Safely log a message with automatic sensitive data masking.

    Args:
        logger: Logger instance to use
        level: Logging level (e.g., logging.INFO)
        message: Log message (will be sanitized)
        *args: Additional arguments for the message
        **kwargs: Additional keyword arguments
    """
    # Sanitize message and args
    safe_message = mask_sensitive_data(message)
    safe_args = tuple(
        mask_sensitive_data(str(arg)) if isinstance(arg, str) else arg for arg in args
    )

    # Sanitize extra data if present
    if "extra" in kwargs and isinstance(kwargs["extra"], dict):
        kwargs["extra"] = sanitize_log_data(kwargs["extra"])

    logger.log(level, safe_message, *safe_args, **kwargs)
