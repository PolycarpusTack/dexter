from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from typing import Optional, List, Dict, Any, Union
import os
import json
from pathlib import Path


class Settings(BaseSettings):
    """Application settings.
    
    This class manages application configuration settings loaded from 
    environment variables, with sensible defaults.
    """
    
    # Application info
    app_name: str = "Dexter"
    version: str = "1.0.0"
    
    # API Settings
    sentry_base_url: str = "https://sentry.io"
    sentry_token: str = ""
    
    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    cors_origins: Union[List[str], str] = Field(default_factory=lambda: ["*"])
    
    # LLM Settings
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama2"
    
    # Cache Settings
    cache_enabled: bool = True
    cache_ttl_default: int = 300  # 5 minutes
    
    # Logging Settings
    log_level: str = "INFO"
    log_format: str = "standard"  # "standard" or "json"
    log_file_path: Optional[str] = "logs/dexter.log"
    log_max_size: int = 10 * 1024 * 1024  # 10MB
    log_backup_count: int = 5
    log_to_console: bool = True
    
    # Error Handling Settings
    recent_errors_limit: int = 100  # Number of recent errors to keep in memory
    include_stack_trace: bool | None = None  # None means use debug setting
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "allow"
    }
    
    @field_validator('cors_origins', mode='before')
    def parse_cors_origins(cls, v):
        """Parse CORS origins from various formats."""
        if isinstance(v, str):
            # Handle comma-separated strings
            if ',' in v:
                return [origin.strip() for origin in v.split(',')]
            # Handle JSON array string
            if v.startswith('[') and v.endswith(']'):
                try:
                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Single origin
            return [v.strip()]
        return v

    @property
    def should_include_stack_trace(self) -> bool:
        """Determine if stack traces should be included in error responses."""
        if self.include_stack_trace is not None:
            return self.include_stack_trace
        return self.debug


# Global instance
settings = Settings()
