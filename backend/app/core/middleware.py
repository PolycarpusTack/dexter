"""
Middleware configuration for the Dexter application.

This module provides functions to set up and configure all middleware
for the FastAPI application based on the application settings.
"""
import logging
import time
import traceback
from typing import Callable, Dict, List, Optional

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .config import AppSettings

logger = logging.getLogger(__name__)


class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware to measure and log request processing time."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and measure timing.
        
        Args:
            request: The incoming request
            call_next: The next middleware or route handler
            
        Returns:
            The response from the next middleware or route handler
        """
        start_time = time.time()
        
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Add timing header
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            
            # Log timing for slower requests
            if process_time > 1.0:
                logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.4f}s")
            elif process_time > 0.5:
                logger.info(f"Request timing: {request.method} {request.url.path} took {process_time:.4f}s")
            
            return response
        except Exception as exc:
            # Log exceptions with timing information
            process_time = time.time() - start_time
            logger.error(
                f"Request error after {process_time:.4f}s: {request.method} {request.url.path} - {str(exc)}"
            )
            raise


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log incoming requests and their status codes."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and log details.
        
        Args:
            request: The incoming request
            call_next: The next middleware or route handler
            
        Returns:
            The response from the next middleware or route handler
        """
        logger.debug(f"Request started: {request.method} {request.url.path}")
        
        try:
            response = await call_next(request)
            
            # Log completed requests
            logger.info(
                f"Request completed: {request.method} {request.url.path} - Status: {response.status_code}"
            )
            
            return response
        except Exception as exc:
            logger.error(
                f"Request failed: {request.method} {request.url.path} - Error: {str(exc)}"
            )
            raise


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware to handle and log all errors."""
    
    def __init__(self, app: FastAPI, settings: AppSettings):
        """Initialize the error handling middleware."""
        super().__init__(app)
        self.settings = settings
        self.recent_errors = []
        self.max_errors = settings.RECENT_ERRORS_LIMIT
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and handle any errors.
        
        Args:
            request: The incoming request
            call_next: The next middleware or route handler
            
        Returns:
            The response from the next middleware or route handler
        """
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Get stack trace if enabled
            include_stack = self.settings.should_include_stack_trace
            stack_trace = traceback.format_exc() if include_stack else None
            
            # Log error
            logger.exception(f"Unhandled exception in request: {request.method} {request.url.path}")
            
            # Store in recent errors
            error_info = {
                "timestamp": time.time(),
                "method": request.method,
                "path": str(request.url.path),
                "query": str(request.query_params),
                "error_type": exc.__class__.__name__,
                "error_msg": str(exc),
                "stack_trace": stack_trace
            }
            
            self.recent_errors.append(error_info)
            # Trim to max size
            if len(self.recent_errors) > self.max_errors:
                self.recent_errors = self.recent_errors[-self.max_errors:]
                
            # Return error response
            error_response = {
                "detail": str(exc),
                "error_type": exc.__class__.__name__,
            }
            
            if include_stack:
                error_response["stack_trace"] = stack_trace
                
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=error_response
            )
    
    def get_error_log(self, limit: int = 50) -> List[Dict]:
        """Get recent errors from the in-memory cache."""
        return self.recent_errors[-limit:] if self.recent_errors else []


def setup_middlewares(app: FastAPI, settings: AppSettings) -> None:
    """
    Configure application middlewares based on settings.
    
    Args:
        app: The FastAPI application instance
        settings: Application settings
    """
    # CORS middleware configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
    
    # Add error handling middleware
    error_middleware = ErrorHandlingMiddleware(app, settings)
    app.add_middleware(ErrorHandlingMiddleware, settings=settings)
    
    # Set error handler as an app attribute for access in endpoints
    app.state.error_handler = error_middleware
    
    # Debug-specific middlewares
    if settings.DEBUG:
        # Add timing middleware to measure request duration
        app.add_middleware(TimingMiddleware)
        
        # Add request logging middleware in debug mode
        app.add_middleware(RequestLoggingMiddleware)
        
        logger.info("Debug middlewares configured")
