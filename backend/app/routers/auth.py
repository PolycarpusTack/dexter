"""
Authentication router for token management
"""
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from ..core.settings import settings
from ..middleware.csrf_protection import get_csrf_token
from ..services.config_service import ConfigService, get_config_service

router = APIRouter()

# Token configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Security check to ensure secret key is properly configured
if not hasattr(settings, "secret_key") or not settings.secret_key:
    raise RuntimeError("SECRET_KEY must be set in environment variables for security")


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    expires_in: int
    refresh_token: Optional[str] = None
    token_type: str = "Bearer"


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a new access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create a new refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_refresh_token(token: str):
    """Verify a refresh token"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
            )
        return payload
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        )


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    request: TokenRefreshRequest, config_service: ConfigService = Depends(get_config_service)
):
    """
    Refresh an access token using a refresh token
    """
    try:
        # Verify the refresh token
        payload = verify_refresh_token(request.refresh_token)

        # Extract user data from payload
        user_data = {
            "sub": payload.get("sub"),
            "org": payload.get("org"),
        }

        # Create new tokens
        access_token = create_access_token(user_data)
        new_refresh_token = create_refresh_token(user_data)

        return TokenRefreshResponse(
            access_token=access_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
            refresh_token=new_refresh_token,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token refresh failed: {str(e)}",
        )


class LoginRequest(BaseModel):
    """Login request with basic authentication"""

    organization_slug: str
    api_key: str


@router.post("/login")
async def login(request: LoginRequest, config_service: ConfigService = Depends(get_config_service)):
    """
    Login endpoint - validates organization and API key before creating tokens

    This provides basic authentication by validating:
    1. Organization slug matches configured organization
    2. API key is provided and matches expected format
    """
    config = config_service.get_config()

    # Validate organization slug
    configured_org = config.get("organization_slug") or settings.organization_slug
    if not configured_org:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Organization not configured"
        )

    if request.organization_slug != configured_org:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid organization")

    # Validate API key format (basic validation - in production this would check against a database)
    if not request.api_key or len(request.api_key) < 32:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    # In production, validate API key against stored keys
    # For now, check it matches the configured Sentry token format
    sentry_config = config.get("sentry", {})
    if "auth_token" in sentry_config and request.api_key != sentry_config["auth_token"]:
        # Only validate against Sentry token if it's configured
        # In production, this would check against a proper credential store
        if sentry_config.get("auth_token"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

    # Create user data from validated organization
    user_data = {
        "sub": request.organization_slug,
        "org": request.organization_slug,
    }

    # Create tokens
    access_token = create_access_token(user_data)
    refresh_token_value = create_refresh_token(user_data)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token_value,
        "token_type": "Bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get("/csrf-token")
async def csrf_token(response: Response):
    """Get a CSRF token for the session"""
    return await get_csrf_token(response)
