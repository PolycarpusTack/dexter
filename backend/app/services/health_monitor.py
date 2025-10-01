"""
Health monitoring service for external services.

This module provides utilities for checking the health of external services
that the application depends on, such as Sentry, Ollama, and Redis.
"""
import time
import logging
import asyncio
import httpx
from typing import Dict, Any, List, Optional

from app.models.system import ServiceStatus

# Set up logging
logger = logging.getLogger(__name__)


class HealthMonitor:
    """Health monitoring service for external services."""

    def __init__(self):
        """Initialize the health monitor."""
        self.service_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = 60  # seconds

    async def check_service(
        self,
        name: str,
        url: str,
        method: str = "GET",
        timeout: float = 3.0,
        headers: Optional[Dict[str, str]] = None,
        expected_status: Optional[int] = None,
    ) -> ServiceStatus:
        """
        Check the health of a service.

        Args:
            name: Service name
            url: Service URL to check
            method: HTTP method to use
            timeout: Request timeout in seconds
            headers: Optional HTTP headers
            expected_status: Expected HTTP status code

        Returns:
            ServiceStatus object
        """
        # Check if we have a cached result that's still valid
        cached = self.service_cache.get(name)
        current_time = time.time()
        if cached and (current_time - cached["timestamp"] < self.cache_ttl):
            return cached["status"]

        # Set default headers
        if headers is None:
            headers = {}

        # Format timestamp for response
        iso_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        try:
            # Make the request
            start_time = time.time()
            async with httpx.AsyncClient(timeout=timeout) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers)
                elif method.upper() == "POST":
                    response = await client.post(url, headers=headers)
                elif method.upper() == "HEAD":
                    response = await client.head(url, headers=headers)
                else:
                    logger.warning(f"Unsupported method {method} for health check")
                    response = await client.get(url, headers=headers)

                # Calculate response time in milliseconds
                response_time = (time.time() - start_time) * 1000

                # Determine status
                if expected_status and response.status_code != expected_status:
                    status = "degraded"
                elif 200 <= response.status_code < 300:
                    status = "up"
                elif 300 <= response.status_code < 400:
                    status = "degraded"
                elif 400 <= response.status_code < 500:
                    status = "degraded"
                else:
                    status = "down"

                service_status = ServiceStatus(
                    name=name,
                    status=status,
                    response_time=response_time,
                    last_checked=iso_time,
                )

                # Cache the result
                self.service_cache[name] = {"status": service_status, "timestamp": current_time}

                return service_status

        except (httpx.RequestError, asyncio.TimeoutError) as e:
            logger.warning(f"Health check failed for {name}: {e}")
            service_status = ServiceStatus(
                name=name,
                status="down",
                response_time=0,
                last_checked=iso_time,
            )

            # Cache the result
            self.service_cache[name] = {"status": service_status, "timestamp": current_time}

            return service_status

    async def check_sentry(self, base_url: str, token: Optional[str] = None) -> ServiceStatus:
        """
        Check Sentry API health.

        Args:
            base_url: Sentry API base URL
            token: Optional auth token

        Returns:
            ServiceStatus for Sentry
        """
        # Skip if URL is missing
        if not base_url:
            return ServiceStatus(
                name="Sentry API",
                status="unknown",
                response_time=0,
                last_checked=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )

        # Prepare headers
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        return await self.check_service(
            name="Sentry API", url=f"{base_url}/api/0/", headers=headers
        )

    async def check_ollama(self, base_url: str) -> ServiceStatus:
        """
        Check Ollama API health.

        Args:
            base_url: Ollama API base URL

        Returns:
            ServiceStatus for Ollama
        """
        # Skip if URL is missing
        if not base_url:
            return ServiceStatus(
                name="Ollama AI",
                status="unknown",
                response_time=0,
                last_checked=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            )

        return await self.check_service(name="Ollama AI", url=f"{base_url}/api/tags")

    async def check_redis(self, redis_url: str) -> Optional[ServiceStatus]:
        """
        Check Redis health.

        Args:
            redis_url: Redis connection URL

        Returns:
            ServiceStatus for Redis, or None if not configured
        """
        # Skip if URL is missing
        if not redis_url:
            return None

        # For a real implementation, use the aioredis library
        # This is a simplified check that only validates the URL format
        if redis_url.startswith("redis://"):
            try:
                # Parse redis URL to get host and port for potential socket check
                # For now just return a mock status
                return ServiceStatus(
                    name="Redis Cache",
                    status="up",
                    response_time=5.0,
                    last_checked=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                )
            except Exception as e:
                logger.warning(f"Error checking Redis: {e}")

        return ServiceStatus(
            name="Redis Cache",
            status="unknown",
            response_time=0,
            last_checked=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )

    async def check_all_services(
        self,
        sentry_url: str = "",
        sentry_token: str = "",
        ollama_url: str = "",
        redis_url: str = "",
    ) -> List[ServiceStatus]:
        """
        Check all configured services concurrently.

        Args:
            sentry_url: Sentry API base URL
            sentry_token: Sentry auth token
            ollama_url: Ollama API base URL
            redis_url: Redis connection URL

        Returns:
            List of ServiceStatus objects for all services
        """
        tasks = []

        # Add checks for configured services
        if sentry_url:
            tasks.append(self.check_sentry(sentry_url, sentry_token))

        if ollama_url:
            tasks.append(self.check_ollama(ollama_url))

        if redis_url:
            redis_check = self.check_redis(redis_url)
            if redis_check is not None:
                tasks.append(redis_check)

        # Run all checks concurrently
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Filter out exceptions and None results
            service_statuses = []
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Service check failed: {result}")
                elif result is not None:
                    service_statuses.append(result)

            return service_statuses
        except Exception as e:
            logger.error(f"Error checking services: {e}")
            # Return empty list on failure
            return []


# Create singleton instance
health_monitor = HealthMonitor()


def get_health_monitor() -> HealthMonitor:
    """Get the health monitor singleton instance."""
    return health_monitor
