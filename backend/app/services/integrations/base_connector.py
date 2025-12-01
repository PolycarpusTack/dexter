# Constants
DEFAULT_TIMEOUT_SECONDS = 3600
MS_PER_SECOND = 1000

"""
Base connector interface for external system integrations.

This module provides the abstract base class that all external system connectors
must implement, including common functionality for authentication, rate limiting,
retry mechanisms, connection pooling, and metrics collection.
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Dict, Optional

if TYPE_CHECKING:
    from app.services.integrations.auth_manager import AuthManager
from enum import Enum
import httpx
from pydantic import BaseModel, Field, validator
import threading
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class ConnectorError(Exception):
    """Base exception for connector operations."""


class AuthenticationError(ConnectorError):
    """Raised when authentication fails."""


class RateLimitError(ConnectorError):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str, retry_after: Optional[float] = None) -> None:
        """Initialize the instance with provided configuration."""
        super().__init__(message)
        self.retry_after = retry_after


class ConnectionPoolError(ConnectorError):
    """Raised when connection pool operations fail."""


class ConnectorHealth(str, Enum):
    """Health status of a connector."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class RetryConfig(BaseModel):
    """Configuration for retry logic."""

    max_retries: int = Field(3, description="Maximum number of retry attempts")
    initial_delay: float = Field(1.0, description="Initial delay in seconds")
    max_delay: float = Field(60.0, description="Maximum delay in seconds")
    exponential_base: float = Field(2.0, description="Base for exponential backoff")
    jitter: bool = Field(True, description="Add jitter to retry delays")

    @validator("max_retries")
    def validate_max_retries(cls, v) -> None:
        """Validate that max_retries is a positive integer."""
        if v < 0:
            raise ValueError("max_retries must be non-negative")
        return v


class RateLimitConfig(BaseModel):
    """Configuration for rate limiting using token bucket algorithm."""

    bucket_size: int = Field(100, description="Maximum number of tokens in bucket")
    refill_rate: float = Field(10.0, description="Tokens refilled per second")
    burst_multiplier: float = Field(1.5, description="Burst capacity multiplier")

    @validator("bucket_size")
    def validate_bucket_size(cls, v) -> None:
        """Validate that bucket_size is within allowed range."""
        if v <= 0:
            raise ValueError("bucket_size must be positive")
        return v

    @validator("refill_rate")
    def validate_refill_rate(cls, v) -> None:
        """Validate that refill_rate is a positive number."""
        if v <= 0:
            raise ValueError("refill_rate must be positive")
        return v


class ConnectionPoolConfig(BaseModel):
    """Configuration for connection pooling."""

    min_connections: int = Field(1, description="Minimum connections to maintain")
    max_connections: int = Field(10, description="Maximum connections allowed")
    connection_timeout: float = Field(30.0, description="Connection timeout in seconds")
    idle_timeout: float = Field(300.0, description="Idle connection timeout in seconds")
    max_lifetime: float = Field(
        DEFAULT_TIMEOUT_SECONDS, description="Maximum connection lifetime in seconds"
    )

    @validator("max_connections")
    def validate_max_connections(cls, v, values) -> None:
        """Validate that max_connections is within allowed range."""
        if "min_connections" in values and v < values["min_connections"]:
            raise ValueError("max_connections must be >= min_connections")
        return v


class ConnectorConfig(BaseModel):
    """Complete configuration for a connector."""

    name: str = Field(..., description="Connector name")
    base_url: str = Field(..., description="Base URL for the external system")
    timeout: float = Field(30.0, description="Default request timeout in seconds")

    # Sub-configurations
    retry_config: RetryConfig = Field(default_factory=RetryConfig)
    rate_limit_config: RateLimitConfig = Field(default_factory=RateLimitConfig)
    pool_config: ConnectionPoolConfig = Field(default_factory=ConnectionPoolConfig)

    # Feature flags
    enable_metrics: bool = Field(True, description="Enable metrics collection")
    enable_caching: bool = Field(True, description="Enable response caching")
    enable_circuit_breaker: bool = Field(True, description="Enable circuit breaker pattern")

    # Circuit breaker config
    circuit_breaker_threshold: int = Field(5, description="Failures before opening circuit")
    circuit_breaker_timeout: float = Field(60.0, description="Time before attempting reset")

    class Config:
        """Pydantic configuration."""

        json_encoders = {timedelta: lambda v: v.total_seconds()}


