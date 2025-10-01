"""
Settings module - compatibility bridge.

This module provides backward compatibility for code that imports from app.core.settings.
It re-exports the necessary components from the new configuration system.
"""

# Import from the compatibility layer
from .compatibility import settings

# Import the Settings class from config for type hints
from .config import AppSettings as Settings

# Export for backward compatibility
__all__ = ["settings", "Settings"]
