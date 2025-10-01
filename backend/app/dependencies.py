"""
Dependency functions for FastAPI.
Provides common dependencies for use with FastAPI's dependency injection system.
"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.settings import settings
from app.services.cache_service import get_cache_service as _get_cache_service
from app.services.sentry_client import SentryApiClient

# Configure logging
logger = logging.getLogger(__name__)

# Setup security scheme
security = HTTPBearer(auto_error=False)


async def get_sentry_client():
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
    In this basic implementation, we don't actually authenticate,
    but this is where you would implement authentication logic.

    Args:
        request: FastAPI request object
        credentials: Optional HTTP authorization credentials

    Returns:
        dict: User information

    Raises:
        HTTPException: If authentication fails
    """
    # In a real app, this would validate a JWT token or other auth mechanism
    # For now, we'll just return a mock user

    # For development, we don't require authentication
    if getattr(settings, "DEBUG", False):
        return {"id": "dev-user", "username": "dev", "email": "dev@example.com", "role": "admin"}

    # If not in development and no credentials, raise error
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In production, you would validate the token here
    # For now, just log and accept any token
    token = credentials.credentials
    logger.info(f"User authenticated with token starting with: {token[:5]}...")

    # Return mock user information
    return {"id": "user123", "username": "user", "email": "user@example.com", "role": "user"}


# Re-export cache service dependency for tests/integration
def get_cache_service(request: Request):
    return _get_cache_service(request)
