# Enhanced main application with path resolution
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import logging

from .routers import ai, config, issues, events, analyzers, enhanced_analyzers
from .routers.enhanced_issues import router as enhanced_issues_router
from .routers.api.v1.analytics import router as analytics_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Dexter API (Enhanced)",
    description="API for Dexter - Sentry Observability Companion with enhanced path resolution",
    version="1.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with enhanced path resolution
app.include_router(enhanced_issues_router, prefix="/enhanced/issues", tags=["enhanced-issues"])

# Include existing routers for backward compatibility
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(config.router, prefix="/config", tags=["config"])
app.include_router(issues.router, prefix="/issues", tags=["issues"])
app.include_router(events.router, prefix="/events", tags=["events"])
app.include_router(analyzers.router, prefix="/analyzers", tags=["analyzers"])
app.include_router(enhanced_analyzers.router, prefix="/v1/analyzers", tags=["enhanced-analyzers"])
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])

# Add a root endpoint
@app.get("/")
async def root():
    return {
        "message": "Dexter API (Enhanced) is running",
        "version": "1.1.0",
        "enhanced_features": [
            "Path resolution",
            "Standardized API calls",
            "Centralized configuration"
        ]
    }

# Add health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.1.0", "enhanced": True}

# Optional: Serve frontend build files in production
# Uncomment and adjust path if needed
# app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
