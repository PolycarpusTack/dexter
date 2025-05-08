# File: backend/app/main.py

"""
Main application file for the Dexter backend API.
Initializes the FastAPI application, includes routers, and sets up middleware.
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import sys

# Import routers and config
from .routers import issues, events, ai, config, analyzers
# Import enhanced analyzers
from .routers import enhanced_analyzers
from .config import settings

# Import error handling
from .utils.error_handling import exception_handler, DexterError

# --- Configure Logging ---
log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
logging.basicConfig(
    level=settings.log_level.upper(),
    format=log_format,
    stream=sys.stdout # Log to stdout for container/cloud environments
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logger = logging.getLogger(__name__) # Get root logger for app messages

# --- Initialize FastAPI App ---
app = FastAPI(
    title="Dexter API",
    description="Backend API for Dexter - The Sentry Observability Companion",
    version="0.1.0" # MVP version
)

# --- Middleware ---
origins = [
    "http://localhost:3000",  # Default Create React App port
    "http://localhost:5173",  # Default Vite dev server port
    "http://localhost:5175",  # Your current Vite port
    "http://localhost:5176",  # Additional port for testing
    "http://localhost:5177",  # New port we're using
    "http://127.0.0.1:5175",  # Alternative localhost format
    "http://127.0.0.1:5176",  # Alternative localhost format
    "http://127.0.0.1:5177",  # Alternative localhost format for new port
    "*"  # Allow all origins during development for simplicity
]

# Use CORSMiddleware with more permissive settings for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# --- Custom Middleware for CORS Headers ---
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    # Process the request
    response = await call_next(request)
    
    # Add CORS headers to every response
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    
    return response

# --- CORS Preflight Handler ---
@app.options("/{rest_of_path:path}")
async def options_handler(request: Request, rest_of_path: str):
    response = JSONResponse(content={"detail": "OK"})
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# --- Register Exception Handlers ---
app.add_exception_handler(Exception, exception_handler)
app.add_exception_handler(StarletteHTTPException, exception_handler)
app.add_exception_handler(RequestValidationError, exception_handler)
app.add_exception_handler(DexterError, exception_handler)
logger.info("Registered global exception handlers.")

# --- API Routers ---
API_PREFIX = "/api/v1"
app.include_router(config.router, prefix=API_PREFIX, tags=["Configuration & Status"])
app.include_router(issues.router, prefix=API_PREFIX, tags=["Issues"])
app.include_router(events.router, prefix=API_PREFIX, tags=["Events"])
app.include_router(ai.router, prefix=API_PREFIX, tags=["AI"])
app.include_router(analyzers.router, prefix=API_PREFIX, tags=["Analyzers"])
# Add the enhanced analyzers router
app.include_router(enhanced_analyzers.router, prefix=API_PREFIX, tags=["Enhanced Analyzers"])
logger.info("API Routers included.")

# --- Root & Health Endpoints ---
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Dexter API!"}

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}

# --- Startup/Shutdown Events ---
@app.on_event("startup")
async def startup_event():
    logger.info("--- Dexter API Starting Up ---")
    logger.info(f"Log level set to: {settings.log_level.upper()}")
    logger.info(f"Sentry API Base URL: {settings.sentry_base_url}")
    logger.info(f"Sentry Web Base URL: {settings.sentry_web_url}")
    logger.info(f"Ollama Base URL: {settings.ollama_base_url}")
    logger.info(f"Ollama Model: {settings.ollama_model}")
    if not settings.sentry_api_token or settings.sentry_api_token == "YOUR_SENTRY_API_TOKEN":
         logger.critical("--- SENTRY API TOKEN IS MISSING OR USING DEFAULT PLACEHOLDER ---")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("--- Dexter API Shutting Down ---")
