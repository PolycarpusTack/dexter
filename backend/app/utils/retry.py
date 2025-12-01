"""
Retry Logic with Exponential Backoff.

Based on: external/sentry-python/sentry_sdk/transport.py
Provides resilient retry logic for external API calls.

This module provides decorators for adding retry logic with:
- Exponential backoff
- Configurable jitter
- Retryable exception filtering
- Callback hooks for monitoring

Usage:
    @async_retry(max_attempts=3, base_delay=1.0)
    async def call_external_api():
        ...

    @retry(max_attempts=3, base_delay=1.0)
    def call_sync_api():
        ...
"""

import asyncio
import functools
import random
import time
import logging
from typing import Callable, TypeVar, Any, Optional, Tuple, Type
from dataclasses import dataclass

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    jitter_range: float = 0.25
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,)


def calculate_delay(
    attempt: int,
    config: RetryConfig
) -> float:
    """
    Calculate delay with exponential backoff and optional jitter.

    Args:
        attempt: Current attempt number (0-indexed)
        config: Retry configuration

    Returns:
        Delay in seconds before next attempt
    """
    # Exponential backoff
    delay = min(
        config.base_delay * (config.exponential_base ** attempt),
        config.max_delay
    )

    if config.jitter:
        # Add random jitter (±jitter_range)
        jitter = delay * config.jitter_range * (2 * random.random() - 1)
        delay = max(0, delay + jitter)

    return delay


def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
    on_failure: Optional[Callable[[Exception, int], None]] = None
) -> Callable:
    """
    Decorator for sync functions with retry logic.

    Args:
        max_attempts: Maximum number of attempts
        base_delay: Initial delay between attempts in seconds
        max_delay: Maximum delay between attempts in seconds
        exponential_base: Base for exponential backoff
        jitter: Whether to add random jitter to delays
        retryable_exceptions: Tuple of exceptions that should trigger retry
        on_retry: Callback called on each retry (exception, attempt)
        on_failure: Callback called when all retries fail (exception, attempts)

    Returns:
        Decorated function with retry logic

    Usage:
        @retry(max_attempts=3, base_delay=1.0)
        def call_external_api():
            ...

        @retry(
            max_attempts=3,
            retryable_exceptions=(ConnectionError, TimeoutError)
        )
        def call_flaky_api():
            ...
    """
    config = RetryConfig(
        max_attempts=max_attempts,
        base_delay=base_delay,
        max_delay=max_delay,
        exponential_base=exponential_base,
        jitter=jitter,
        retryable_exceptions=retryable_exceptions
    )

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Optional[Exception] = None

            for attempt in range(config.max_attempts):
                try:
                    return func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_exception = e

                    if attempt + 1 >= config.max_attempts:
                        logger.error(
                            f"All {config.max_attempts} attempts failed for {func.__name__}",
                            exc_info=True
                        )
                        if on_failure:
                            on_failure(e, config.max_attempts)
                        raise

                    delay = calculate_delay(attempt, config)

                    logger.warning(
                        f"Attempt {attempt + 1}/{config.max_attempts} failed for "
                        f"{func.__name__}, retrying in {delay:.2f}s: {type(e).__name__}: {e}"
                    )

                    if on_retry:
                        on_retry(e, attempt)

                    time.sleep(delay)

            # Should never reach here, but satisfy type checker
            raise last_exception  # type: ignore

        return wrapper
    return decorator


def async_retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    on_retry: Optional[Callable[[Exception, int], None]] = None,
    on_failure: Optional[Callable[[Exception, int], None]] = None
) -> Callable:
    """
    Decorator for async functions with retry logic.

    Args:
        max_attempts: Maximum number of attempts
        base_delay: Initial delay between attempts in seconds
        max_delay: Maximum delay between attempts in seconds
        exponential_base: Base for exponential backoff
        jitter: Whether to add random jitter to delays
        retryable_exceptions: Tuple of exceptions that should trigger retry
        on_retry: Callback called on each retry (exception, attempt)
        on_failure: Callback called when all retries fail (exception, attempts)

    Returns:
        Decorated function with retry logic

    Usage:
        @async_retry(max_attempts=3, base_delay=1.0)
        async def call_external_api():
            ...

        @async_retry(
            max_attempts=3,
            retryable_exceptions=(httpx.TimeoutException, httpx.ConnectError)
        )
        async def fetch_from_api():
            ...
    """
    config = RetryConfig(
        max_attempts=max_attempts,
        base_delay=base_delay,
        max_delay=max_delay,
        exponential_base=exponential_base,
        jitter=jitter,
        retryable_exceptions=retryable_exceptions
    )

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Optional[Exception] = None

            for attempt in range(config.max_attempts):
                try:
                    return await func(*args, **kwargs)
                except config.retryable_exceptions as e:
                    last_exception = e

                    if attempt + 1 >= config.max_attempts:
                        logger.error(
                            f"All {config.max_attempts} attempts failed for {func.__name__}",
                            exc_info=True
                        )
                        if on_failure:
                            on_failure(e, config.max_attempts)
                        raise

                    delay = calculate_delay(attempt, config)

                    logger.warning(
                        f"Attempt {attempt + 1}/{config.max_attempts} failed for "
                        f"{func.__name__}, retrying in {delay:.2f}s: {type(e).__name__}: {e}"
                    )

                    if on_retry:
                        on_retry(e, attempt)

                    await asyncio.sleep(delay)

            # Should never reach here, but satisfy type checker
            raise last_exception  # type: ignore

        return wrapper
    return decorator


