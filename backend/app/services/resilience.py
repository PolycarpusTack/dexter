"""
Resilience Components for Enterprise-Grade Analysis

Implements circuit breaker pattern, retry policies, and other resilience
mechanisms for robust analyzer operation.
"""

import asyncio
import logging
from enum import Enum
from typing import Any, Callable, Dict, Optional, TypeVar
from datetime import datetime

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(str, Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker implementation to prevent cascading failures.

    Follows the standard circuit breaker pattern:
    - CLOSED: Normal operation, tracks failures
    - OPEN: Service is failing, reject calls immediately
    - HALF_OPEN: Allow limited calls to test recovery
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exceptions: tuple = (Exception,),
    ):
        """
        Initialize circuit breaker.

        Args:
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before trying again
            expected_exceptions: Exceptions that trigger circuit opening
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exceptions = expected_exceptions

        self.failure_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.state = CircuitState.CLOSED

        # Metrics
        self.call_count = 0
        self.success_count = 0
        self.failure_count_total = 0

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection.

        Args:
            func: Function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function

        Returns:
            Function result

        Raises:
            CircuitBreakerOpenError: When circuit is open
            Original exception: When function fails
        """
        self.call_count += 1

        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                logger.info("Circuit breaker moving to HALF_OPEN state")
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker is OPEN. Last failure: {self.last_failure_time}"
                )

        try:
            result = (
                await func(*args, **kwargs)
                if asyncio.iscoroutinefunction(func)
                else func(*args, **kwargs)
            )
            self._on_success()
            return result

        except self.expected_exceptions as e:
            self._on_failure(e)
            raise

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if not self.last_failure_time:
            return True

        return (datetime.utcnow() - self.last_failure_time).total_seconds() >= self.recovery_timeout

    def _on_success(self):
        """Handle successful call."""
        self.success_count += 1
        self.failure_count = 0

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            logger.info("Circuit breaker reset to CLOSED state")

    def _on_failure(self, exception: Exception):
        """Handle failed call."""
        self.failure_count += 1
        self.failure_count_total += 1
        self.last_failure_time = datetime.utcnow()

        logger.warning(
            f"Circuit breaker failure {self.failure_count}/{self.failure_threshold}: {exception}"
        )

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(f"Circuit breaker OPENED after {self.failure_count} failures")

    def reset(self):
        """Manually reset circuit breaker."""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        logger.info("Circuit breaker manually reset")

    def force_open(self):
        """Manually open circuit breaker."""
        self.state = CircuitState.OPEN
        self.last_failure_time = datetime.utcnow()
        logger.warning("Circuit breaker manually opened")

    @property
    def is_closed(self) -> bool:
        """Check if circuit is closed (normal operation)."""
        return self.state == CircuitState.CLOSED

    @property
    def is_open(self) -> bool:
        """Check if circuit is open (failing)."""
        return self.state == CircuitState.OPEN

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.call_count == 0:
            return 1.0
        return self.success_count / self.call_count


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""