class ConnectorMetrics(BaseModel):
    """Metrics collected by a connector."""

    total_requests: int = Field(0, description="Total number of requests made")
    successful_requests: int = Field(0, description="Number of successful requests")
    failed_requests: int = Field(0, description="Number of failed requests")
    total_retries: int = Field(0, description="Total number of retries")
    rate_limited_requests: int = Field(0, description="Number of rate limited requests")

    average_response_time_ms: float = Field(0.0, description="Average response time")
    min_response_time_ms: float = Field(float("inf"), description="Minimum response time")
    max_response_time_ms: float = Field(0.0, description="Maximum response time")

    last_request_time: Optional[datetime] = Field(None, description="Time of last request")
    last_error_time: Optional[datetime] = Field(None, description="Time of last error")
    last_error_message: Optional[str] = Field(None, description="Last error message")

    circuit_breaker_trips: int = Field(0, description="Number of circuit breaker trips")
    current_circuit_state: str = Field("closed", description="Current circuit breaker state")

    active_connections: int = Field(0, description="Current active connections")
    connection_pool_size: int = Field(0, description="Current connection pool size")

    def record_request(self, success: bool, response_time_ms: float) -> None:
        """Record a request in metrics."""
        self.total_requests += 1
        self.last_request_time = datetime.utcnow()

        if success:
            self.successful_requests += 1
        else:
            self.failed_requests += 1
            self.last_error_time = datetime.utcnow()

        # Update response time stats
        if response_time_ms > 0:
            if self.average_response_time_ms == 0:
                self.average_response_time_ms = response_time_ms
            else:
                # Running average
                self.average_response_time_ms = (
                    self.average_response_time_ms * (self.total_requests - 1) + response_time_ms
                ) / self.total_requests

            self.min_response_time_ms = min(self.min_response_time_ms, response_time_ms)
            self.max_response_time_ms = max(self.max_response_time_ms, response_time_ms)

    class Config:
        """Pydantic configuration."""

        json_encoders = {datetime: lambda v: v.isoformat()}


class TokenBucket:
    """Token bucket implementation for rate limiting."""

    def __init__(self, size: int, refill_rate: float) -> None:
        """Initialize the instance with provided configuration."""
        self.size = size
        self.refill_rate = refill_rate
        self.tokens = float(size)
        self.last_update = time.time()
        self.lock = threading.Lock()

    def consume(self, tokens: int = 1) -> tuple[bool, float]:
        """
        Try to consume tokens from the bucket.

        Returns:
            tuple: (success, wait_time_if_failed)
        """
        with self.lock:
            now = time.time()
            elapsed = now - self.last_update

            # Refill bucket
            self.tokens = min(self.size, self.tokens + elapsed * self.refill_rate)
            self.last_update = now

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True, 0.0
            else:
                # Calculate wait time
                needed = tokens - self.tokens
                wait_time = needed / self.refill_rate
                return False, wait_time


class CircuitBreaker:
    """Circuit breaker implementation."""

    class State(Enum):
        """Maintains the internal state of the connector including rate limiting and connection pooling."""

        CLOSED = "closed"
        OPEN = "open"
        HALF_OPEN = "half_open"

    def __init__(self, failure_threshold: int, timeout: float) -> None:
        """Initialize the instance with provided configuration."""
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = self.State.CLOSED
        self.lock = threading.Lock()

    def record_success(self) -> None:
        """Record a successful operation."""
        with self.lock:
            self.failure_count = 0
            if self.state == self.State.HALF_OPEN:
                self.state = self.State.CLOSED

    def record_failure(self) -> None:
        """Record a failed operation."""
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.failure_count >= self.failure_threshold:
                self.state = self.State.OPEN

    def can_proceed(self) -> bool:
        """Check if requests can proceed."""
        with self.lock:
            if self.state == self.State.CLOSED:
                return True

            if self.state == self.State.OPEN:
                if self.last_failure_time and (time.time() - self.last_failure_time) > self.timeout:
                    self.state = self.State.HALF_OPEN
                    return True
                return False

            # HALF_OPEN state
            return True