class RetryContext:
    """
    Context manager for retry logic without decorators.

    Useful for more complex retry scenarios where decorator isn't suitable.

    Usage:
        async with RetryContext(max_attempts=3) as ctx:
            while ctx.should_retry():
                try:
                    result = await risky_operation()
                    break
                except Exception as e:
                    await ctx.handle_failure(e)
    """

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        retryable_exceptions: Tuple[Type[Exception], ...] = (Exception,)
    ):
        self.config = RetryConfig(
            max_attempts=max_attempts,
            base_delay=base_delay,
            max_delay=max_delay,
            retryable_exceptions=retryable_exceptions
        )
        self.attempt = 0
        self.last_exception: Optional[Exception] = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def should_retry(self) -> bool:
        """Check if another retry attempt should be made."""
        return self.attempt < self.config.max_attempts

    async def handle_failure(self, exception: Exception) -> None:
        """
        Handle a failed attempt.

        Raises the exception if max attempts reached or exception isn't retryable.
        """
        self.last_exception = exception
        self.attempt += 1

        if not isinstance(exception, self.config.retryable_exceptions):
            raise exception

        if self.attempt >= self.config.max_attempts:
            logger.error(
                f"All {self.config.max_attempts} attempts failed",
                exc_info=True
            )
            raise exception

        delay = calculate_delay(self.attempt - 1, self.config)
        logger.warning(
            f"Attempt {self.attempt}/{self.config.max_attempts} failed, "
            f"retrying in {delay:.2f}s: {exception}"
        )
        await asyncio.sleep(delay)

    def handle_failure_sync(self, exception: Exception) -> None:
        """Synchronous version of handle_failure."""
        self.last_exception = exception
        self.attempt += 1

        if not isinstance(exception, self.config.retryable_exceptions):
            raise exception

        if self.attempt >= self.config.max_attempts:
            logger.error(
                f"All {self.config.max_attempts} attempts failed",
                exc_info=True
            )
            raise exception

        delay = calculate_delay(self.attempt - 1, self.config)
        logger.warning(
            f"Attempt {self.attempt}/{self.config.max_attempts} failed, "
            f"retrying in {delay:.2f}s: {exception}"
        )
        time.sleep(delay)


# ==================== Common Retry Configurations ====================


# Sentry API: 3 attempts, 1s initial delay, handles connection issues
SENTRY_API_RETRY = {
    "max_attempts": 3,
    "base_delay": 1.0,
    "max_delay": 30.0,
    "retryable_exceptions": (ConnectionError, TimeoutError, OSError)
}

# LLM API: 2 attempts, 2s initial delay (LLM calls are expensive)
LLM_API_RETRY = {
    "max_attempts": 2,
    "base_delay": 2.0,
    "max_delay": 30.0,
    "retryable_exceptions": (ConnectionError, TimeoutError, OSError)
}

# Embedding generation: 3 attempts, 0.5s initial delay
EMBEDDING_RETRY = {
    "max_attempts": 3,
    "base_delay": 0.5,
    "max_delay": 10.0,
    "retryable_exceptions": (RuntimeError, ConnectionError, OSError)
}

# Database operations: 3 attempts, 0.1s initial delay
DATABASE_RETRY = {
    "max_attempts": 3,
    "base_delay": 0.1,
    "max_delay": 5.0,
    "retryable_exceptions": (ConnectionError, OSError)
}

# Webhook delivery: 5 attempts, 1s initial delay (webhooks can be flaky)
WEBHOOK_RETRY = {
    "max_attempts": 5,
    "base_delay": 1.0,
    "max_delay": 60.0,
    "retryable_exceptions": (ConnectionError, TimeoutError, OSError)
}


# ==================== Convenience Functions ====================


def with_sentry_retry(func: Callable) -> Callable:
    """Apply Sentry API retry configuration to a function."""
    return async_retry(**SENTRY_API_RETRY)(func)


def with_llm_retry(func: Callable) -> Callable:
    """Apply LLM API retry configuration to a function."""
    return async_retry(**LLM_API_RETRY)(func)


def with_embedding_retry(func: Callable) -> Callable:
    """Apply embedding retry configuration to a function."""
    return async_retry(**EMBEDDING_RETRY)(func)


def with_database_retry(func: Callable) -> Callable:
    """Apply database retry configuration to a function."""
    return async_retry(**DATABASE_RETRY)(func)


def with_webhook_retry(func: Callable) -> Callable:
    """Apply webhook retry configuration to a function."""
    return async_retry(**WEBHOOK_RETRY)(func)
