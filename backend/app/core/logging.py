"""
Logging configuration for the Dexter application.

This module provides functions to set up and configure the logging
system for the application.
"""
import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from typing import Union, Optional

from .config import LogLevel, AppSettings


def setup_logging(settings: AppSettings) -> None:
    """
    Configure application logging based on settings.
    
    Args:
        settings: Application settings containing logging configuration
    """
    # Get log level from settings
    try:
        level = getattr(logging, settings.LOG_LEVEL.value)
    except (AttributeError, ValueError):
        level = logging.INFO
        print(f"Invalid log level: {settings.LOG_LEVEL}, using INFO")
    
    # Root logger configuration
    root_logger = logging.getLogger()
    if root_logger.handlers:
        # Clear existing handlers to avoid duplicate logs
        for handler in root_logger.handlers:
            root_logger.removeHandler(handler)
    
    # Set log level
    root_logger.setLevel(level)
    
    # Configure formatter based on format setting
    if settings.LOG_FORMAT.lower() == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    # Add console handler if enabled
    if settings.LOG_TO_CONSOLE:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
    
    # Add file handler if configured
    if settings.LOG_FILE_PATH:
        try:
            # Create log directory if it doesn't exist
            log_dir = os.path.dirname(settings.LOG_FILE_PATH)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir)
            
            # Configure rotating file handler
            file_handler = RotatingFileHandler(
                settings.LOG_FILE_PATH,
                maxBytes=settings.LOG_MAX_SIZE,
                backupCount=settings.LOG_BACKUP_COUNT
            )
            file_handler.setLevel(level)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except Exception as e:
            print(f"Error setting up file logging: {str(e)}")
            # Continue with console logging only
    
    # Set levels for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    
    # Log setup completion
    app_logger = logging.getLogger("app")
    app_logger.info(f"Logging configured with level: {settings.LOG_LEVEL.value}")


class JsonFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record):
        """Format the log record as JSON."""
        import json
        import datetime
        import traceback
        
        log_data = {
            "timestamp": datetime.datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
            
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
            
        return json.dumps(log_data)