class BaseConnector(ABC):
    """
    Abstract base class for all external system connectors.

    This class provides common functionality that all connectors inherit,
    including authentication, rate limiting, retry logic, connection pooling,
    error handling, and metrics collection.
    """

    def __init__(
        self, config: ConnectorConfig, auth_manager: Optional["AuthManager"] = None
    ) -> None:
        """
        Initialize the base connector.

        Args:
            config: Connector configuration
            auth_manager: Optional authentication manager
        """
        self.config = config
        self.auth_manager = auth_manager
        self.metrics = ConnectorMetrics()

        # Initialize components
        self._token_bucket = TokenBucket(
            config.rate_limit_config.bucket_size, config.rate_limit_config.refill_rate
        )

        self._circuit_breaker = (
            CircuitBreaker(config.circuit_breaker_threshold, config.circuit_breaker_timeout)
            if config.enable_circuit_breaker
            else None
        )

        # HTTP client with connection pooling
        self._client: Optional[httpx.AsyncClient] = None
        self._client_lock = asyncio.Lock()

        logger.info(f"Initialized {self.__class__.__name__} connector: {config.name}")

    @abstractmethod
    def connector_type(self) -> str:
        """Return the type identifier for this connector."""
        ...

    @abstractmethod
    async def validate_connection(self) -> bool:
        """
        Validate that the connector can establish a connection.

        Returns:
            True if connection is valid
        """
        ...

    @abstractmethod
    async def get_capabilities(self) -> Dict[str, Any]:
        """
        Get the capabilities of the connected system.

        Returns:
            Dictionary describing system capabilities
        """
        ...

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client with connection pooling."""
        if self._client is None:
            async with self._client_lock:
                if self._client is None:
                    limits = httpx.Limits(
                        max_connections=self.config.pool_config.max_connections,
                        max_keepalive_connections=self.config.pool_config.min_connections,
                        keepalive_expiry=self.config.pool_config.idle_timeout,
                    )

                    self._client = httpx.AsyncClient(
                        base_url=self.config.base_url,
                        timeout=self.config.timeout,
                        limits=limits,
                        headers={"User-Agent": f"Dexter-Connector/{self.connector_type()}"},
                    )

        return self._client

    async def _check_rate_limit(self, tokens: int = 1) -> None:
        """Check and consume rate limit tokens."""
        success, wait_time = self._token_bucket.consume(tokens)

        if not success:
            self.metrics.rate_limited_requests += 1
            raise RateLimitError(
                f"Rate limit exceeded. Try again in {wait_time:.1f} seconds", retry_after=wait_time
            )

    async def _check_circuit_breaker(self) -> None:
        """Check if circuit breaker allows requests."""
        if self._circuit_breaker and not self._circuit_breaker.can_proceed():
            self.metrics.current_circuit_state = self._circuit_breaker.state.value
            raise ConnectorError("Circuit breaker is open due to repeated failures")

    async def _with_retry(self, operation: callable, *args, **kwargs) -> Any:
        """Execute an operation with retry logic."""
        config = self.config.retry_config
        last_exception = None

        for attempt in range(config.max_retries + 1):
            try:
                # Check circuit breaker
                await self._check_circuit_breaker()

                # Execute operation
                result = await operation(*args, **kwargs)

                # Record success
                if self._circuit_breaker:
                    self._circuit_breaker.record_success()

                return result

            except RateLimitError:
                # Don't retry rate limit errors
                raise

            except Exception as e:
                last_exception = e
                self.metrics.total_retries += 1

                # Record failure
                if self._circuit_breaker:
                    self._circuit_breaker.record_failure()
                    self.metrics.circuit_breaker_trips = (
                        self.metrics.circuit_breaker_trips + 1
                        if self._circuit_breaker.state == CircuitBreaker.State.OPEN
                        else self.metrics.circuit_breaker_trips
                    )

                if attempt < config.max_retries:
                    # Calculate delay with exponential backoff
                    delay = min(
                        config.initial_delay * (config.exponential_base**attempt),
                        config.max_delay,
                    )

                    # Add jitter if enabled
                    if config.jitter:
                        import random

                        delay *= 0.5 + random.random()

                    logger.warning(
                        f"Retry {attempt + 1}/{config.max_retries} after {delay:.1f}s: {e}"
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All retries exhausted: {e}")

        raise last_exception

    @asynccontextmanager
    async def _timed_operation(self, operation_name: str) -> None:
        """Context manager for timing operations."""
        start_time = time.time()
        success = False

        try:
            yield
            success = True
        finally:
            elapsed_ms = (time.time() - start_time) * MS_PER_SECOND

            if self.config.enable_metrics:
                self.metrics.record_request(success, elapsed_ms)

            logger.debug(f"{operation_name} completed in {elapsed_ms:.1f}ms (success={success})")

    async def request(self, method: str, path: str, **kwargs) -> httpx.Response:
        """
        Make an authenticated HTTP request with retry and rate limiting.

        Args:
            method: HTTP method
            path: Request path (relative to base_url)
            **kwargs: Additional arguments for httpx

        Returns:
            HTTP response

        Raises:
            ConnectorError: On request failure
            RateLimitError: When rate limit is exceeded
            AuthenticationError: On authentication failure
        """
        # Check rate limit
        await self._check_rate_limit()

        # Get client
        client = await self._get_client()

        # Add authentication if available
        if self.auth_manager:
            kwargs = await self.auth_manager.apply_auth(kwargs)

        # Make request with retry
        async def _make_request() -> None:
            async with self._timed_operation(f"{method} {path}"):
                response = await client.request(method, path, **kwargs)

                # Check for auth errors
                if response.status_code == 401:
                    raise AuthenticationError("Authentication failed")

                # Check for rate limit errors
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    wait_time = float(retry_after) if retry_after else 60.0
                    raise RateLimitError(
                        f"Rate limited by server. Retry after {wait_time}s", retry_after=wait_time
                    )

                response.raise_for_status()
                return response

        try:
            return await self._with_retry(_make_request)
        except Exception as e:
            self.metrics.last_error_message = str(e)
            raise ConnectorError(f"Request failed: {e}") from e

    async def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the connector.

        Returns:
            Health check results
        """
        health_status = {
            "connector_type": self.connector_type(),
            "config_name": self.config.name,
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": self.metrics.dict(),
            "connection_valid": False,
            "capabilities": None,
            "errors": [],
        }

        try:
            # Test connection
            health_status["connection_valid"] = await self.validate_connection()

            # Get capabilities if connection is valid
            if health_status["connection_valid"]:
                health_status["capabilities"] = await self.get_capabilities()

        except Exception as e:
            health_status["errors"].append(str(e))
            logger.error(f"Health check failed: {e}")

        # Determine overall health
        if health_status["connection_valid"] and not health_status["errors"]:
            health_status["health"] = ConnectorHealth.HEALTHY
        elif health_status["connection_valid"]:
            health_status["health"] = ConnectorHealth.DEGRADED
        else:
            health_status["health"] = ConnectorHealth.UNHEALTHY

        return health_status

    async def close(self) -> None:
        """Clean up resources."""
        if self._client:
            await self._client.aclose()
            self._client = None

        logger.info(f"Closed {self.connector_type()} connector: {self.config.name}")

    def __repr__(self) -> str:
        """String representation of the connector."""
        return (
            f"<{self.__class__.__name__}("
            f"name={self.config.name}, "
            f"type={self.connector_type()}, "
            f"health={self.metrics.current_circuit_state})>"
        )
