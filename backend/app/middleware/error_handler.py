from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from typing import Union, Dict, Any
import logging
import traceback
from datetime import datetime
import json
from enum import Enum


logger = logging.getLogger(__name__)


class ErrorCategory(str, Enum):
    NETWORK = "network"
    AUTHENTICATION = "authentication"
    VALIDATION = "validation"
    SERVER = "server"
    NOT_FOUND = "not-found"
    PERMISSION = "permission"
    UNKNOWN = "unknown"


class ErrorCode(str, Enum):
    # Authentication errors
    INVALID_TOKEN = "invalid_token"
    EXPIRED_TOKEN = "expired_token"
    MISSING_CREDENTIALS = "missing_credentials"
    INSUFFICIENT_PERMISSIONS = "insufficient_permissions"
    
    # Validation errors
    INVALID_INPUT = "invalid_input"
    MISSING_FIELD = "missing_field"
    FIELD_TOO_LONG = "field_too_long"
    INVALID_FORMAT = "invalid_format"
    
    # Resource errors
    NOT_FOUND = "not_found"
    ALREADY_EXISTS = "already_exists"
    CONFLICT = "conflict"
    
    # Server errors
    INTERNAL_ERROR = "internal_error"
    DATABASE_ERROR = "database_error"
    EXTERNAL_SERVICE_ERROR = "external_service_error"
    
    # Rate limiting
    RATE_LIMITED = "rate_limited"
    
    # Unknown
    UNKNOWN_ERROR = "unknown_error"


class APIError(Exception):
    """Custom API exception with enhanced error information."""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = ErrorCode.UNKNOWN_ERROR,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        details: Dict[str, Any] = None,
        retryable: bool = False
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.category = category
        self.details = details or {}
        self.retryable = retryable
        super().__init__(self.message)


class ErrorHandler:
    """Centralized error handling for the FastAPI application."""
    
    def __init__(self):
        self.error_log = []
        self.max_log_size = 1000
    
    def categorize_error(self, error: Exception) -> ErrorCategory:
        """Categorize an error based on its type and attributes."""
        if isinstance(error, APIError):
            return error.category
        elif isinstance(error, HTTPException):
            if error.status_code == 401 or error.status_code == 403:
                return ErrorCategory.AUTHENTICATION
            elif error.status_code == 404:
                return ErrorCategory.NOT_FOUND
            elif error.status_code == 422:
                return ErrorCategory.VALIDATION
            elif error.status_code >= 500:
                return ErrorCategory.SERVER
        elif isinstance(error, RequestValidationError):
            return ErrorCategory.VALIDATION
        elif isinstance(error, ConnectionError) or isinstance(error, TimeoutError):
            return ErrorCategory.NETWORK
        
        return ErrorCategory.UNKNOWN
    
    def get_error_code(self, error: Exception) -> str:
        """Determine the error code based on the error type."""
        if isinstance(error, APIError):
            return error.error_code
        elif isinstance(error, HTTPException):
            if error.status_code == 401:
                return ErrorCode.INVALID_TOKEN
            elif error.status_code == 403:
                return ErrorCode.INSUFFICIENT_PERMISSIONS
            elif error.status_code == 404:
                return ErrorCode.NOT_FOUND
            elif error.status_code == 422:
                return ErrorCode.INVALID_INPUT
            elif error.status_code == 429:
                return ErrorCode.RATE_LIMITED
        elif isinstance(error, RequestValidationError):
            return ErrorCode.INVALID_INPUT
        
        return ErrorCode.UNKNOWN_ERROR
    
    def format_error_response(
        self,
        error: Exception,
        request: Request,
        include_stack: bool = False
    ) -> Dict[str, Any]:
        """Format error into a consistent response structure."""
        category = self.categorize_error(error)
        error_code = self.get_error_code(error)
        
        # Determine status code
        if isinstance(error, APIError):
            status_code = error.status_code
        elif isinstance(error, HTTPException):
            status_code = error.status_code
        elif isinstance(error, RequestValidationError):
            status_code = 422
        else:
            status_code = 500
        
        # Build error response
        response = {
            "error": {
                "message": self.get_user_friendly_message(error),
                "code": error_code,
                "category": category.value,
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": request.headers.get("X-Request-ID"),
                "path": request.url.path,
                "method": request.method
            }
        }
        
        # Add additional details if available
        if isinstance(error, APIError) and error.details:
            response["error"]["details"] = error.details
        elif isinstance(error, RequestValidationError):
            response["error"]["details"] = {
                "validation_errors": [
                    {
                        "field": ".".join(err["loc"]),
                        "message": err["msg"],
                        "type": err["type"]
                    }
                    for err in error.errors()
                ]
            }
        
        # Add debug information in development
        if include_stack and status_code >= 500:
            response["error"]["stack"] = traceback.format_exc()
        
        return response, status_code
    
    def get_user_friendly_message(self, error: Exception) -> str:
        """Convert technical errors into user-friendly messages."""
        if isinstance(error, APIError):
            return error.message
        elif isinstance(error, HTTPException):
            return error.detail
        elif isinstance(error, RequestValidationError):
            return "Invalid input data. Please check your request and try again."
        elif isinstance(error, ConnectionError):
            return "Unable to connect to external service. Please try again later."
        elif isinstance(error, TimeoutError):
            return "Request timed out. Please try again."
        
        # Default message for unknown errors
        return "An unexpected error occurred. Please try again later."
    
    def log_error(self, error: Exception, request: Request, status_code: int):
        """Log error with context for debugging."""
        error_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "category": self.categorize_error(error).value,
            "error_code": self.get_error_code(error),
            "status_code": status_code,
            "request": {
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "headers": dict(request.headers),
                "client": request.client.host if request.client else None
            }
        }
        
        # Add to error log
        self.error_log.insert(0, error_data)
        if len(self.error_log) > self.max_log_size:
            self.error_log.pop()
        
        # Log to system logger
        if status_code >= 500:
            logger.error(f"Server error: {json.dumps(error_data)}", exc_info=True)
        elif status_code >= 400:
            logger.warning(f"Client error: {json.dumps(error_data)}")
        else:
            logger.info(f"Error: {json.dumps(error_data)}")
    
    async def handle_error(
        self,
        request: Request,
        error: Exception,
        include_stack: bool = False
    ) -> JSONResponse:
        """Main error handling method."""
        response_data, status_code = self.format_error_response(
            error, request, include_stack
        )
        
        # Log the error
        self.log_error(error, request, status_code)
        
        # Return JSON response
        return JSONResponse(
            status_code=status_code,
            content=response_data,
            headers={
                "X-Error-Code": response_data["error"]["code"],
                "X-Error-Category": response_data["error"]["category"]
            }
        )
    
    def get_error_log(self, limit: int = 100) -> list:
        """Get recent errors from the log."""
        return self.error_log[:limit]
    
    def get_errors_by_category(self, category: ErrorCategory, limit: int = 100) -> list:
        """Get errors filtered by category."""
        return [
            error for error in self.error_log 
            if error["category"] == category.value
        ][:limit]
    
    def clear_error_log(self):
        """Clear the error log."""
        self.error_log = []


