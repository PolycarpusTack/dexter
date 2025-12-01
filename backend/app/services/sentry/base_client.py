"""
Base Data Client

Abstract base class for all Sentry data source clients with built-in:
- Rate limiting (token bucket algorithm)
- Circuit breaker (failure protection)
- Exponential backoff retry logic
- Response caching
- Structured logging
"""

import asyncio
import logging
from abc import ABC
from typing import Any, Dict, List, Optional, TypeVar, Generic
from datetime import datetime, timedelta
from cachetools import TTLCache
import httpx

from .rate_limiter import RateLimiter, RateLimitExceededError
from .circuit_breaker import CircuitBreaker, CircuitOpenError

logger = logging.getLogger(__name__)

T = TypeVar("T")


class BaseDataClient(ABC, Generic[T]):
    """
    Abstract base class for Sentry data clients.

    Provides consistent infrastructure for:
    - HTTP requests with proper headers
    - Rate limiting (default 100 req/min)
    - Circuit breaker pattern
    - Exponential backoff retry (1s, 2s, 4s)
    - Response caching
    - Structured error handling

    Subclasses should:
    1. Define response models (Pydantic)
    2. Implement client-specific methods
    3. Use _request() for all HTTP calls

    Example:
        class ReleaseClient(BaseDataClient):
            async def get_releases(self, org_slug: str, project_slug: str):
                url = f"{self.base_url}/projects/{org_slug}/{project_slug}/releases/"
                return await self._request("GET", url)
    """

    def __init__(
        self,
        token: str,
        base_url: str = "https://sentry.io/api/0",
        timeout: int = 30,
        requests_per_minute: int = 100,
        enable_cache: bool = True,
        cache_ttl: int = 300,  # 5 minutes
        circuit_breaker_threshold: int = 5,
        circuit_breaker_timeout: float = 60.0,
    ):
        """
        Initialize the base data client.

        Args:
            token: Sentry API authentication token
            base_url: Base URL for Sentry API (default: https://sentry.io/api/0)
            timeout: Request timeout in seconds
            requests_per_minute: Rate limit (default 100 req/min)
            enable_cache: Enable response caching
            cache_ttl: Cache time-to-live in seconds (default 5 minutes)
            circuit_breaker_threshold: Failures before opening circuit
            circuit_breaker_timeout: Seconds before attempting recovery
        """
        self.token = token
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        # HTTP client
        self.client = httpx.AsyncClient(timeout=timeout)

        # Rate limiter
        self.rate_limiter = RateLimiter(requests_per_minute=requests_per_minute)

        # Circuit breaker
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=circuit_breaker_threshold,
            recovery_timeout=circuit_breaker_timeout,
            success_threshold=2,
            expected_exception=httpx.HTTPError,
        )

        # Response cache
        self.enable_cache = enable_cache
        if enable_cache:
            # Cache max size = requests_per_minute (one minute of unique requests)
            self.cache: TTLCache = TTLCache(maxsize=requests_per_minute, ttl=cache_ttl)
        else:
            self.cache = None

    async def _request(
        self,
        method: str,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None,
        use_cache: bool = True,
        retry_on: Optional[List[int]] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """
        Make an HTTP request with rate limiting, circuit breaker, and retry logic.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            url: Full URL or path (will be joined with base_url if relative)
            params: Query parameters
            data: Request body (for POST/PUT)
            headers: Additional headers
            use_cache: Use cached response if available (GET only)
            retry_on: HTTP status codes to retry on (default: [429, 502, 503, 504])
            max_retries: Maximum retry attempts (default: 3)

        Returns:
            Response data as dictionary

        Raises:
            CircuitOpenError: If circuit breaker is open
            RateLimitExceededError: If rate limit exceeded
            httpx.HTTPError: If request fails after retries
        """
        # Build full URL
        if not url.startswith("http"):
            url = f"{self.base_url}/{url.lstrip('/')}"

        # Check cache for GET requests
        cache_key = self._make_cache_key(method, url, params)
        if method == "GET" and use_cache and self.enable_cache and cache_key in self.cache:
            logger.debug(f"Cache HIT: {cache_key}")
            return self.cache[cache_key]

        # Default retry status codes
        if retry_on is None:
            retry_on = [429, 502, 503, 504]

        # Prepare headers
        request_headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        if headers:
            request_headers.update(headers)

        # Retry with exponential backoff
        backoff_delays = [1, 2, 4]  # 1s, 2s, 4s
        last_exception = None

        for attempt in range(max_retries):
            try:
                # Rate limiting
                await self.rate_limiter.acquire()

                # Circuit breaker protection
                async with self.circuit_breaker:
                    response = await self.client.request(
                        method=method,
                        url=url,
                        params=params,
                        json=data,
                        headers=request_headers,
                    )

                # Handle 429 (rate limit) specially
                if response.status_code == 429:
                    retry_after = self._parse_retry_after(response.headers)
                    self.rate_limiter.set_retry_after(retry_after)
                    logger.warning(
                        f"Rate limited by Sentry API. Retry after {retry_after}s",
                        extra={"url": url, "retry_after": retry_after},
                    )
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_after)
                        continue

                # Check if we should retry on this status code
                if response.status_code in retry_on and attempt < max_retries - 1:
                    delay = backoff_delays[min(attempt, len(backoff_delays) - 1)]
                    logger.warning(
                        f"Request failed with {response.status_code}. Retrying in {delay}s",
                        extra={
                            "url": url,
                            "status_code": response.status_code,
                            "attempt": attempt + 1,
                            "delay": delay,
                        },
                    )
                    await asyncio.sleep(delay)
                    continue

                # Raise for other 4xx/5xx errors
                response.raise_for_status()

                # Parse response
                result = response.json()

                # Cache successful GET requests
                if method == "GET" and self.enable_cache:
                    self.cache[cache_key] = result
                    logger.debug(f"Cache SET: {cache_key}")

                return result

            except httpx.HTTPStatusError as e:
                last_exception = e
                # Don't retry on client errors (except those in retry_on)
                if 400 <= e.response.status_code < 500 and e.response.status_code not in retry_on:
                    logger.error(
                        f"Client error {e.response.status_code} for {url}: {e.response.text}",
                        extra={
                            "url": url,
                            "status_code": e.response.status_code,
                            "response": e.response.text[:500],
                        },
                    )
                    raise
                # Retry on server errors
                if attempt < max_retries - 1:
                    delay = backoff_delays[min(attempt, len(backoff_delays) - 1)]
                    logger.warning(
                        f"Server error {e.response.status_code}. Retrying in {delay}s",
                        extra={
                            "url": url,
                            "status_code": e.response.status_code,
                            "attempt": attempt + 1,
                        },
                    )
                    await asyncio.sleep(delay)
                    continue

            except httpx.RequestError as e:
                last_exception = e
                logger.error(f"Request error for {url}: {str(e)}", extra={"url": url, "error": str(e)})
                if attempt < max_retries - 1:
                    delay = backoff_delays[min(attempt, len(backoff_delays) - 1)]
                    await asyncio.sleep(delay)
                    continue

            except CircuitOpenError:
                # Don't retry if circuit is open
                raise

        # All retries exhausted
        if last_exception:
            logger.error(
                f"Request failed after {max_retries} attempts: {url}",
                extra={"url": url, "max_retries": max_retries},
            )
            raise last_exception

    def _make_cache_key(self, method: str, url: str, params: Optional[Dict[str, Any]]) -> str:
        """Generate cache key from request parameters."""
        key_parts = [method, url]
        if params:
            # Sort params for consistent cache keys
            sorted_params = sorted(params.items())
            key_parts.append(str(sorted_params))
        return ":".join(key_parts)

    def _parse_retry_after(self, headers: httpx.Headers) -> float:
        """
        Parse Retry-After header from response.

        Args:
            headers: Response headers

        Returns:
            Seconds to wait (default 60 if not found)
        """
        retry_after = headers.get("Retry-After", "60")
        try:
            # Try parsing as seconds (integer)
            return float(retry_after)
        except ValueError:
            # Try parsing as HTTP date
            try:
                retry_date = datetime.strptime(retry_after, "%a, %d %b %Y %H:%M:%S GMT")
                delta = retry_date - datetime.utcnow()
                return max(0, delta.total_seconds())
            except ValueError:
                # Default to 60 seconds
                return 60.0

    async def close(self) -> None:
        """Close the HTTP client and cleanup resources."""
        await self.client.aclose()

    async def __aenter__(self):
        """Context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup."""
        await self.close()

    def get_metrics(self) -> Dict[str, Any]:
        """
        Get client metrics for monitoring.

        Returns:
            Dictionary with rate limiter, circuit breaker, and cache metrics
        """
        metrics = {
            "rate_limiter": {
                "available_tokens": self.rate_limiter.get_available_tokens(),
                "requests_per_minute": self.rate_limiter.requests_per_minute,
            },
            "circuit_breaker": self.circuit_breaker.get_metrics(),
        }

        if self.enable_cache:
            metrics["cache"] = {
                "size": len(self.cache),
                "max_size": self.cache.maxsize,
                "ttl": self.cache.ttl,
            }

        return metrics

    def clear_cache(self) -> None:
        """Clear the response cache."""
        if self.enable_cache:
            self.cache.clear()
            logger.info("Response cache cleared")
