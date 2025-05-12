"""
Core module for the Dexter application.

This module provides core functionality and utilities for the application.
"""
from .config import AppSettings, get_settings, AppMode, LogLevel
from .factory import create_app
from .logging import setup_logging
from .middleware import setup_middlewares
from .compatibility import LegacySettings, settings, ensure_compatibility

__all__ = [
    'AppSettings',
    'get_settings',
    'create_app',
    'setup_logging',
    'setup_middlewares',
    'AppMode',
    'LogLevel',
    'LegacySettings',
    'settings',
    'ensure_compatibility',
]
