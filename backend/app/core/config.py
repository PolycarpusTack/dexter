"""
Configuration management for the Dexter application.

This module provides a centralized way to manage application settings
from multiple sources (environment variables, YAML configs) with proper
validation using Pydantic.
"""
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Handle different Pydantic versions
import pydantic
import yaml
from packaging import version
from pydantic_settings import BaseSettings

PYDANTIC_V2 = version.parse(pydantic.__version__) >= version.parse("2.0.0")

if PYDANTIC_V2:
    from pydantic import Field, field_validator
else:
    from pydantic import Field
    from pydantic import validator as field_validator

# No circular imports - settings will be configured in get_app_settings()


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
    SENTRY_TOKEN: str = ""  # Deprecated - use SENTRY_API_TOKEN
    SENTRY_API_TOKEN: str = ""

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

    # Database settings (PostgreSQL + pgvector)
    DATABASE_URL: str = "postgresql+asyncpg://dexter:dexter_dev@localhost:5432/dexter"
    DATABASE_ECHO: bool = False  # Echo SQL statements (debug)

    # Embeddings settings (Jina v2 Code)
    EMBEDDING_MODEL: str = "jinaai/jina-embeddings-v2-base-code"
    EMBEDDING_DIMENSION: int = 768
    EMBEDDING_CACHE_SIZE: int = 1000  # LRU cache entries
    EMBEDDING_DEVICE: Optional[str] = None  # 'cpu', 'cuda', or None for auto

    # PII Settings
    PII_HASH_SALT: str = ""  # Set in environment for production
    PII_SCRUB_UUIDS: bool = True  # Scrub UUIDs (may be user IDs)

    # Webhook settings
    SENTRY_CLIENT_SECRET: str = ""  # For webhook signature verification
    WEBHOOK_DEDUP_WINDOW_MINUTES: int = 5  # Deduplication window

    # Knowledge base settings
    SIMILARITY_THRESHOLD: float = 0.7  # Minimum similarity for RAG retrieval
    MAX_SIMILAR_ISSUES: int = 5  # Max similar issues to retrieve

    # Feature flags
    ENABLE_DEADLOCK_ANALYSIS: bool = True
    ENABLE_OLLAMA: bool = True
    ENABLE_OPENAI: bool = False
    ENABLE_ANTHROPIC: bool = False
    ENABLE_REAL_TIME: bool = False
    ENABLE_CACHING: bool = True
    ENABLE_EXTERNAL_APIS: bool = True
    ENABLE_KNOWLEDGE_BASE: bool = True  # Enable knowledge base features

    # =====================================
    # DATA ENRICHMENT FEATURE FLAGS (EPIC C)
    # =====================================

    # Release Intelligence
    ENABLE_RELEASES: bool = Field(
        default=True,
        description="Enable release and suspect commit enrichment"
    )

    # Performance Observability
    ENABLE_PERFORMANCE_SPANS: bool = Field(
        default=True,
        description="Enable performance span and transaction enrichment"
    )

    # Profiling
    ENABLE_PROFILING: bool = Field(
        default=False,  # Disabled by default (resource intensive)
        description="Enable profiling data (function hotspots)"
    )

    # User Context
    ENABLE_SESSIONS_REPLAYS: bool = Field(
        default=True,
        description="Enable session counts and replay metadata"
    )

    # Breadcrumbs
    ENABLE_BREADCRUMBS: bool = Field(
        default=True,
        description="Enable breadcrumb timeline enrichment"
    )

    # Alerts & Incidents
    ENABLE_ALERTS: bool = Field(
        default=True,
        description="Enable alert and incident correlation"
    )

    # Attachments
    ENABLE_ATTACHMENTS: bool = Field(
        default=False,  # Disabled by default (security sensitive)
        description="Enable attachment download and summarization"
    )

    # Tag Analysis
    ENABLE_TAG_DISTRIBUTIONS: bool = Field(
        default=True,
        description="Enable tag distribution and environment clustering"
    )

    # Ownership
    ENABLE_OWNERSHIP: bool = Field(
        default=True,
        description="Enable issue ownership and team routing"
    )

    # Measurements
    ENABLE_MEASUREMENTS: bool = Field(
        default=True,
        description="Enable custom measurements and web vitals"
    )

    # Grouping
    ENABLE_GROUPING_INSIGHTS: bool = Field(
        default=True,
        description="Enable grouping variants and fingerprint insights"
    )

    # Master toggle (gates individual flags)
    ENABLE_ALL_ENRICHMENTS: bool = Field(
        default=True,
        description="Master switch: when ON, individual flags control enrichments; when OFF, all disabled"
    )

    # Enrichment job settings
    ENRICHMENT_BATCH_SIZE: int = Field(
        default=50,
        description="How many issues to enrich per batch"
    )
    ENRICHMENT_INTERVAL_SECONDS: int = Field(
        default=300,
        description="How often to run enrichment (5 min)"
    )
    ENRICHMENT_MAX_RETRIES: int = Field(
        default=3,
        description="Max retries for failed enrichment"
    )

    # Cache Settings
    CACHE_ENABLED: bool = True
    CACHE_TTL_DEFAULT: int = 300  # 5 minutes

    # Performance settings
    REQUEST_TIMEOUT: int = 30
    MAX_CONNECTIONS: int = 100

    # CORS settings
    CORS_ORIGINS: Union[List[str], str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:5175",
        ],
        description="List of allowed CORS origins",
    )
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
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

    # Additional settings for backward compatibility
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security settings - CRITICAL: Change in production
    SECRET_KEY: str = Field(
        default="CHANGE_THIS_IN_PRODUCTION_USE_STRONG_SECRET_AT_LEAST_32_CHARS",
        description="Secret key for JWT token signing (CRITICAL: Must be changed in production)"
    )
    CSRF_SECRET: str = "development-csrf-secret-change-in-production"
    SENTRY_ORG: str = ""
    ORGANIZATION_SLUG: str = ""
    PROJECT_SLUG: str = ""

    # Sentry organization and project (for enrichment services)
    SENTRY_ORGANIZATION_SLUG: Optional[str] = Field(
        default=None,
        description="Sentry organization slug for API calls"
    )
    SENTRY_PROJECT_SLUG: Optional[str] = Field(
        default=None,
        description="Sentry project slug for API calls"
    )

    # Sentry Data Client Framework Settings
    SENTRY_RATE_LIMIT_REQUESTS_PER_MIN: int = 100
    SENTRY_RATE_LIMIT_MAX_BURST: int = 100
    SENTRY_CIRCUIT_BREAKER_THRESHOLD: int = 5
    SENTRY_CIRCUIT_BREAKER_TIMEOUT: float = 60.0
    SENTRY_CIRCUIT_BREAKER_SUCCESS_THRESHOLD: int = 2
    SENTRY_MAX_RETRIES: int = 3
    SENTRY_RETRY_BACKOFF_BASE: int = 1
    SENTRY_CACHE_ENABLED: bool = True
    SENTRY_CACHE_TTL: int = 300
    SENTRY_REQUEST_TIMEOUT: int = 30

    @field_validator("PORT")
    def validate_port(cls, v: int) -> int:
        """Ensure port is in valid range."""
        if not 1 <= v <= 65535:
            raise ValueError(f"Port must be between 1 and 65535, got {v}")
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> Union[str, List[str]]:
        """Parse CORS origins from various formats.

        Args:
            v: CORS origins as string or list

        Returns:
            Parsed CORS origins
        """
        if isinstance(v, str):
            # Try to parse as JSON array first
            if v.startswith("[") and v.endswith("]"):
                try:
                    import json

                    return json.loads(v)
                except json.JSONDecodeError:
                    pass
            # Parse as comma-separated list
            return [origin.strip() for origin in v.split(",")]
        return v

    @field_validator("CORS_ORIGINS")
    def validate_cors_origins(cls, v: List[str], info_or_values: Any) -> List[str]:
        """Warn about wildcard CORS in production.

        Args:
            v: List of CORS origins
            info_or_values: Pydantic validation context

        Returns:
            Validated CORS origins
        """
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

    def get_sentry_token(self) -> str:
        """
        Get Sentry API token with fallback logic.

        Priority:
        1. SENTRY_API_TOKEN (preferred)
        2. SENTRY_TOKEN (legacy, for backward compatibility)

        Returns:
            The Sentry API token or empty string if not configured
        """
        return self.SENTRY_API_TOKEN or self.SENTRY_TOKEN

    if PYDANTIC_V2:
        model_config = {
            "env_file": ".env",
            "env_file_encoding": "utf-8",
            "case_sensitive": True,
            "extra": "allow",
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
                "ENABLE_EXTERNAL_APIS": True,
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


# Global settings cache for runtime reload support
_settings_cache: Optional[AppSettings] = None


def reload_settings() -> AppSettings:
    """
    Force reload settings from environment.

    Clears cache and re-reads all environment variables.
    This allows runtime configuration changes without application restart.

    Returns:
        Freshly loaded AppSettings object

    Example:
        >>> # Change environment variable
        >>> os.environ['ENABLE_PROFILING'] = 'true'
        >>> # Reload configuration
        >>> new_settings = reload_settings()
        >>> assert new_settings.ENABLE_PROFILING is True
    """
    global _settings_cache
    _settings_cache = None
    return get_settings()


def get_settings() -> AppSettings:
    """
    Get application settings with YAML config applied.

    Uses cached settings for performance. To force reload from environment,
    use reload_settings() instead.

    Returns:
        AppSettings object with values from env vars and YAML config
    """
    global _settings_cache

    # Return cached settings if available
    if _settings_cache is not None:
        return _settings_cache

    # First load base settings from env vars and .env file
    app_settings = AppSettings()

    # CORS origins are already loaded from environment

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

    # Cache the settings
    _settings_cache = app_settings

    return app_settings
