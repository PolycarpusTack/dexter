"""
Application factory for the Dexter application.

This module provides a centralized factory for creating and configuring
the FastAPI application with appropriate middleware and routers based
on the application configuration.
"""
import logging
from typing import Optional, List, Dict, Any

import sentry_sdk
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
from sentry_sdk.integrations.logging import LoggingIntegration

from .config import AppSettings, get_settings
from .middleware import setup_middlewares
from .logging import setup_logging

logger = logging.getLogger(__name__)


def configure_sentry(settings: AppSettings) -> None:
    """
    Configure Sentry SDK based on application settings.
    
    Args:
        settings: Application settings containing Sentry configuration
    """
    if not settings.SENTRY_DSN:
        logger.info("Sentry integration disabled (no DSN provided)")
        return
    
    try:
        # Set up logging integration
        logging_integration = LoggingIntegration(
            level=logging.INFO,  # Capture info and above as breadcrumbs
            event_level=logging.ERROR  # Send errors as events
        )
        
        # Initialize Sentry SDK
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT,
            traces_sample_rate=1.0 if settings.DEBUG else 0.2,
            integrations=[logging_integration],
        )
        logger.info(f"Sentry initialized with environment: {settings.SENTRY_ENVIRONMENT}")
    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {str(e)}")


def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


def handle_validation_exception(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation exceptions."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )


def create_app(settings: Optional[AppSettings] = None) -> FastAPI:
    """
    Create and configure the FastAPI application.
    
    Args:
        settings: Optional AppSettings to use (if None, loads from environment)
        
    Returns:
        Configured FastAPI application instance
    """
    if settings is None:
        settings = get_settings()
    
    # Setup logging first
    setup_logging(settings)
    
    # Configure Sentry if enabled
    if settings.SENTRY_DSN:
        configure_sentry(settings)
    
    # Application metadata
    app_kwargs = {
        "title": settings.APP_NAME,
        "description": "Enhanced Sentry monitoring with AI-powered analysis",
        "version": settings.VERSION,
    }
    
    # Only show docs in debug mode
    if not settings.DEBUG:
        app_kwargs.update({
            "docs_url": None,
            "redoc_url": None,
            "openapi_url": None,
        })
    
    # Create the FastAPI app
    app = FastAPI(**app_kwargs)
    
    # Setup middlewares
    setup_middlewares(app, settings)
    
    # Register exception handlers
    app.add_exception_handler(StarletteHTTPException, handle_http_exception)
    app.add_exception_handler(RequestValidationError, handle_validation_exception)
    
    # Register application startup and shutdown events
    @app.on_event("startup")
    async def startup_event():
        logger.info(f"Starting Dexter in {settings.APP_MODE} mode")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Shutting down Dexter")
    
    # Add root route for healthcheck
    @app.get("/")
    async def root():
        """Root endpoint to verify the application is running."""
        return {
            "message": f"Dexter API ({settings.APP_MODE})",
            "version": settings.VERSION,
            "status": "running"
        }
    
    # Add health check route
    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": f"dexter-api-{settings.APP_MODE}"
        }
    
    # Add diagnostics route if error handler is available
    @app.get("/api/v1/diagnostics/errors")
    async def get_recent_errors(limit: int = 50):
        """Get recent errors from the in-memory cache."""
        if hasattr(app.state, "error_handler"):
            return {"errors": app.state.error_handler.get_error_log(limit=limit)}
        return {"errors": []}
    
    # Include routers based on configuration
    try:
        from app.routers import setup_routers
        setup_routers(app, settings)
    except Exception as e:
        logger.error(f"Failed to set up routers: {str(e)}")
        if settings.DEBUG:
            raise
    
    return app
