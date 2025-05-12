from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Union, Any
from enum import Enum


class HttpMethod(str, Enum):
    """HTTP methods for API endpoints"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"


class ApiEndpoint(BaseModel):
    """Enhanced API endpoint configuration.
    
    Represents a single API endpoint with its path, method, and additional metadata.
    """
    path: str = Field(..., description="Template path with placeholders like {param}")
    method: HttpMethod = Field(default=HttpMethod.GET, description="HTTP method")
    headers: Optional[Dict[str, str]] = Field(default=None, description="Default headers")
    params: Optional[Dict[str, Any]] = Field(default=None, description="Default query parameters")
    requires_auth: bool = Field(default=True, description="Whether endpoint requires authentication")
    rate_limited: bool = Field(default=True, description="Whether endpoint is subject to rate limiting")
    cache_ttl: Optional[int] = Field(default=None, description="TTL in seconds, None = no caching")
    description: Optional[str] = Field(default=None, description="Human-readable description")
    response_model: Optional[str] = Field(default=None, description="Pydantic model name for response validation")
    
    class Config:
        use_enum_values = True


class ApiCategory(BaseModel):
    """Group of related API endpoints.
    
    Used to organize endpoints by functional area (e.g., issues, events, projects).
    """
    name: str = Field(..., description="Category display name")
    base_path: Optional[str] = Field(default=None, description="Base path prefix for all endpoints in category")
    endpoints: Dict[str, ApiEndpoint] = Field(default_factory=dict, description="Mapping of endpoint names to configurations")


class ApiPathConfig(BaseModel):
    """Complete API configuration.
    
    Top-level container for the entire API path configuration.
    """
    version: str = Field(..., description="Configuration schema version")
    base_url: str = Field(..., description="Base URL for all API endpoints")
    categories: Dict[str, ApiCategory] = Field(default_factory=dict, description="Mapping of category names to configurations")
