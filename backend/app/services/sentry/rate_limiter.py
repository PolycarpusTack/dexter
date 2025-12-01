"""
Token Bucket Rate Limiter

Implements a thread-safe token bucket algorithm for rate limiting API requests.
Supports configurable requests per minute and respects Retry-After headers.
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Optional


class RateLimitExceededError(Exception):
    """Raised when rate limit is exceeded and no queue is available."""

    def __init__(self, retry_after: Optional[float] = None):
        self.retry_after = retry_after
        message = f"Rate limit exceeded. Retry after {retry_after}s" if retry_after else "Rate limit exceeded"
        super().__init__(message)


class RateLimiter:
    """
    Token bucket rate limiter for controlling request rates.

    Implements a token bucket algorithm with the following features:
    - Configurable requests per minute
    - Automatic token refill
    - Support for Retry-After header delays
    - Thread-safe for async operations

    Example:
        limiter = RateLimiter(requests_per_minute=100)
        async with limiter:
            # Make API request
            response = await client.get(url)
    """

    def __init__(
        self,
        requests_per_minute: int = 100,
        max_burst: Optional[int] = None,
    ):
        """
        Initialize the rate limiter.

        Args:
            requests_per_minute: Maximum number of requests allowed per minute
            max_burst: Maximum burst size (defaults to requests_per_minute)
        """
        self.requests_per_minute = requests_per_minute
        self.max_burst = max_burst or requests_per_minute
        self.tokens = float(self.max_burst)
        self.last_refill = time.time()
        self.refill_rate = requests_per_minute / 60.0  # Tokens per second
        self.lock = asyncio.Lock()
        self.retry_after_until: Optional[datetime] = None

    async def acquire(self, tokens: int = 1, wait: bool = True) -> bool:
        """
        Acquire tokens from the bucket.

        Args:
            tokens: Number of tokens to acquire (typically 1 request = 1 token)
            wait: If True, wait for tokens to become available. If False, raise error.

        Returns:
            True if tokens were acquired

        Raises:
            RateLimitExceededError: If tokens cannot be acquired and wait=False
        """
        async with self.lock:
            # Check if we're in a Retry-After period
            if self.retry_after_until:
                now = datetime.now()
                if now < self.retry_after_until:
                    wait_seconds = (self.retry_after_until - now).total_seconds()
                    if not wait:
                        raise RateLimitExceededError(retry_after=wait_seconds)
                    await asyncio.sleep(wait_seconds)
                else:
                    # Retry-After period has passed
                    self.retry_after_until = None

            # Refill tokens based on elapsed time
            await self._refill_tokens()

            # Check if we have enough tokens
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            elif not wait:
                # Calculate how long until we have enough tokens
                tokens_needed = tokens - self.tokens
                wait_seconds = tokens_needed / self.refill_rate
                raise RateLimitExceededError(retry_after=wait_seconds)
            else:
                # Wait for tokens to refill
                tokens_needed = tokens - self.tokens
                wait_seconds = tokens_needed / self.refill_rate
                await asyncio.sleep(wait_seconds)
                await self._refill_tokens()
                self.tokens -= tokens
                return True

    async def _refill_tokens(self) -> None:
        """Refill tokens based on elapsed time since last refill."""
        now = time.time()
        elapsed = now - self.last_refill
        new_tokens = elapsed * self.refill_rate
        self.tokens = min(self.max_burst, self.tokens + new_tokens)
        self.last_refill = now

    def set_retry_after(self, seconds: float) -> None:
        """
        Set a Retry-After delay (typically from a 429 response).

        Args:
            seconds: Number of seconds to wait before allowing requests
        """
        self.retry_after_until = datetime.now() + timedelta(seconds=seconds)

    async def __aenter__(self):
        """Context manager entry - acquire a token."""
        await self.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        # If we got a rate limit response, parse Retry-After
        # This will be handled by the BaseDataClient
        pass

    def get_available_tokens(self) -> float:
        """
        Get the current number of available tokens.

        Returns:
            Number of tokens currently available
        """
        return self.tokens

    def reset(self) -> None:
        """Reset the rate limiter to initial state."""
        self.tokens = float(self.max_burst)
        self.last_refill = time.time()
        self.retry_after_until = None
