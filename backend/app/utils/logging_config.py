"""
Logging configuration for the Dexter application.

This module provides a centralized logging configuration that can be
used throughout the application for consistent logging.
"""

import logging
import logging.handlers
import os
import json
from pathlib import Path
from datetime import datetime
import traceback
import sys

from app.config.settings import settings


# Define log format based on environment
STANDARD_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"


class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs log records as JSON strings."""
    
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "file": record.pathname,
            "line": record.lineno,
        }
        
        # Add exception information if available
        if record.exc_info:
            log_record["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exc(),
            }
        
        # Add extra data if available
        if hasattr(record, "data") and record.data:
            log_record["data"] = record.data
        
        return json.dumps(log_record)


def get_log_level():
    """Get log level from settings."""
    level_str = settings.log_level.upper()
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
    
    # Create formatters based on settings
    if settings.log_format.lower() == "json":
        main_formatter = JSONFormatter()
    else:
        main_formatter = logging.Formatter(STANDARD_FORMAT)
    
    # Always use JSON for the error log
    error_formatter = JSONFormatter()
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clear existing handlers to avoid duplication
    if root_logger.handlers:
        root_logger.handlers.clear()
    
    # Console handler for development
    if settings.log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(main_formatter)
        console_handler.setLevel(log_level)
        root_logger.addHandler(console_handler)
    
    # File handler for all logs
    if settings.log_file_path:
        log_file = log_dir / os.path.basename(settings.log_file_path)
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=settings.log_max_size,
            backupCount=settings.log_backup_count,
            encoding="utf-8",
        )
        file_handler.setFormatter(main_formatter)
        file_handler.setLevel(log_level)
        root_logger.addHandler(file_handler)
    
    # JSON file handler for error logs (ERROR and above)
    error_handler = logging.handlers.RotatingFileHandler(
        log_dir / "errors.json",
        maxBytes=settings.log_max_size,
        backupCount=settings.log_backup_count,
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
        maxBytes=settings.log_max_size,
        backupCount=settings.log_backup_count,
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
    error_logger.error(
        error_data.get("error_message", "Error occurred"), 
        extra={"data": error_data}
    )
