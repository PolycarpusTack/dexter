"""
Simplified FastAPI application to test core functionality.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

# Import settings directly from settings module
from app.core.settings import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Simplified Dexter API for testing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import only basic routers that should work
try:
    from app.routers import config
    app.include_router(config.router, prefix="/api/v1/config", tags=["config"])
    logger.info("Config router included")
except Exception as e:
    logger.warning(f"Failed to include config router: {e}")

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Simplified Dexter API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "dexter-api-simplified",
        "environment": settings.environment
    }

@app.get("/settings")
async def show_settings():
    """Show current settings (non-sensitive)."""
    return {
        "app_name": settings.app_name,
        "environment": settings.environment,
        "project_slug": settings.project_slug,
        "organization_slug": settings.organization_slug,
        "sentry_org": settings.SENTRY_ORG
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main_simplified:app", host="127.0.0.1", port=8002, reload=True)
