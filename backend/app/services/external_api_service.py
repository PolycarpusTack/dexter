import asyncio
import hashlib
import logging
import secrets
import time
from datetime import datetime
from enum import Enum
from pathlib import Path
import httpx
import yaml
import aiofiles
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.models.common import ApiResponse

# backend/app/services/external_api_service.py

logger = logging.getLogger(__name__)


class ExternalAPIProvider(str, Enum):
    """Supported external API providers."""

    GITHUB = "github"
    JIRA = "jira"
    GITLAB = "gitlab"
    BITBUCKET = "bitbucket"
    SLACK = "slack"
    TEAMS = "teams"
    DISCORD = "discord"
    GENERIC = "generic"
    CUSTOM = "custom"


class ExternalAPIAuthType(str, Enum):
    """Authentication types for external APIs."""

    NONE = "none"
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    BASIC = "basic"
    BEARER = "bearer"
    CUSTOM = "custom"


class RateLimitPolicy(str, Enum):
    """Rate limit policies for API requests."""

    NONE = "none"
    FIXED = "fixed"  # Fixed rate (e.g., 60 requests per minute)
    ADAPTIVE = "adaptive"  # Adjusts based on response headers
    TOKEN_BUCKET = "token_bucket"  # Token bucket algorithm


class APIStatus(str, Enum):
    """Status of an API integration."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    RATE_LIMITED = "rate_limited"
    UNAUTHORIZED = "unauthorized"


class RetryStrategy(BaseModel):
    """Configuration for API request retry strategy."""

    max_retries: int = Field(3, description="Maximum number of retry attempts")
    initial_delay: float = Field(1.0, description="Initial delay between retries in seconds")
    max_delay: float = Field(60.0, description="Maximum delay between retries in seconds")
    backoff_factor: float = Field(2.0, description="Exponential backoff multiplier")
    retry_status_codes: List[int] = Field(
        default=[429, 500, 502, 503, 504],
        description="HTTP status codes that should trigger a retry",
    )


class RateLimitConfig(BaseModel):
    """Configuration for API rate limiting."""

    policy: RateLimitPolicy = Field(RateLimitPolicy.ADAPTIVE, description="Rate limit policy")
    requests_per_minute: Optional[int] = Field(
        60, description="Maximum requests per minute for fixed policy"
    )
    burst_size: Optional[int] = Field(10, description="Burst size for token bucket policy")
    header_limit_remaining: Optional[str] = Field(
        None, description="Response header indicating remaining requests"
    )
    header_limit_reset: Optional[str] = Field(
        None, description="Response header indicating rate limit reset time"
    )


class CacheConfig(BaseModel):
    """Configuration for API response caching."""

    enabled: bool = Field(True, description="Whether caching is enabled")
    ttl_success: int = Field(300, description="Cache TTL for successful responses in seconds")
    ttl_error: int = Field(60, description="Cache TTL for error responses in seconds")
    max_size: int = Field(1000, description="Maximum number of cached responses")
    cache_keys: List[str] = Field(
        default=["url", "method"],
        description="Request attributes to include in cache key",
    )


class AuthConfig(BaseModel):
    """Authentication configuration for an external API."""

    type: ExternalAPIAuthType = Field(..., description="Authentication type")
    api_key: Optional[str] = Field(None, description="API key for API_KEY auth type")
    api_key_header: Optional[str] = Field("X-API-Key", description="Header name for API key")
    token: Optional[str] = Field(None, description="Bearer token for BEARER auth type")
    username: Optional[str] = Field(None, description="Username for BASIC auth type")
    password: Optional[str] = Field(None, description="Password for BASIC auth type")
    oauth2_token_url: Optional[str] = Field(None, description="Token URL for OAuth2")
    oauth2_client_id: Optional[str] = Field(None, description="Client ID for OAuth2")
    oauth2_client_secret: Optional[str] = Field(None, description="Client secret for OAuth2")
    oauth2_refresh_token: Optional[str] = Field(None, description="Refresh token for OAuth2")
    oauth2_access_token: Optional[str] = Field(None, description="Access token for OAuth2")
    oauth2_token_expiry: Optional[datetime] = Field(
        None, description="Expiry time for OAuth2 token"
    )

    # For security, we don't want to include sensitive fields in JSON output
    class Config:
        exclude = {
            "api_key",
            "password",
            "oauth2_client_secret",
            "oauth2_refresh_token",
            "oauth2_access_token",
        }


class ExternalAPIConfig(BaseModel):
    """Configuration for an external API integration."""

    id: str = Field(..., description="Unique identifier for this API integration")
    name: str = Field(..., description="Display name for the API integration")
    provider: ExternalAPIProvider = Field(..., description="API provider type")
    base_url: str = Field(..., description="Base URL for the API")
    description: Optional[str] = Field(None, description="Description of the API integration")
    auth: AuthConfig = Field(..., description="Authentication configuration")
    status: APIStatus = Field(
        APIStatus.INACTIVE, description="Current status of the API integration"
    )
    enabled: bool = Field(True, description="Whether this integration is enabled")
    version: Optional[str] = Field(None, description="API version")
    rate_limit: RateLimitConfig = Field(
        default_factory=RateLimitConfig, description="Rate limit configuration"
    )
    retry: RetryStrategy = Field(default_factory=RetryStrategy, description="Retry configuration")
    cache: CacheConfig = Field(default_factory=CacheConfig, description="Cache configuration")
    default_headers: Dict[str, str] = Field(
        default_factory=dict, description="Default headers for all requests"
    )
    default_timeout: float = Field(30.0, description="Default timeout in seconds")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional provider-specific metadata"
    )
    endpoints: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict, description="Endpoints configuration for this API"
    )
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update timestamp")

    class Config:
        exclude = {
            "auth.api_key",
            "auth.password",
            "auth.oauth2_client_secret",
            "auth.oauth2_refresh_token",
            "auth.oauth2_access_token",
        }


class ExternalAPIMetrics(BaseModel):
    """Usage metrics for an external API."""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time: float = 0.0
    last_request_time: Optional[datetime] = None
    rate_limit_hits: int = 0
    error_counts: Dict[str, int] = Field(default_factory=dict)

    def update_response_time(self, response_time: float) -> None:
        """Update the average response time with a new sample."""
        if self.total_requests == 0:
            self.avg_response_time = response_time
        else:
            # Weighted rolling average
            weight = min(0.1, 1.0 / self.total_requests)
            self.avg_response_time = (1 - weight) * self.avg_response_time + weight * response_time


class ExternalAPIRegistry:
    """Registry for external API integrations."""

    def __init__(self):
        self.apis: Dict[str, ExternalAPIConfig] = {}
        self.metrics: Dict[str, ExternalAPIMetrics] = {}
        self.clients: Dict[str, httpx.AsyncClient] = {}
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.config_dir = Path(__file__).parent.parent / "config" / "external_apis"
        self.loaded = False

    async def initialize(self):
        """Initialize the registry, loading configurations and setting up clients."""
        if self.loaded:
            return

        # Create config directory if it doesn't exist
        if not self.config_dir.exists():
            self.config_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created external API config directory: {self.config_dir}")

        # Load configurations from files
        await self.load_configs()

        # Initialize clients for each API
        for api_id, config in self.apis.items():
            if config.enabled:
                await self.init_client(api_id)

        self.loaded = True
        logger.info(f"External API registry initialized with {len(self.apis)} integrations")

    async def load_configs(self):
        """Load API configurations from YAML files."""
        try:
            # Load all .yaml files in the config directory
            for file_path in self.config_dir.glob("*.yaml"):
                try:
                    async with aiofiles.open(file_path, "r") as f:
                        content = await f.read()
                        config_data = yaml.safe_load(content)
                        if not config_data:
                            logger.warning(f"Empty or invalid config file: {file_path}")
                            continue

                        # Create API config from file data
                        api_config = ExternalAPIConfig(**config_data)
                        self.apis[api_config.id] = api_config
                        self.metrics[api_config.id] = ExternalAPIMetrics()
                        logger.info(
                            f"Loaded API configuration: {api_config.name} ({api_config.id})"
                        )

                except Exception as e:
                    logger.error(f"Error loading API config from {file_path}: {e}")
        except Exception as e:
            logger.error(f"Error loading API configurations: {e}")

    async def save_config(self, api_id: str) -> bool:
        """Save API configuration to a YAML file."""
        try:
            config = self.apis.get(api_id)
            if not config:
                logger.error(f"Cannot save config for unknown API ID: {api_id}")
                return False

            # Update timestamp
            config.updated_at = datetime.now()

            # Convert to dictionary (excluding sensitive info)
            config_dict = config.model_dump(
                exclude={
                    "auth.api_key",
                    "auth.password",
                    "auth.oauth2_client_secret",
                    "auth.oauth2_refresh_token",
                    "auth.oauth2_access_token",
                }
            )

            # Write to file asynchronously
            file_path = self.config_dir / f"{api_id}.yaml"
            async with aiofiles.open(file_path, "w") as f:
                yaml_content = yaml.dump(config_dict, default_flow_style=False)
                await f.write(yaml_content)

            logger.info(f"Saved API configuration for {config.name} ({api_id})")
            return True
        except Exception as e:
            logger.error(f"Error saving API configuration for {api_id}: {e}")
            return False

    async def init_client(self, api_id: str):
        """Initialize an HTTP client for an API integration."""
        config = self.apis.get(api_id)
        if not config:
            logger.error(f"Cannot initialize client for unknown API ID: {api_id}")
            return

        try:
            # Close existing client if present
            if api_id in self.clients:
                await self.clients[api_id].aclose()

            # Set up default headers
            headers = dict(config.default_headers)

            # Add auth headers based on auth type
            if config.auth.type == ExternalAPIAuthType.API_KEY and config.auth.api_key:
                headers[config.auth.api_key_header] = config.auth.api_key
            elif config.auth.type == ExternalAPIAuthType.BEARER and config.auth.token:
                headers["Authorization"] = f"Bearer {config.auth.token}"

            # Create new client
            client = httpx.AsyncClient(
                base_url=config.base_url,
                headers=headers,
                timeout=config.default_timeout,
                follow_redirects=True,
            )

            # Store client
            self.clients[api_id] = client

            # Update API status
            config.status = APIStatus.ACTIVE
            logger.info(f"Initialized HTTP client for {config.name} ({api_id})")

        except Exception as e:
            logger.error(f"Error initializing HTTP client for {api_id}: {e}")
            config.status = APIStatus.ERROR

    def get_cache_key(
        self, api_id: str, url: str, method: str, params: Dict[str, Any] = None
    ) -> str:
        """Generate a cache key for an API request."""
        config = self.apis.get(api_id)
        if not config or not config.cache.enabled:
            return None

        # Get cache key components
        components = []
        for key in config.cache.cache_keys:
            if key == "url":
                components.append(url)
            elif key == "method":
                components.append(method.upper())
            elif key == "params" and params:
                # Sort parameters to ensure consistent keys
                param_str = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
                components.append(param_str)

        # Generate a hash of the components
        key_str = "|".join(components)
        key_hash = hashlib.md5(key_str.encode()).hexdigest()
        return f"{api_id}:{key_hash}"

    def get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get a cached API response."""
        if not cache_key or cache_key not in self.cache:
            return None

        entry = self.cache.get(cache_key)
        if not entry or entry.get("expires_at", 0) < time.time():
            # Cache expired
            return None

        return entry.get("data")

    def cache_response(
        self,
        cache_key: str,
        data: Dict[str, Any],
        is_error: bool = False,
        api_id: str = None,
    ) -> None:
        """Cache an API response."""
        if not cache_key:
            return

        # Get cache TTL (different for success vs error)
        ttl = 60  # Default 1 minute
        if api_id and api_id in self.apis:
            config = self.apis[api_id]
            if is_error:
                ttl = config.cache.ttl_error
            else:
                ttl = config.cache.ttl_success

        # Store in cache
        self.cache[cache_key] = {
            "data": data,
            "expires_at": time.time() + ttl,
            "cached_at": time.time(),
        }

        # Limit cache size
        if api_id and api_id in self.apis:
            max_size = self.apis[api_id].cache.max_size
            if len(self.cache) > max_size:
                # Remove oldest entries
                oldest_keys = sorted(
                    self.cache.keys(), key=lambda k: self.cache[k].get("cached_at", 0)
                )[: len(self.cache) - max_size]

                for key in oldest_keys:
                    del self.cache[key]

    async def request(
        self,
        api_id: str,
        endpoint: str,
        method: str = "GET",
        params: Dict[str, Any] = None,
        data: Any = None,
        json_data: Dict[str, Any] = None,
        headers: Dict[str, Any] = None,
        use_cache: bool = True,
        timeout: float = None,
    ) -> ApiResponse:
        """Make a request to an external API."""
        # Get API configuration
        config = self.apis.get(api_id)
        if not config:
            return ApiResponse(success=False, error="Unknown API integration ID", status_code=404)

        # Check if API is enabled
        if not config.enabled:
            return ApiResponse(
                success=False,
                error=f"API integration '{config.name}' is disabled",
                status_code=503,
            )

        # Initialize client if not already done
        if api_id not in self.clients:
            await self.init_client(api_id)

        # Get client
        client = self.clients.get(api_id)
        if not client:
            return ApiResponse(
                success=False,
                error=f"Failed to initialize client for API '{config.name}'",
                status_code=500,
            )

        # Prepare request URL
        if endpoint.startswith("http"):
            url = endpoint  # Full URL provided
        else:
            # Check if endpoint is in config
            if endpoint in config.endpoints:
                endpoint_config = config.endpoints[endpoint]
                endpoint_path = endpoint_config.get("path", endpoint)

                # Substitute path parameters if any
                if params:
                    # Copy params to avoid modifying original
                    params_copy = dict(params)
                    try:
                        endpoint_path = endpoint_path.format(**params_copy)
                        # Remove used params
                        for key in endpoint_path.count("{"):
                            if key in params_copy:
                                del params_copy[key]
                        params = params_copy
                    except KeyError as e:
                        logger.warning(f"Missing path parameter for {endpoint}: {e}")
                        # Continue with unformatted path
                url = endpoint_path
            else:
                # Just use endpoint as path
                url = endpoint

        # Check cache for GET requests
        cache_key = None
        if method.upper() == "GET" and use_cache and config.cache.enabled:
            cache_key = self.get_cache_key(api_id, url, method, params)
            cached_response = self.get_cached_response(cache_key)
            if cached_response:
                # Update metrics for cache hit
                metrics = self.metrics.get(api_id, ExternalAPIMetrics())
                metrics.total_requests += 1
                metrics.successful_requests += 1
                metrics.last_request_time = datetime.now()

                return ApiResponse(success=True, data=cached_response, status_code=200, cached=True)

        # Update request metrics
        metrics = self.metrics.get(api_id, ExternalAPIMetrics())
        metrics.total_requests += 1
        metrics.last_request_time = datetime.now()

        # Prepare timeout
        request_timeout = timeout or config.default_timeout

        # Make request with retry logic
        retry_count = 0
        start_time = time.time()

        while retry_count <= config.retry.max_retries:
            try:
                # Make the request
                response = await client.request(
                    method=method,
                    url=url,
                    params=params,
                    data=data,
                    json=json_data,
                    headers=headers,
                    timeout=request_timeout,
                )

                # Calculate response time
                response_time = time.time() - start_time
                metrics.update_response_time(response_time)

                # Handle rate limiting
                if response.status_code == 429:
                    metrics.rate_limit_hits += 1
                    config.status = APIStatus.RATE_LIMITED

                    # Extract rate limit info from headers if available
                    retry_after = None
                    if "Retry-After" in response.headers:
                        try:
                            retry_after = float(response.headers["Retry-After"])
                        except ValueError:
                            pass

                    if retry_count < config.retry.max_retries:
                        # Calculate backoff delay
                        if retry_after:
                            delay = min(retry_after, config.retry.max_delay)
                        else:
                            delay = min(
                                config.retry.initial_delay
                                * (config.retry.backoff_factor**retry_count),
                                config.retry.max_delay,
                            )

                        logger.warning(
                            f"Rate limited on {config.name} API. Retrying in {delay:.1f}s "
                            f"({retry_count+1}/{config.retry.max_retries})"
                        )
                        await asyncio.sleep(delay)
                        retry_count += 1
                        continue

                # Check if we need to retry based on status code
                if (
                    response.status_code in config.retry.retry_status_codes
                    and retry_count < config.retry.max_retries
                    and response.status_code != 429  # Rate limiting handled separately
                ):
                    delay = min(
                        config.retry.initial_delay * (config.retry.backoff_factor**retry_count),
                        config.retry.max_delay,
                    )
                    logger.warning(
                        f"Retrying {config.name} API request due to status {response.status_code}. "
                        f"Retry {retry_count+1}/{config.retry.max_retries} in {delay:.1f}s"
                    )
                    await asyncio.sleep(delay)
                    retry_count += 1
                    continue

                # Process successful response
                if response.status_code < 400:
                    metrics.successful_requests += 1
                    config.status = APIStatus.ACTIVE

                    # Parse response data
                    response_data = None
                    content_type = response.headers.get("content-type", "").lower()

                    try:
                        if "application/json" in content_type:
                            response_data = response.json()
                        else:
                            # For non-JSON responses, include text content and headers
                            response_data = {
                                "content": response.text,
                                "content_type": content_type,
                                "headers": dict(response.headers),
                            }
                    except ValueError:
                        # If JSON parsing fails, return text
                        response_data = {
                            "content": response.text,
                            "content_type": content_type,
                            "headers": dict(response.headers),
                        }

                    # Cache successful GET response
                    if method.upper() == "GET" and config.cache.enabled and cache_key:
                        self.cache_response(cache_key, response_data, False, api_id)

                    return ApiResponse(
                        success=True,
                        data=response_data,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                    )
                else:
                    # Handle error response
                    metrics.failed_requests += 1

                    # Update error counts by status code
                    error_key = str(response.status_code)
                    metrics.error_counts[error_key] = metrics.error_counts.get(error_key, 0) + 1

                    # Update API status for auth errors
                    if response.status_code == 401:
                        config.status = APIStatus.UNAUTHORIZED
                    elif response.status_code >= 500:
                        config.status = APIStatus.ERROR

                    # Try to parse error details
                    error_data = None
                    try:
                        if "application/json" in response.headers.get("content-type", "").lower():
                            error_data = response.json()
                    except ValueError:
                        error_data = {"message": response.text[:500]}

                    error_message = "API request failed"
                    if error_data and isinstance(error_data, dict):
                        if "message" in error_data:
                            error_message = error_data["message"]
                        elif "error" in error_data:
                            error_message = error_data.get("error", error_message)
                            if isinstance(error_message, dict) and "message" in error_message:
                                error_message = error_message["message"]

                    # Cache error response for GET if configured
                    if method.upper() == "GET" and config.cache.enabled and cache_key:
                        # Only cache client (4xx) errors, not server errors
                        if 400 <= response.status_code < 500:
                            self.cache_response(
                                cache_key,
                                {"error": error_message, "details": error_data},
                                True,
                                api_id,
                            )

                    return ApiResponse(
                        success=False,
                        error=error_message,
                        data=error_data,
                        status_code=response.status_code,
                        headers=dict(response.headers),
                    )

            except httpx.TimeoutException:
                metrics.failed_requests += 1
                error_key = "timeout"
                metrics.error_counts[error_key] = metrics.error_counts.get(error_key, 0) + 1

                if retry_count < config.retry.max_retries:
                    delay = min(
                        config.retry.initial_delay * (config.retry.backoff_factor**retry_count),
                        config.retry.max_delay,
                    )
                    logger.warning(
                        f"Timeout on {config.name} API. Retrying in {delay:.1f}s "
                        f"({retry_count+1}/{config.retry.max_retries})"
                    )
                    await asyncio.sleep(delay)
                    retry_count += 1
                    continue
                else:
                    return ApiResponse(
                        success=False,
                        error=f"Request to {config.name} API timed out after {request_timeout} seconds",
                        status_code=408,
                    )

            except httpx.RequestError as e:
                metrics.failed_requests += 1
                error_key = "connection"
                metrics.error_counts[error_key] = metrics.error_counts.get(error_key, 0) + 1

                if retry_count < config.retry.max_retries:
                    delay = min(
                        config.retry.initial_delay * (config.retry.backoff_factor**retry_count),
                        config.retry.max_delay,
                    )
                    logger.warning(
                        f"Connection error on {config.name} API: {str(e)}. Retrying in {delay:.1f}s "
                        f"({retry_count+1}/{config.retry.max_retries})"
                    )
                    await asyncio.sleep(delay)
                    retry_count += 1
                    continue
                else:
                    config.status = APIStatus.ERROR
                    return ApiResponse(
                        success=False,
                        error=f"Connection error: {str(e)}",
                        status_code=503,
                    )

            except Exception as e:
                metrics.failed_requests += 1
                error_key = "other"
                metrics.error_counts[error_key] = metrics.error_counts.get(error_key, 0) + 1
                logger.exception(f"Unexpected error in API request to {config.name}: {str(e)}")

                config.status = APIStatus.ERROR
                return ApiResponse(
                    success=False, error=f"Unexpected error: {str(e)}", status_code=500
                )

        # If we've exhausted retries
        return ApiResponse(
            success=False,
            error=f"Request failed after {config.retry.max_retries} retries",
            status_code=500,
        )

    async def test_connection(self, api_id: str) -> ApiResponse:
        """Test connectivity to an API integration."""
        config = self.apis.get(api_id)
        if not config:
            return ApiResponse(success=False, error="Unknown API integration ID", status_code=404)

        # Try to find a test endpoint in the config
        test_endpoint = None
        for endpoint_name, endpoint_data in config.endpoints.items():
            if endpoint_data.get("test_endpoint", False):
                test_endpoint = endpoint_name
                break

        # If no test endpoint found, use a generic path or health check
        if not test_endpoint:
            # Default test endpoints for known providers
            if config.provider == ExternalAPIProvider.GITHUB:
                test_endpoint = "/rate_limit"
            elif config.provider == ExternalAPIProvider.JIRA:
                test_endpoint = "/rest/api/2/myself"
            elif config.provider == ExternalAPIProvider.GITLAB:
                test_endpoint = "/api/v4/version"
            elif config.provider == ExternalAPIProvider.BITBUCKET:
                test_endpoint = "/2.0/user"
            elif config.provider == ExternalAPIProvider.SLACK:
                test_endpoint = "/api/auth.test"
            else:
                # Try a common health or version endpoint
                for path in [
                    "/health",
                    "/version",
                    "/api/status",
                    "/api/v1/status",
                    "/status",
                ]:
                    test_endpoint = path
                    break

        # Make test request
        result = await self.request(
            api_id=api_id,
            endpoint=test_endpoint,
            method="GET",
            use_cache=False,
            timeout=10.0,  # Quick timeout for test
        )

        # Update API status based on result
        if result.success:
            config.status = APIStatus.ACTIVE
        elif result.status_code == 401:
            config.status = APIStatus.UNAUTHORIZED
        elif result.status_code == 429:
            config.status = APIStatus.RATE_LIMITED
        else:
            config.status = APIStatus.ERROR

        # Save updated status
        await self.save_config(api_id)

        return result

    async def get_api_status(self, api_id: str) -> ApiResponse:
        """Get status and metrics for an API integration."""
        config = self.apis.get(api_id)
        if not config:
            return ApiResponse(success=False, error="Unknown API integration ID", status_code=404)

        metrics = self.metrics.get(api_id, ExternalAPIMetrics())

        # Calculate success rate
        success_rate = 0
        if metrics.total_requests > 0:
            success_rate = metrics.successful_requests / metrics.total_requests

        return ApiResponse(
            success=True,
            data={
                "status": config.status,
                "metrics": {
                    "total_requests": metrics.total_requests,
                    "successful_requests": metrics.successful_requests,
                    "failed_requests": metrics.failed_requests,
                    "success_rate": success_rate,
                    "avg_response_time": metrics.avg_response_time,
                    "last_request_time": metrics.last_request_time.isoformat()
                    if metrics.last_request_time
                    else None,
                    "rate_limit_hits": metrics.rate_limit_hits,
                    "error_breakdown": metrics.error_counts,
                },
                "last_updated": config.updated_at.isoformat(),
                "endpoints": len(config.endpoints),
            },
            status_code=200,
        )

    async def create_api(self, config_data: Dict[str, Any]) -> ApiResponse:
        """Create a new API integration."""
        try:
            # Generate an ID if not provided
            if "id" not in config_data:
                config_data[
                    "id"
                ] = f"{config_data.get('provider', 'api').lower()}-{secrets.token_hex(4)}"

            # Create config object
            api_config = ExternalAPIConfig(**config_data)

            # Check if ID already exists
            if api_config.id in self.apis:
                return ApiResponse(
                    success=False,
                    error=f"API integration with ID '{api_config.id}' already exists",
                    status_code=409,
                )

            # Add to registry
            self.apis[api_config.id] = api_config
            self.metrics[api_config.id] = ExternalAPIMetrics()

            # Initialize client
            await self.init_client(api_config.id)

            # Save config to file
            await self.save_config(api_config.id)

            return ApiResponse(
                success=True,
                data={
                    "id": api_config.id,
                    "name": api_config.name,
                    "status": api_config.status,
                },
                status_code=201,
            )
        except Exception as e:
            logger.exception(f"Error creating API integration: {e}")
            return ApiResponse(
                success=False,
                error=f"Failed to create API integration: {str(e)}",
                status_code=500,
            )

    async def update_api(self, api_id: str, config_data: Dict[str, Any]) -> ApiResponse:
        """Update an existing API integration."""
        if api_id not in self.apis:
            return ApiResponse(
                success=False,
                error=f"API integration with ID '{api_id}' not found",
                status_code=404,
            )

        try:
            # Get existing config
            existing_config = self.apis[api_id]

            # Update fields
            for key, value in config_data.items():
                if key != "id":  # Don't allow changing the ID
                    setattr(existing_config, key, value)

            # Update timestamp
            existing_config.updated_at = datetime.now()

            # Re-initialize client if needed
            need_client_update = any(
                key in config_data
                for key in ["base_url", "auth", "default_headers", "default_timeout"]
            )

            if need_client_update:
                await self.init_client(api_id)

            # Save config to file
            await self.save_config(api_id)

            return ApiResponse(
                success=True,
                data={
                    "id": api_id,
                    "name": existing_config.name,
                    "status": existing_config.status,
                },
                status_code=200,
            )
        except Exception as e:
            logger.exception(f"Error updating API integration {api_id}: {e}")
            return ApiResponse(
                success=False,
                error=f"Failed to update API integration: {str(e)}",
                status_code=500,
            )

    async def delete_api(self, api_id: str) -> ApiResponse:
        """Delete an API integration."""
        if api_id not in self.apis:
            return ApiResponse(
                success=False,
                error=f"API integration with ID '{api_id}' not found",
                status_code=404,
            )

        try:
            # Close client if exists
            if api_id in self.clients:
                await self.clients[api_id].aclose()
                del self.clients[api_id]

            # Remove from registry
            del self.apis[api_id]
            if api_id in self.metrics:
                del self.metrics[api_id]

            # Remove config file
            config_file = self.config_dir / f"{api_id}.yaml"
            if config_file.exists():
                config_file.unlink()

            return ApiResponse(
                success=True,
                data={"message": f"API integration '{api_id}' deleted successfully"},
                status_code=200,
            )
        except Exception as e:
            logger.exception(f"Error deleting API integration {api_id}: {e}")
            return ApiResponse(
                success=False,
                error=f"Failed to delete API integration: {str(e)}",
                status_code=500,
            )

    async def list_apis(self) -> ApiResponse:
        """List all registered API integrations."""
        try:
            api_list = []
            for api_id, config in self.apis.items():
                metrics = self.metrics.get(api_id, ExternalAPIMetrics())

                # Calculate success rate
                success_rate = 0
                if metrics.total_requests > 0:
                    success_rate = metrics.successful_requests / metrics.total_requests

                api_list.append(
                    {
                        "id": api_id,
                        "name": config.name,
                        "provider": config.provider,
                        "status": config.status,
                        "enabled": config.enabled,
                        "base_url": config.base_url,
                        "auth_type": config.auth.type,
                        "success_rate": success_rate,
                        "total_requests": metrics.total_requests,
                        "endpoints_count": len(config.endpoints),
                        "last_request_time": metrics.last_request_time.isoformat()
                        if metrics.last_request_time
                        else None,
                        "description": config.description,
                    }
                )

            return ApiResponse(
                success=True,
                data={"apis": api_list, "count": len(api_list)},
                status_code=200,
            )
        except Exception as e:
            logger.exception(f"Error listing API integrations: {e}")
            return ApiResponse(
                success=False,
                error=f"Failed to list API integrations: {str(e)}",
                status_code=500,
            )

    async def get_api_details(self, api_id: str) -> ApiResponse:
        """Get detailed information about an API integration."""
        if api_id not in self.apis:
            return ApiResponse(
                success=False,
                error=f"API integration with ID '{api_id}' not found",
                status_code=404,
            )

        try:
            config = self.apis[api_id]

            # Clean sensitive information
            api_data = config.model_dump(
                exclude={
                    "auth.api_key",
                    "auth.password",
                    "auth.oauth2_client_secret",
                    "auth.oauth2_refresh_token",
                    "auth.oauth2_access_token",
                }
            )

            # Add metrics information
            metrics = self.metrics.get(api_id, ExternalAPIMetrics())
            api_data["metrics"] = metrics.model_dump()

            # Calculate success rate
            if metrics.total_requests > 0:
                api_data["metrics"]["success_rate"] = (
                    metrics.successful_requests / metrics.total_requests
                )
            else:
                api_data["metrics"]["success_rate"] = 0

            return ApiResponse(success=True, data=api_data, status_code=200)
        except Exception as e:
            logger.exception(f"Error getting API details for {api_id}: {e}")
            return ApiResponse(
                success=False,
                error=f"Failed to get API details: {str(e)}",
                status_code=500,
            )

    def configure_endpoints(self, api_id: str, endpoints: Dict[str, Dict[str, Any]]) -> ApiResponse:
        """Configure endpoints for an API integration."""
        if api_id not in self.apis:
            return ApiResponse(
                success=False,
                error=f"API integration with ID '{api_id}' not found",
                status_code=404,
            )

        try:
            config = self.apis[api_id]

            # Update endpoints
            config.endpoints = endpoints
            config.updated_at = datetime.now()

            # Save config
            asyncio.create_task(self.save_config(api_id))

            return ApiResponse(
                success=True,
                data={"message": f"Configured {len(endpoints)} endpoints for API '{config.name}'"},
                status_code=200,
            )
        except Exception as e:
            logger.exception(f"Error configuring endpoints for API {api_id}: {e}")
            return ApiResponse(
                success=False,
                error=f"Failed to configure endpoints: {str(e)}",
                status_code=500,
            )

    async def close(self):
        """Close all HTTP clients."""
        for api_id, client in self.clients.items():
            try:
                await client.aclose()
                logger.info(f"Closed HTTP client for API {api_id}")
            except Exception as e:
                logger.error(f"Error closing HTTP client for API {api_id}: {e}")

        self.clients = {}
        logger.info("All API clients closed")


# Global registry instance
external_api_registry = ExternalAPIRegistry()

# Singleton accessor function


def get_external_api_registry() -> ExternalAPIRegistry:
    return external_api_registry


class ExternalAPIService:
    """Facade service over ExternalAPIRegistry for ease of use.

    Provides a stable interface expected by other services.
    """

    def __init__(self, registry: Optional[ExternalAPIRegistry] = None) -> None:
        self._registry = registry or external_api_registry

    async def initialize(self) -> None:
        await self._registry.initialize()

    async def request(
        self,
        api_id: str,
        endpoint: str,
        method: str = "GET",
        params: Optional[Dict[str, Any]] = None,
        data: Any = None,
        json_data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
        timeout: Optional[float] = None,
    ) -> ApiResponse:
        return await self._registry.request(
            api_id=api_id,
            endpoint=endpoint,
            method=method,
            params=params or {},
            data=data,
            json_data=json_data or {},
            headers=headers or {},
            use_cache=use_cache,
            timeout=timeout,
        )

    async def close(self) -> None:
        await self._registry.close()
