"""
Main FastAPI application module.
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.routers import events, issues, ai, config, websocket
from app.middleware.error_handler import (
    error_handler,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.utils.logging_config import configure_logging
from app.config.settings import settings
import logging

# Configure application logging
configure_logging()
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Sentry error monitoring enhancement platform",
    version="1.0.0"
)

# Set debug flag (used by error handler)
app.debug = settings.debug

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
try:
    app.include_router(events.router, prefix="/api/v1/events", tags=["events"])
    logger.info("Events router included")
except Exception as e:
    logger.error(f"Failed to include events router: {e}", exc_info=True)

try:
    app.include_router(issues.router, prefix="/api/v1/issues", tags=["issues"])
    logger.info("Issues router included")
except Exception as e:
    logger.error(f"Failed to include issues router: {e}", exc_info=True)

try:
    app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
    logger.info("AI router included")
except Exception as e:
    logger.error(f"Failed to include AI router: {e}", exc_info=True)

try:
    app.include_router(config.router, prefix="/api/v1/config", tags=["config"])
    logger.info("Config router included")
except Exception as e:
    logger.error(f"Failed to include config router: {e}", exc_info=True)

try:
    app.include_router(websocket.router, tags=["websocket"])
    logger.info("Websocket router included")
except Exception as e:
    logger.error(f"Failed to include websocket router: {e}", exc_info=True)

# Register error handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Add diagnostic endpoints for error handling
@app.get("/api/v1/diagnostics/errors", tags=["diagnostics"])
async def get_recent_errors(limit: int = 50):
    """Get recent errors from the in-memory cache."""
    return {"errors": error_handler.get_error_log(limit=limit)}

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Dexter API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "dexter-api"
    }

# Middleware for error handling
@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """Middleware to catch and handle all errors."""
    try:
        response = await call_next(request)
        return response
    except Exception as error:
        include_stack = app.debug
        return await error_handler.handle_error(request, error, include_stack)

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Dexter API on {settings.host}:{settings.port}")
    uvicorn.run(app, host=settings.host, port=settings.port)
