# File: backend/app/config.py

"""
Configuration management for the Dexter backend API.
Re-exports settings from the core.settings module.
"""

# Re-export settings for backward compatibility
from app.core.settings import settings

# Keep the Settings class definition here for backward compatibility
from app.core.settings import Settings
