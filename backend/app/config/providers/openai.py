"""
OpenAI provider configuration.

This module contains the configuration for the OpenAI provider,
including API key management, model settings, and usage tracking.
"""
from pydantic import BaseModel, Field, SecretStr
from typing import Dict, List, Optional, Set

from app.core.config import AppSettings


class OpenAIConfig(BaseModel):
    """Configuration for OpenAI API."""
    
    # API credentials
    api_key: Optional[SecretStr] = Field(
        None, 
        description="OpenAI API key. If not provided, value from OPENAI_API_KEY environment variable will be used."
    )
    organization_id: Optional[str] = Field(
        None, 
        description="OpenAI organization ID for usage tracking."
    )
    
    # API endpoints
    api_base: str = Field(
        "https://api.openai.com/v1", 
        description="OpenAI API base URL."
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
        "gpt-4o", 
        description="Default model to use."
    )
    
    # Available models
    available_models: Set[str] = Field(
        {"gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"}, 
        description="Set of available models."
    )
    
    # Model parameters
    default_parameters: Dict[str, any] = Field(
        {
            "temperature": 0.7,
            "max_tokens": 1024,
            "top_p": 1.0,
            "frequency_penalty": 0.0,
            "presence_penalty": 0.0
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
    use_azure: bool = Field(
        False, 
        description="Whether to use Azure OpenAI instead of the standard OpenAI API."
    )


def get_openai_config(settings: AppSettings) -> OpenAIConfig:
    """
    Get OpenAI configuration from application settings.
    
    Args:
        settings: Application settings
        
    Returns:
        OpenAI configuration
    """
    config = OpenAIConfig()
    
    # If API key is provided in environment, use it
    if settings.OPENAI_API_KEY:
        config.api_key = SecretStr(settings.OPENAI_API_KEY)
        
    # If organization ID is provided in environment, use it
    if settings.OPENAI_ORGANIZATION_ID:
        config.organization_id = settings.OPENAI_ORGANIZATION_ID
    
    # Override default settings from app config if provided
    if hasattr(settings, 'OPENAI_DEFAULT_MODEL') and settings.OPENAI_DEFAULT_MODEL:
        config.default_model = settings.OPENAI_DEFAULT_MODEL
        
    if hasattr(settings, 'OPENAI_API_BASE') and settings.OPENAI_API_BASE:
        config.api_base = settings.OPENAI_API_BASE
        
    if hasattr(settings, 'OPENAI_TIMEOUT') and settings.OPENAI_TIMEOUT:
        config.timeout = settings.OPENAI_TIMEOUT
        
    if hasattr(settings, 'OPENAI_MAX_RETRIES') and settings.OPENAI_MAX_RETRIES is not None:
        config.max_retries = settings.OPENAI_MAX_RETRIES
        
    if hasattr(settings, 'OPENAI_USE_AZURE') and settings.OPENAI_USE_AZURE is not None:
        config.use_azure = settings.OPENAI_USE_AZURE
    
    return config