class RetryPolicy:
    """
    Configurable retry policy with exponential backoff.
    """

    def __init__(
        self,
        max_attempts: int = 3,
        backoff_factor: float = 2.0,
        max_backoff: float = 60.0,
        retryable_exceptions: tuple = (Exception,),
    ):
        """
        Initialize retry policy.

        Args:
            max_attempts: Maximum number of retry attempts
            backoff_factor: Multiplier for backoff delay
            max_backoff: Maximum backoff delay in seconds
            retryable_exceptions: Exceptions that trigger retries
        """
        self.max_attempts = max_attempts
        self.backoff_factor = backoff_factor
        self.max_backoff = max_backoff
        self.retryable_exceptions = retryable_exceptions

    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with retry policy.

        Args:
            func: Function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Function result

        Raises:
            Last exception if all retries fail
        """
        attempt = 0
        last_exception = None

        while attempt < self.max_attempts:
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)

            except self.retryable_exceptions as e:
                attempt += 1
                last_exception = e

                if attempt >= self.max_attempts:
                    logger.error(f"All {self.max_attempts} retry attempts failed: {e}")
                    break

                # Calculate backoff delay
                delay = min(self.backoff_factor ** (attempt - 1), self.max_backoff)

                logger.warning(
                    f"Retry attempt {attempt}/{self.max_attempts} after {delay}s delay: {e}"
                )
                await asyncio.sleep(delay)

        # Re-raise the last exception
        raise last_exception


class ResilienceContext:
    """
    Context manager that combines circuit breaker and retry policies.
    """

    def __init__(
        self,
        retries: int = 3,
        timeout: float = 30.0,
        circuit_breaker: Optional[CircuitBreaker] = None,
    ):
        """
        Initialize resilience context.

        Args:
            retries: Number of retry attempts
            timeout: Operation timeout in seconds
            circuit_breaker: Optional circuit breaker instance
        """
        self.retry_policy = RetryPolicy(max_attempts=retries)
        self.timeout = timeout
        self.circuit_breaker = circuit_breaker or CircuitBreaker()

        self.success = False
        self.attempts = 0
        self.last_error: Optional[Exception] = None

    async def __aenter__(self):
        """Enter async context."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit async context."""
        if exc_type:
            self.last_error = exc_val
            self.success = False
        else:
            self.success = True

    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with full resilience protection.

        Combines timeout, retry, and circuit breaker patterns.
        """

        async def _wrapped_func():
            return await self.circuit_breaker.call(func, *args, **kwargs)

        try:
            return await asyncio.wait_for(
                self.retry_policy.execute(_wrapped_func), timeout=self.timeout
            )
        except asyncio.TimeoutError as e:
            logger.error(f"Operation timed out after {self.timeout}s")
            raise TimeoutError(f"Operation timed out after {self.timeout}s") from e


class BulkheadPattern:
    """
    Bulkhead pattern implementation for resource isolation.

    Prevents resource exhaustion by limiting concurrent operations.
    """

    def __init__(self, max_concurrent: int = 10):
        """
        Initialize bulkhead.

        Args:
            max_concurrent: Maximum concurrent operations
        """
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.active_count = 0
        self.total_count = 0
        self.rejected_count = 0

    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with concurrency limiting.

        Args:
            func: Function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Function result

        Raises:
            BulkheadRejectionError: When max concurrency reached
        """
        if self.semaphore.locked():
            self.rejected_count += 1
            raise BulkheadRejectionError(f"Maximum concurrency ({self.max_concurrent}) reached")

        async with self.semaphore:
            self.active_count += 1
            self.total_count += 1

            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            finally:
                self.active_count -= 1

    @property
    def utilization(self) -> float:
        """Get current utilization percentage."""
        return (self.active_count / self.max_concurrent) * 100


class BulkheadRejectionError(Exception):
    """Raised when bulkhead rejects request due to high load."""


# Backward-compatible alias expected by some modules/tests
class BulkheadIsolator(BulkheadPattern):
    """Alias for BulkheadPattern to preserve prior API name."""


class HealthChecker:
    """
    Health checking component for services and dependencies.
    """

    def __init__(self, check_interval: int = 60, timeout: float = 5.0):
        """
        Initialize health checker.

        Args:
            check_interval: Seconds between health checks
            timeout: Timeout for each health check
        """
        self.check_interval = check_interval
        self.timeout = timeout
        self.checks: Dict[str, Callable] = {}
        self.status: Dict[str, Dict[str, Any]] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def register_check(self, name: str, check_func: Callable):
        """
        Register a health check.

        Args:
            name: Name of the check
            check_func: Function that returns True if healthy
        """
        self.checks[name] = check_func
        self.status[name] = {"healthy": False, "last_check": None, "error": None}

    async def check_health(self, name: str) -> bool:
        """
        Run a single health check.

        Args:
            name: Name of the check to run

        Returns:
            True if healthy, False otherwise
        """
        if name not in self.checks:
            return False

        try:
            check_func = self.checks[name]

            if asyncio.iscoroutinefunction(check_func):
                result = await asyncio.wait_for(check_func(), timeout=self.timeout)
            else:
                result = check_func()

            self.status[name].update(
                {"healthy": bool(result), "last_check": datetime.utcnow(), "error": None}
            )

            return bool(result)

        except Exception as e:
            logger.error(f"Health check '{name}' failed: {e}")
            self.status[name].update(
                {"healthy": False, "last_check": datetime.utcnow(), "error": str(e)}
            )
            return False

    async def check_all(self) -> Dict[str, bool]:
        """
        Run all health checks.

        Returns:
            Dictionary of check results
        """
        results = {}

        for name in self.checks:
            results[name] = await self.check_health(name)

        return results

    def start_monitoring(self):
        """Start continuous health monitoring."""
        if self._running:
            return

        self._running = True
        self._task = asyncio.create_task(self._monitor_loop())
        logger.info("Health monitoring started")

    def stop_monitoring(self):
        """Stop health monitoring."""
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("Health monitoring stopped")

    async def _monitor_loop(self):
        """Continuous monitoring loop."""
        while self._running:
            try:
                await self.check_all()
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(self.check_interval)

    def get_overall_health(self) -> bool:
        """Get overall system health."""
        return all(status["healthy"] for status in self.status.values())

    def get_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive health summary."""
        healthy_count = sum(1 for status in self.status.values() if status["healthy"])
        total_count = len(self.status)

        return {
            "overall_healthy": self.get_overall_health(),
            "healthy_checks": healthy_count,
            "total_checks": total_count,
            "health_percentage": (healthy_count / total_count * 100) if total_count > 0 else 100,
            "checks": self.status,
        }
