"""
Configuration settings for the Dexter backend API.
"""

from app.core.settings import settings

# Re-export settings
__all__ = ['settings']

# NOTE: With Pydantic v2, we can't set attributes directly on settings objects
# that weren't defined in the Settings class. All fields must be predefined.
# Settings that should be customized at runtime should be defined in the 
# Settings class with appropriate defaults.
