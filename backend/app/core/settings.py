# File: backend/app/core/settings_new.py

"""
Settings module for the Dexter backend API.
Loads settings from environment variables using Pydantic Settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from pydantic import Field, field_validator
from typing import List, Union
from urllib.parse import urlparse
import json

class Settings(BaseSettings):
    """
    Defines the application settings, loaded from environment variables.
    """
    sentry_api_token: str = Field("YOUR_SENTRY_API_TOKEN", env="SENTRY_API_TOKEN")
    sentry_base_url: str = Field("https://sentry.io/api/0/", env="SENTRY_BASE_URL")
    sentry_web_url: str = Field("https://sentry.io/", env="SENTRY_WEB_URL")
    ollama_base_url: str = Field("http://localhost:11434", env="OLLAMA_BASE_URL")
    ollama_model: str = Field("mistral:latest", env="OLLAMA_MODEL")
    ollama_timeout: int = Field(1200, env="OLLAMA_TIMEOUT")  # Timeout in seconds (20 minutes)
    log_level: str = Field("INFO", env="LOG_LEVEL")
    organization_slug: str = Field("", env="SENTRY_ORGANIZATION_SLUG")
    project_slug: str = Field("", env="SENTRY_PROJECT_SLUG")
    redis_url: str = Field("redis://localhost:6379/0", env="REDIS_URL")
    environment: str = Field("development", env="ENVIRONMENT")  # 'development', 'production', 'testing'
    
    # Application configuration that needs to be directly defined in the Settings class
    app_name: str = Field("Dexter API", env="APP_NAME")
    cors_origins: Union[List[str], str] = Field(["http://localhost:5173", "http://localhost:3000"], env="CORS_ORIGINS")
    
    # Sentry organization config (used in discover.py)
    SENTRY_ORG: str = Field("", env="SENTRY_ORG")

    @field_validator('cors_origins', mode='before')
    def parse_cors_origins(cls, v):
        """Parse CORS origins from various formats."""
        if isinstance(v, str):
            # Try to parse as JSON array
            if v.startswith('[') and v.endswith(']'):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Parse as comma-separated list
            return [origin.strip() for origin in v.split(',')]
        return v

    @property
    def sentry_org_web_url_base(self) -> str:
        """Base URL for linking to Sentry org pages."""
        # Assumes structure like https://sentry.io/organizations/<slug>/...
        # Override in .env with SENTRY_WEB_URL if using self-hosted with different structure
        return f"{self.sentry_web_url.rstrip('/')}/organizations/"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
        )

settings = Settings()