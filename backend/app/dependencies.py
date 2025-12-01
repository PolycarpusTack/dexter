"""
Dependency functions for FastAPI.
Provides common dependencies for use with FastAPI's dependency injection system.
"""

import logging
from datetime import datetime
from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.settings import settings
from app.services.cache_service import CacheService, get_cache_service as _get_cache_service
from app.services.sentry_client import SentryApiClient

# Configure logging
logger = logging.getLogger(__name__)

# Setup security scheme
security = HTTPBearer(auto_error=False)


async def get_sentry_client() -> AsyncGenerator[SentryApiClient, None]:
    """Dependency to get a Sentry API client."""
    from app.core.settings import settings

    token = settings.get_sentry_token()
    client = SentryApiClient(token=token)
    try:
        yield client
    finally:
        try:
            await client.close()
        except Exception:
            pass


async def get_current_user(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    Dependency to get the current authenticated user.
    Validates JWT tokens in production mode.

    Args:
        request: FastAPI request object
        credentials: Optional HTTP authorization credentials

    Returns:
        dict: User information with id, username, email, and role

    Raises:
        HTTPException: If authentication fails (401) or token is invalid/expired
    """
    # For development, we don't require authentication
    if getattr(settings, "DEBUG", False):
        return {"id": "dev-user", "username": "dev", "email": "dev@example.com", "role": "admin"}

    # Require credentials in production
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Validate JWT token
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

        # Extract user info
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "id": user_id,
            "username": payload.get("username", user_id),
            "email": payload.get("email", ""),
            "role": payload.get("role", "user"),
        }

    except JWTError as e:
        # Check if it's an expiration error
        error_msg = str(e).lower()
        if "expired" in error_msg:
            logger.warning(f"JWT token expired: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        logger.warning(f"JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Re-export cache service dependency for tests/integration
def get_cache_service(request: Request) -> CacheService:
    """Get the cache service dependency.

    Args:
        request: FastAPI request object

    Returns:
        CacheService instance
    """
    return _get_cache_service(request)


async def require_kb_initialized(request: Request) -> None:
    """
    Dependency that checks if the knowledge base is initialized.

    Raises HTTPException 503 if the database failed to initialize.
    This prevents knowledge base endpoints from being called when DB is unavailable.

    Args:
        request: FastAPI request object

    Raises:
        HTTPException: 503 Service Unavailable if KB not initialized
    """
    if not getattr(request.app.state, "kb_initialized", False):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Knowledge base features are currently unavailable",
                "reason": "Database connection could not be established",
                "help": [
                    "Ensure PostgreSQL with pgvector extension is running",
                    "Run migrations: PYTHONPATH=/path/to/backend alembic upgrade head",
                    "Verify DATABASE_URL environment variable is set correctly",
                    "Check logs for specific database connection errors",
                ],
            },
        )
