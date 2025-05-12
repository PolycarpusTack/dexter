"""
Extremely minimal FastAPI application for testing.
Run this directly with 'python -m app.minimal' to test FastAPI setup.
"""
from fastapi import FastAPI
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Dexter API (Minimal)",
    description="Absolute minimal version for testing",
    version="1.0.0"
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Dexter API (Minimal)",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/info")
async def info():
    """Information endpoint."""
    # Try to import different modules to check availability
    modules_status = {}
    
    # Check Redis
    try:
        import redis
        modules_status["redis"] = "Available"
    except ImportError:
        modules_status["redis"] = "Not available"
    
    # Check FastAPI
    try:
        import fastapi
        modules_status["fastapi"] = f"Available (version {fastapi.__version__})"
    except (ImportError, AttributeError):
        modules_status["fastapi"] = "Not available"
    
    # Check Pydantic
    try:
        import pydantic
        modules_status["pydantic"] = f"Available (version {pydantic.__version__})"
    except (ImportError, AttributeError):
        modules_status["pydantic"] = "Not available"
    
    # Check HTTPX
    try:
        import httpx
        modules_status["httpx"] = f"Available (version {httpx.__version__})"
    except (ImportError, AttributeError):
        modules_status["httpx"] = "Not available"
    
    return {
        "app": "Dexter API (Minimal)",
        "modules": modules_status
    }

# Run this app directly
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting minimal server...")
    uvicorn.run("app.minimal:app", host="127.0.0.1", port=8005, reload=True)
