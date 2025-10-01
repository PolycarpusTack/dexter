"""
Compatibility layer for the Dexter application.

This module provides functions and classes to ensure compatibility
between the new architecture and the existing codebase.
"""
import logging
import os
from typing import Any, Dict

from .config import get_settings

logger = logging.getLogger(__name__)

# Global settings instance for backward compatibility
settings_instance = None


def get_legacy_settings() -> Dict[str, Any]:
    """
    Get a dictionary of settings in the legacy format for backward compatibility.

    Returns:
        A dictionary with legacy-style setting names
    """
    global settings_instance

    if settings_instance is None:
        settings_instance = get_settings()

    # Map new settings to legacy names
    return {
        "app_name": settings_instance.APP_NAME,
        "version": settings_instance.VERSION,
        "debug": settings_instance.DEBUG,
        "host": settings_instance.HOST,
        "port": settings_instance.PORT,
        "cors_origins": settings_instance.CORS_ORIGINS,
        "sentry_base_url": settings_instance.SENTRY_BASE_URL,
        "sentry_token": settings_instance.SENTRY_TOKEN,
        "ollama_base_url": settings_instance.OLLAMA_BASE_URL,
        "ollama_model": settings_instance.OLLAMA_MODEL,
        "cache_enabled": settings_instance.CACHE_ENABLED,
        "cache_ttl_default": settings_instance.CACHE_TTL_DEFAULT,
        "log_level": settings_instance.LOG_LEVEL.value,
        "log_format": settings_instance.LOG_FORMAT,
        "log_file_path": settings_instance.LOG_FILE_PATH,
        "log_max_size": settings_instance.LOG_MAX_SIZE,
        "log_backup_count": settings_instance.LOG_BACKUP_COUNT,
        "log_to_console": settings_instance.LOG_TO_CONSOLE,
        "recent_errors_limit": settings_instance.RECENT_ERRORS_LIMIT,
        "include_stack_trace": settings_instance.INCLUDE_STACK_TRACE,
        # Add other mappings as needed
    }


class LegacySettings:
    """
    Legacy settings class that mimics the original Settings class.

    This class provides attribute-style access to settings for backward compatibility.
    """

    def __init__(self):
        """Initialize with current settings."""
        self._settings = get_legacy_settings()
        self._app_settings = get_settings()

    def __getattr__(self, name: str) -> Any:
        """Get a setting by attribute name."""
        # First check the legacy mappings
        if name in self._settings:
            return self._settings[name]

        # Map common lowercase names to uppercase AppSettings attributes
        upper_name = name.upper()
        if hasattr(self._app_settings, upper_name):
            return getattr(self._app_settings, upper_name)

        # Handle specific legacy attribute mappings
        legacy_mappings = {
            "sentry_api_token": "SENTRY_TOKEN",
            "ollama_base_url": "OLLAMA_BASE_URL",
            "ollama_model": "OLLAMA_MODEL",
            "ollama_timeout": "REQUEST_TIMEOUT",
            "redis_url": "REDIS_URL",
            "environment": "SENTRY_ENVIRONMENT",
            "secret_key": "SECRET_KEY",
            "csrf_secret": "CSRF_SECRET",
            "SENTRY_ORG": "SENTRY_ORG",
            "organization_slug": "ORGANIZATION_SLUG",
            "project_slug": "PROJECT_SLUG",
        }

        if name in legacy_mappings:
            attr_name = legacy_mappings[name]
            if hasattr(self._app_settings, attr_name):
                return getattr(self._app_settings, attr_name)

        raise AttributeError(f"'LegacySettings' object has no attribute '{name}'")

    def refresh(self) -> None:
        """Refresh settings from the current state."""
        self._settings = get_legacy_settings()

    @property
    def should_include_stack_trace(self) -> bool:
        """Determine if stack traces should be included in error responses."""
        include = self._settings.get("include_stack_trace")
        if include is not None:
            return include
        return self._settings.get("debug", False)


# Create a global instance for import compatibility
settings = LegacySettings()


def ensure_compatibility() -> None:
    """
    Ensure compatibility with the existing codebase.

    This function should be called early in the application startup to set up
    any necessary compatibility features.
    """
    # Set environment variables for modules that might use them directly
    _set_compat_env_vars()

    # Log compatibility mode
    logger.info("Compatibility layer initialized")


def _set_compat_env_vars() -> None:
    """Set environment variables for compatibility."""
    settings_dict = get_legacy_settings()

    # Set environment variables for modules that might use them directly
    env_mappings = {
        "DEXTER_DEBUG": str(settings_dict.get("debug", False)).lower(),
        "DEXTER_LOG_LEVEL": settings_dict.get("log_level", "INFO"),
        "DEXTER_OLLAMA_URL": settings_dict.get("ollama_base_url", "http://localhost:11434"),
        "DEXTER_OLLAMA_MODEL": settings_dict.get("ollama_model", "llama2"),
        # Add other environment variables as needed
    }

    for key, value in env_mappings.items():
        if key not in os.environ:
            os.environ[key] = value
