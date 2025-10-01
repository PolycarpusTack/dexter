"""
Core module for the Dexter application.

This module provides core functionality and utilities for the application.
"""
from .compatibility import LegacySettings, ensure_compatibility, settings
from .config import AppMode, AppSettings, LogLevel, get_settings
from .factory import create_app
from .logging import setup_logging
from .middleware import setup_middlewares

__all__ = [
    "AppSettings",
    "get_settings",
    "create_app",
    "setup_logging",
    "setup_middlewares",
    "AppMode",
    "LogLevel",
    "LegacySettings",
    "settings",
    "ensure_compatibility",
]