# Singleton instance
error_handler = ErrorHandler()


# Middleware function
async def error_handling_middleware(request: Request, call_next):
    """Middleware to catch and handle all errors."""
    try:
        response = await call_next(request)
        return response
    except Exception as error:
        # Check if we're in development mode (you'd get this from config)
        include_stack = request.app.debug if hasattr(request.app, 'debug') else False
        return await error_handler.handle_error(request, error, include_stack)


# Exception handlers for FastAPI
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPException."""
    return await error_handler.handle_error(request, exc)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle RequestValidationError."""
    return await error_handler.handle_error(request, exc)


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions."""
    return await error_handler.handle_error(request, exc)


# Utility functions for creating errors
def create_api_error(
    message: str,
    status_code: int = 500,
    error_code: str = ErrorCode.UNKNOWN_ERROR,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    details: Dict[str, Any] = None,
    retryable: bool = False
) -> APIError:
    """Create an APIError with the given parameters."""
    return APIError(
        message=message,
        status_code=status_code,
        error_code=error_code,
        category=category,
        details=details,
        retryable=retryable
    )


# Common error creators
def not_found_error(resource: str, identifier: str = None) -> APIError:
    """Create a not found error."""
    message = f"{resource} not found"
    if identifier:
        message = f"{resource} with ID '{identifier}' not found"
    
    return create_api_error(
        message=message,
        status_code=404,
        error_code=ErrorCode.NOT_FOUND,
        category=ErrorCategory.NOT_FOUND,
        details={"resource": resource, "identifier": identifier}
    )


def validation_error(field: str, message: str) -> APIError:
    """Create a validation error."""
    return create_api_error(
        message=f"Validation error: {message}",
        status_code=422,
        error_code=ErrorCode.INVALID_INPUT,
        category=ErrorCategory.VALIDATION,
        details={"field": field, "message": message}
    )


def permission_error(action: str, resource: str) -> APIError:
    """Create a permission error."""
    return create_api_error(
        message=f"You don't have permission to {action} {resource}",
        status_code=403,
        error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
        category=ErrorCategory.PERMISSION,
        details={"action": action, "resource": resource}
    )


def authentication_error(message: str = "Authentication failed") -> APIError:
    """Create an authentication error."""
    return create_api_error(
        message=message,
        status_code=401,
        error_code=ErrorCode.INVALID_TOKEN,
        category=ErrorCategory.AUTHENTICATION
    )


def server_error(message: str = None, retryable: bool = True) -> APIError:
    """Create a server error."""
    return create_api_error(
        message=message or "An internal server error occurred",
        status_code=500,
        error_code=ErrorCode.INTERNAL_ERROR,
        category=ErrorCategory.SERVER,
        retryable=retryable
    )
