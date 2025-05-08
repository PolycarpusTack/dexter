# File: backend/app/utils/error_handling.py

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import traceback
from typing import Dict, Any, Optional, Union, List, Type

# Configure logger
logger = logging.getLogger(__name__)

class DexterError(Exception):
    """Base exception class for Dexter-specific errors."""
    def __init__(
        self, 
        message: str, 
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.code = code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class ConfigurationError(DexterError):
    """Raised when there is an issue with the application configuration."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="CONFIGURATION_ERROR",
            details=details
        )


class SentryAPIError(DexterError):
    """Raised when there is an issue communicating with the Sentry API."""
    def __init__(
        self, 
        message: str, 
        status_code: int = status.HTTP_502_BAD_GATEWAY,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status_code,
            code="SENTRY_API_ERROR",
            details=details
        )


class LLMServiceError(DexterError):
    """Raised when there is an issue with the LLM service."""
    def __init__(
        self, 
        message: str, 
        status_code: int = status.HTTP_502_BAD_GATEWAY,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            status_code=status_code,
            code="LLM_SERVICE_ERROR",
            details=details
        )


class ValidationError(DexterError):
    """Raised for validation errors that aren't caught by Pydantic."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            details=details
        )


class NotFoundError(DexterError):
    """Raised when a requested resource is not found."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            details=details
        )


def format_validation_errors(exc: RequestValidationError) -> Dict[str, Any]:
    """Format Pydantic validation errors into a structured response."""
    errors: List[Dict[str, Any]] = []
    
    for error in exc.errors():
        loc = ".".join(str(item) for item in error.get("loc", []))
        err_type = error.get("type", "")
        msg = error.get("msg", "")
        
        errors.append({
            "field": loc,
            "type": err_type,
            "message": msg
        })
    
    return {
        "code": "VALIDATION_ERROR",
        "message": "Request validation failed",
        "details": {
            "errors": errors
        }
    }


def add_cors_headers(response: JSONResponse) -> JSONResponse:
    """Add CORS headers to a response."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


async def exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for all errors."""
    
    # Handle DexterError exceptions
    if isinstance(exc, DexterError):
        logger.error(f"{exc.code}: {exc.message}")
        if exc.details:
            logger.debug(f"Error details: {exc.details}")
        
        response = JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.message,
                "code": exc.code,
                **({"details": exc.details} if exc.details else {})
            }
        )
        return add_cors_headers(response)
    
    # Handle FastAPI/Starlette built-in HTTP exceptions
    if isinstance(exc, StarletteHTTPException):
        logger.warning(f"HTTP Exception {exc.status_code}: {exc.detail}")
        response = JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "code": "HTTP_ERROR",
            }
        )
        return add_cors_headers(response)
    
    # Handle Pydantic validation errors
    if isinstance(exc, RequestValidationError):
        formatted_errors = format_validation_errors(exc)
        logger.warning(f"Validation Error: {formatted_errors}")
        response = JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": formatted_errors["message"],
                "code": formatted_errors["code"],
                "details": formatted_errors["details"]
            }
        )
        return add_cors_headers(response)
    
    # Unhandled exceptions (500 Internal Server Error)
    error_id = id(exc)  # Simple unique ID for the error instance
    logger.error(
        f"Unhandled exception {error_id}: {str(exc)}\n"
        f"Request path: {request.url.path}\n"
        f"{traceback.format_exc()}"
    )
    
    # In production, don't expose the actual error message/traceback
    response = JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "code": "INTERNAL_SERVER_ERROR",
            "error_id": str(error_id)  # Include error ID for debugging
        }
    )
    return add_cors_headers(response)
