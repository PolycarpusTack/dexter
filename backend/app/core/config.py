"""
Configuration management for the Dexter application.

This module provides a centralized way to manage application settings
from multiple sources (environment variables, YAML configs) with proper
validation using Pydantic.
"""
import os
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, ClassVar
import sys
import yaml
from pydantic_settings import BaseSettings

# Handle different Pydantic versions
import pydantic
from packaging import version

PYDANTIC_V2 = version.parse(pydantic.__version__) >= version.parse('2.0.0')

if PYDANTIC_V2:
    from pydantic import field_validator
else:
    from pydantic import validator as field_validator

# Import settings from settings.py
from .settings import settings


class AppMode(str, Enum):
    """Available application modes."""
    DEFAULT = "default"
    DEBUG = "debug"
    MINIMAL = "minimal"
    ENHANCED = "enhanced"
    SIMPLIFIED = "simplified"


class LogLevel(str, Enum):
    """Available logging levels."""
    CRITICAL = "CRITICAL"
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"
    DEBUG = "DEBUG"


class AppSettings(BaseSettings):
    """
    Application settings with validation.
    
    This class manages all application configuration with appropriate
    type validation and defaults.
    """
    # Core settings
    APP_MODE: AppMode = AppMode.DEFAULT
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    LOG_LEVEL: LogLevel = LogLevel.INFO
    
    # Application info
    APP_NAME: str = "Dexter"
    VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    WORKERS: int = 1
    
    # API Settings
    SENTRY_BASE_URL: str = "https://sentry.io"
    SENTRY_TOKEN: str = ""
    
    # External services
    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"
    
    # Ollama settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama2"
    
    # OpenAI settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_ORGANIZATION_ID: Optional[str] = None
    OPENAI_DEFAULT_MODEL: str = "gpt-4o"
    OPENAI_API_BASE: Optional[str] = None
    OPENAI_TIMEOUT: Optional[float] = None
    OPENAI_MAX_RETRIES: Optional[int] = None
    OPENAI_USE_AZURE: bool = False
    
    # Anthropic settings
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_DEFAULT_MODEL: str = "claude-3-opus-20240229"
    ANTHROPIC_API_BASE: Optional[str] = None
    ANTHROPIC_API_VERSION: Optional[str] = None
    ANTHROPIC_TIMEOUT: Optional[float] = None
    ANTHROPIC_MAX_RETRIES: Optional[int] = None
    
    # Feature flags
    ENABLE_DEADLOCK_ANALYSIS: bool = True
    ENABLE_OLLAMA: bool = True
    ENABLE_OPENAI: bool = False
    ENABLE_ANTHROPIC: bool = False
    ENABLE_REAL_TIME: bool = False
    ENABLE_CACHING: bool = True
    
    # Cache Settings
    CACHE_ENABLED: bool = True
    CACHE_TTL_DEFAULT: int = 300  # 5 minutes
    
    # Performance settings
    REQUEST_TIMEOUT: int = 30
    MAX_CONNECTIONS: int = 100
    
    # CORS settings
    CORS_ORIGINS: Union[List[str], str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Logging Settings
    LOG_FORMAT: str = "standard"  # "standard" or "json"
    LOG_FILE_PATH: Optional[str] = None
    LOG_MAX_SIZE: int = 10 * 1024 * 1024  # 10MB
    LOG_BACKUP_COUNT: int = 5
    LOG_TO_CONSOLE: bool = True
    
    # Error Handling Settings
    RECENT_ERRORS_LIMIT: int = 100  # Number of recent errors to keep in memory
    INCLUDE_STACK_TRACE: Optional[bool] = None  # None means use debug setting
    
    @field_validator("PORT")
    def validate_port(cls, v: int) -> int:
        """Ensure port is in valid range."""
        if not 1 <= v <= 65535:
            raise ValueError(f"Port must be between 1 and 65535, got {v}")
        return v
    
    @field_validator("CORS_ORIGINS", mode='before')
    def parse_cors_origins(cls, v):
        """Parse CORS origins from various formats."""
        if isinstance(v, str):
            # Try to parse as JSON array first
            if v.startswith('[') and v.endswith(']'):
                try:
                    import json
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Parse as comma-separated list
            return [origin.strip() for origin in v.split(',')]
        return v
    
    @field_validator("CORS_ORIGINS")
    def validate_cors_origins(cls, v: List[str], info_or_values) -> List[str]:
        """Warn about wildcard CORS in production."""
        # Handle different parameter structure between Pydantic v1 and v2
        if PYDANTIC_V2:
            debug = info_or_values.data.get("DEBUG", False)
        else:
            debug = info_or_values.get("DEBUG", False)
            
        if "*" in v and not debug:
            print("WARNING: Using wildcard CORS origins in non-debug mode")
        return v
    
    @property
    def should_include_stack_trace(self) -> bool:
        """Determine if stack traces should be included in error responses."""
        if self.INCLUDE_STACK_TRACE is not None:
            return self.INCLUDE_STACK_TRACE
        return self.DEBUG
    
    if PYDANTIC_V2:
        model_config = {
            "env_file": ".env",
            "env_file_encoding": "utf-8",
            "case_sensitive": True,
            "extra": "allow"
        }
    else:
        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            case_sensitive = True
            extra = "allow"


def load_yaml_config(app_mode: Union[AppMode, str]) -> Dict[str, Any]:
    """
    Load YAML configuration file based on app mode.
    
    Args:
        app_mode: The application mode to load configuration for
        
    Returns:
        Dictionary containing configuration settings
        
    Raises:
        FileNotFoundError: If the base configuration file doesn't exist
    """
    try:
        # Handle string input to ensure compatibility
        if isinstance(app_mode, str):
            app_mode = AppMode(app_mode)
            
        base_path = Path(__file__).parent.parent.parent / "config"
        if not base_path.exists():
            base_path.mkdir(parents=True)
            
        # Always load base config
        base_config = {}
        base_config_path = base_path / "base.yaml"
        
        if base_config_path.exists():
            with open(base_config_path, "r", encoding="utf-8") as file:
                base_config = yaml.safe_load(file) or {}
        else:
            # Create default base config if it doesn't exist
            default_config = {
                "API_PREFIX": "/api/v1",
                "DEBUG": False,
                "ENABLE_DEADLOCK_ANALYSIS": True,
                "ENABLE_OLLAMA": True,
                "ENABLE_REAL_TIME": False,
                "CACHE_TIMEOUT": 300,
            }
            with open(base_config_path, "w", encoding="utf-8") as file:
                yaml.dump(default_config, file, sort_keys=False)
            base_config = default_config
        
        # Load mode-specific config if it exists
        mode_config = {}
        if app_mode != AppMode.DEFAULT:
            mode_config_path = base_path / f"{app_mode.value}.yaml"
            if mode_config_path.exists():
                with open(mode_config_path, "r", encoding="utf-8") as file:
                    mode_config = yaml.safe_load(file) or {}
        
        # Merge configs, with mode-specific taking precedence
        return {**base_config, **mode_config}
        
    except Exception as e:
        print(f"Error loading configuration: {str(e)}")
        return {}


def get_settings() -> AppSettings:
    """
    Get application settings with YAML config applied.
    
    Returns:
        AppSettings object with values from env vars and YAML config
    """
    # First load base settings from env vars and .env file
    app_settings = AppSettings()
    
    # Copy CORS origins from settings.py if available
    if hasattr(settings, 'cors_origins'):
        app_settings.CORS_ORIGINS = settings.cors_origins
    
    # Then override with YAML config
    try:
        yaml_config = load_yaml_config(app_settings.APP_MODE)
        for key, value in yaml_config.items():
            if hasattr(app_settings, key):
                setattr(app_settings, key, value)
    except Exception as e:
        print(f"Warning: Failed to apply YAML config: {str(e)}")
    
    # Apply env vars again to ensure they take highest precedence
    if PYDANTIC_V2:
        settings_dict = app_settings.model_dump()
        app_settings = AppSettings.model_validate(settings_dict)
    else:
        settings_dict = app_settings.dict()
        app_settings = AppSettings.parse_obj(settings_dict)
    
    return app_settings
