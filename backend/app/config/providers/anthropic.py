"""
Anthropic provider configuration.

This module contains the configuration for the Anthropic provider,
including API key management, model settings, and usage tracking.
"""
from pydantic import BaseModel, Field, SecretStr
from typing import Dict, List, Optional, Set

from app.core.config import AppSettings


class AnthropicConfig(BaseModel):
    """Configuration for Anthropic API."""
    
    # API credentials
    api_key: Optional[SecretStr] = Field(
        None, 
        description="Anthropic API key. If not provided, value from ANTHROPIC_API_KEY environment variable will be used."
    )
    
    # API endpoints
    api_base: str = Field(
        "https://api.anthropic.com", 
        description="Anthropic API base URL."
    )
    api_version: str = Field(
        "v1", 
        description="Anthropic API version."
    )
    
    # Rate limiting
    requests_per_minute: int = Field(
        60, 
        description="Maximum number of requests per minute.",
        ge=1
    )
    
    # Timeout settings
    timeout: float = Field(
        30.0, 
        description="Request timeout in seconds.",
        ge=1.0
    )
    
    # Default model settings
    default_model: str = Field(
        "claude-3-opus-20240229", 
        description="Default model to use."
    )
    
    # Available models
    available_models: Set[str] = Field(
        {
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2"
        }, 
        description="Set of available models."
    )
    
    # Model parameters
    default_parameters: Dict[str, any] = Field(
        {
            "temperature": 0.7,
            "max_tokens": 1024,
            "top_p": 1.0,
            "top_k": 5
        },
        description="Default parameters for model requests."
    )
    
    # Usage tracking
    track_usage: bool = Field(
        True, 
        description="Whether to track API usage."
    )
    
    # Retry settings
    max_retries: int = Field(
        3, 
        description="Maximum number of retries for failed requests.",
        ge=0
    )
    retry_delay: float = Field(
        1.0, 
        description="Initial delay between retries in seconds.",
        ge=0.1
    )
    retry_multiplier: float = Field(
        2.0, 
        description="Multiplier for increasing retry delay (exponential backoff).",
        ge=1.0
    )
    
    # Advanced settings
    streaming: bool = Field(
        False, 
        description="Whether to use streaming responses by default."
    )


def get_anthropic_config(settings: AppSettings) -> AnthropicConfig:
    """
    Get Anthropic configuration from application settings.
    
    Args:
        settings: Application settings
        
    Returns:
        Anthropic configuration
    """
    config = AnthropicConfig()
    
    # If API key is provided in environment, use it
    if settings.ANTHROPIC_API_KEY:
        config.api_key = SecretStr(settings.ANTHROPIC_API_KEY)
    
    # Override default settings from app config if provided
    if hasattr(settings, 'ANTHROPIC_DEFAULT_MODEL') and settings.ANTHROPIC_DEFAULT_MODEL:
        config.default_model = settings.ANTHROPIC_DEFAULT_MODEL
        
    if hasattr(settings, 'ANTHROPIC_API_BASE') and settings.ANTHROPIC_API_BASE:
        config.api_base = settings.ANTHROPIC_API_BASE
        
    if hasattr(settings, 'ANTHROPIC_API_VERSION') and settings.ANTHROPIC_API_VERSION:
        config.api_version = settings.ANTHROPIC_API_VERSION
        
    if hasattr(settings, 'ANTHROPIC_TIMEOUT') and settings.ANTHROPIC_TIMEOUT:
        config.timeout = settings.ANTHROPIC_TIMEOUT
        
    if hasattr(settings, 'ANTHROPIC_MAX_RETRIES') and settings.ANTHROPIC_MAX_RETRIES is not None:
        config.max_retries = settings.ANTHROPIC_MAX_RETRIES
    
    return config