"""
Standardized error handling utilities for the Dexter backend.

This module provides consistent error handling patterns across all routers
and services, including proper HTTP status codes, error messages, and logging.
"""

import logging
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from functools import wraps
import traceback

from app.utils.logging_config import safe_log

logger = logging.getLogger(__name__)


class DexterError(Exception):
    """Base exception class for Dexter-specific errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class SentryAPIError(DexterError):
    """Error raised when Sentry API calls fail."""

    def __init__(
        self, message: str, status_code: int = 502, details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message, status_code=status_code, error_code="SENTRY_API_ERROR", details=details
        )


class ConfigurationError(DexterError):
    """Error raised when configuration is invalid or missing."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="CONFIGURATION_ERROR",
            details=details,
        )


class ValidationError(DexterError):
    """Error raised when input validation fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class NotFoundError(DexterError):
    """Error raised when a resource is not found."""

    def __init__(self, message: str, resource_type: str = "Resource", resource_id: str = ""):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details={"resource_type": resource_type, "resource_id": resource_id},
        )


class AuthenticationError(DexterError):
    """Error raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_ERROR",
        )


class AuthorizationError(DexterError):
    """Error raised when authorization fails."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message, status_code=status.HTTP_403_FORBIDDEN, error_code="AUTHORIZATION_ERROR"
        )


class ExternalServiceError(DexterError):
    """Error raised when external service calls fail."""

    def __init__(self, message: str, service_name: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code="EXTERNAL_SERVICE_ERROR",
            details={**(details or {}), "service_name": service_name},
        )


def handle_error(
    error: Exception,
    context: str = "",
    default_message: str = "An unexpected error occurred",
    log_level: int = logging.ERROR,
) -> HTTPException:
    """
    Standardized error handler that converts exceptions to HTTPException.

    Args:
        error: The exception to handle
        context: Context information for logging
        default_message: Default message for unknown errors
        log_level: Logging level for the error

    Returns:
        HTTPException with appropriate status code and message
    """

    # Create error context for logging
    error_context = {
        "context": context,
        "error_type": type(error).__name__,
        "error_message": str(error),
    }

    if isinstance(error, DexterError):
        # Handle custom Dexter errors
        error_context.update(error.details)
        safe_log(
            logger, log_level, f"Dexter error in {context}: {error.message}", extra=error_context
        )

        return HTTPException(
            status_code=error.status_code,
            detail={
                "error_code": error.error_code,
                "message": error.message,
                "details": error.details,
            },
        )

    elif isinstance(error, HTTPException):
        # Re-raise FastAPI HTTPExceptions as-is
        safe_log(logger, log_level, f"HTTP error in {context}: {error.detail}", extra=error_context)
        return error

    elif isinstance(error, ValueError):
        # Handle validation errors
        safe_log(
            logger,
            logging.WARNING,
            f"Validation error in {context}: {str(error)}",
            extra=error_context,
        )
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error_code": "VALIDATION_ERROR", "message": str(error), "details": {}},
        )

    elif isinstance(error, ConnectionError):
        # Handle connection errors
        safe_log(
            logger,
            logging.ERROR,
            f"Connection error in {context}: {str(error)}",
            extra=error_context,
        )
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error_code": "CONNECTION_ERROR",
                "message": "Service temporarily unavailable",
                "details": {"original_error": str(error)},
            },
        )

    elif isinstance(error, TimeoutError):
        # Handle timeout errors
        safe_log(
            logger, logging.ERROR, f"Timeout error in {context}: {str(error)}", extra=error_context
        )
        return HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail={
                "error_code": "TIMEOUT_ERROR",
                "message": "Request timed out",
                "details": {"original_error": str(error)},
            },
        )

    else:
        # Handle unexpected errors
        error_context["traceback"] = traceback.format_exc()
        safe_log(
            logger,
            logging.ERROR,
            f"Unexpected error in {context}: {str(error)}",
            extra=error_context,
        )

        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error_code": "INTERNAL_ERROR", "message": default_message, "details": {}},
        )


def error_handler(
    context: str = "",
    default_message: str = "An unexpected error occurred",
    log_level: int = logging.ERROR,
):
    """
    Decorator for automatic error handling in route handlers.

    Args:
        context: Context information for logging
        default_message: Default message for unknown errors
        log_level: Logging level for errors

    Example:
        @error_handler(context="get_events", default_message="Failed to retrieve events")
        async def get_events_endpoint(...):
            # Route logic here
            pass
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                raise handle_error(e, context, default_message, log_level)

        return wrapper

    return decorator


def validate_required_params(**params) -> None:
    """
    Validate that required parameters are present and not empty.

    Args:
        **params: Key-value pairs to validate

    Raises:
        ValidationError: If any required parameter is missing or empty

    Example:
        validate_required_params(
            organization_slug=organization_slug,
            project_slug=project_slug
        )
    """
    missing_params = []
    empty_params = []

    for name, value in params.items():
        if value is None:
            missing_params.append(name)
        elif isinstance(value, str) and not value.strip():
            empty_params.append(name)

    if missing_params or empty_params:
        error_details = {}
        if missing_params:
            error_details["missing_parameters"] = missing_params
        if empty_params:
            error_details["empty_parameters"] = empty_params

        raise ValidationError(
            message=f"Required parameters are missing or empty: {', '.join(missing_params + empty_params)}",
            details=error_details,
        )


def create_success_response(
    data: Any, message: str = "Success", metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a standardized success response.

    Args:
        data: The response data
        message: Success message
        metadata: Additional metadata

    Returns:
        Standardized success response
    """
    response = {"success": True, "message": message, "data": data}

    if metadata:
        response["metadata"] = metadata

    return response


def create_error_response(
    error_code: str, message: str, details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        error_code: Error code
        message: Error message
        details: Additional error details

    Returns:
        Standardized error response
    """
    response = {"success": False, "error_code": error_code, "message": message}

    if details:
        response["details"] = details

    return response


# Utility functions for common error scenarios


def handle_sentry_api_error(error: Exception, operation: str = "API call") -> SentryAPIError:
    """Handle errors from Sentry API calls with proper context."""
    if hasattr(error, "response") and hasattr(error.response, "status_code"):
        status_code = error.response.status_code
        if status_code == 401:
            return SentryAPIError(
                message="Invalid Sentry API token or insufficient permissions",
                status_code=status.HTTP_401_UNAUTHORIZED,
                details={"operation": operation},
            )
        elif status_code == 404:
            return SentryAPIError(
                message="Sentry resource not found",
                status_code=status.HTTP_404_NOT_FOUND,
                details={"operation": operation},
            )
        elif status_code == 429:
            return SentryAPIError(
                message="Sentry API rate limit exceeded",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                details={"operation": operation},
            )

    return SentryAPIError(
        message=f"Sentry API {operation} failed: {str(error)}",
        details={"operation": operation, "original_error": str(error)},
    )


def handle_config_error(error: Exception, config_key: str = "") -> ConfigurationError:
    """Handle configuration-related errors."""
    if config_key:
        message = f"Configuration error for '{config_key}': {str(error)}"
        details = {"config_key": config_key}
    else:
        message = f"Configuration error: {str(error)}"
        details = {}

    return ConfigurationError(message=message, details={**details, "original_error": str(error)})
