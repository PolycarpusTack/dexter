"""
Circuit Breaker Pattern Implementation

Prevents cascade failures by stopping requests to failing services
and providing a recovery mechanism through half-open state testing.
"""

import asyncio
import time
from enum import Enum
from typing import Callable, Optional, TypeVar, Any


class CircuitState(str, Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Blocking requests due to failures
    HALF_OPEN = "half_open"  # Testing if service has recovered


class CircuitBreakerError(Exception):
    """Base exception for circuit breaker errors."""

    pass


class CircuitOpenError(CircuitBreakerError):
    """Raised when circuit is open and requests are blocked."""

    def __init__(self, retry_after: float):
        self.retry_after = retry_after
        super().__init__(
            f"Circuit breaker is OPEN. Service unavailable. Retry after {retry_after:.1f}s"
        )


T = TypeVar("T")


class CircuitBreaker:
    """
    Circuit breaker for protecting against cascade failures.

    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, block all requests
    - HALF_OPEN: Testing if service recovered, allow limited requests

    Example:
        breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            success_threshold=2
        )

        async with breaker:
            response = await make_api_call()
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        success_threshold: int = 2,
        expected_exception: type = Exception,
    ):
        """
        Initialize the circuit breaker.

        Args:
            failure_threshold: Number of consecutive failures before opening circuit
            recovery_timeout: Seconds to wait before attempting recovery (half-open)
            success_threshold: Successful requests needed in half-open to close circuit
            expected_exception: Exception type that counts as a failure
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        self.expected_exception = expected_exception

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.lock = asyncio.Lock()

    async def call(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """
        Execute a function with circuit breaker protection.

        Args:
            func: Async function to call
            *args: Positional arguments for func
            **kwargs: Keyword arguments for func

        Returns:
            Result of func

        Raises:
            CircuitOpenError: If circuit is open
            Exception: Any exception from func
        """
        async with self.lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                else:
                    retry_after = self._get_retry_after()
                    raise CircuitOpenError(retry_after=retry_after)

        # Execute the function
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except self.expected_exception as e:
            await self._on_failure()
            raise e

    async def _on_success(self) -> None:
        """Handle successful request."""
        async with self.lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.success_threshold:
                    self._close_circuit()
            else:
                # Reset failure count on success in CLOSED state
                self.failure_count = 0

    async def _on_failure(self) -> None:
        """Handle failed request."""
        async with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.state == CircuitState.HALF_OPEN:
                # Failure in half-open immediately opens circuit again
                self._open_circuit()
            elif self.failure_count >= self.failure_threshold:
                self._open_circuit()

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt recovery."""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.recovery_timeout

    def _get_retry_after(self) -> float:
        """Calculate seconds until recovery attempt."""
        if self.last_failure_time is None:
            return 0.0
        elapsed = time.time() - self.last_failure_time
        return max(0.0, self.recovery_timeout - elapsed)

    def _open_circuit(self) -> None:
        """Transition to OPEN state."""
        self.state = CircuitState.OPEN
        self.failure_count = 0

    def _close_circuit(self) -> None:
        """Transition to CLOSED state."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0

    async def __aenter__(self):
        """Context manager entry - check circuit state."""
        async with self.lock:
            if self.state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                else:
                    retry_after = self._get_retry_after()
                    raise CircuitOpenError(retry_after=retry_after)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - update state based on result."""
        if exc_type is None:
            # Success
            await self._on_success()
        elif issubclass(exc_type, self.expected_exception):
            # Expected failure
            await self._on_failure()
        # Don't suppress exceptions
        return False

    def get_state(self) -> CircuitState:
        """Get current circuit state."""
        return self.state

    def get_metrics(self) -> dict:
        """
        Get current circuit breaker metrics.

        Returns:
            Dictionary with state, failure_count, success_count, retry_after
        """
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "retry_after": self._get_retry_after() if self.state == CircuitState.OPEN else None,
        }

    def reset(self) -> None:
        """Manually reset circuit breaker to CLOSED state."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
