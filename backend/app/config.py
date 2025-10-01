# File: backend/app/config.py

"""
Configuration management for the Dexter backend API.
Re-exports settings from the core configuration modules.
"""

# Import the main app settings
from app.core.config import AppSettings, get_settings

# Create the global settings instance
settings = get_settings()

# Re-export for backward compatibility
Settings = AppSettings

# Export the imports explicitly
__all__ = ["settings", "Settings", "AppSettings"]
