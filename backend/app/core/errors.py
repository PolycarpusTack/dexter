"""
Core error types for Dexter services and APIs.

These exceptions standardize error reporting from external services (e.g., Sentry)
and internal application components. They are safe to raise from services and
routers and carry structured information used by tests and error handlers.
"""
from typing import Any, Dict, Optional


class APIError(Exception):
    """Base API error with optional status and details."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.message


class ExternalAPIError(APIError):
    """Raised for transport-level failures talking to external services."""

    def __init__(self, message: str, *, details: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message, status_code=502, details=details)


class SentryAPIError(APIError):
    """Raised for non-2xx responses from the Sentry HTTP API.

    Includes retry_after when the remote service returns 429.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        response_data: Optional[Dict[str, Any]] = None,
        retry_after: Optional[int] = None,
    ) -> None:
        super().__init__(message, status_code=status_code, details=response_data)
        self.retry_after = retry_after
