"""
Security tests for authentication system.

Tests Issue 1 fix: JWT authentication bypass vulnerability.
"""
import pytest
from datetime import datetime, timedelta
from jose import jwt
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials

from app.dependencies import get_current_user
from app.core.config import AppSettings


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    return AppSettings(
        DEBUG=False,
        SECRET_KEY="test-secret-key-at-least-32-characters-long"
    )


@pytest.fixture
def mock_debug_settings():
    """Mock debug settings for testing."""
    return AppSettings(
        DEBUG=True,
        SECRET_KEY="test-secret-key"
    )


@pytest.fixture
def valid_token(mock_settings):
    """Create a valid JWT token for testing."""
    payload = {
        "sub": "user123",
        "username": "testuser",
        "email": "test@example.com",
        "role": "user",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, mock_settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture
def expired_token(mock_settings):
    """Create an expired JWT token for testing."""
    payload = {
        "sub": "user123",
        "username": "testuser",
        "email": "test@example.com",
        "role": "user",
        "exp": datetime.utcnow() - timedelta(hours=1)  # Expired 1 hour ago
    }
    return jwt.encode(payload, mock_settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture
def invalid_signature_token(mock_settings):
    """Create a token with invalid signature."""
    payload = {
        "sub": "user123",
        "username": "testuser",
        "email": "test@example.com",
        "role": "user",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    # Sign with different key
    return jwt.encode(payload, "wrong-secret-key", algorithm="HS256")


@pytest.fixture
def token_missing_user_id(mock_settings):
    """Create a token without user ID (sub claim)."""
    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "role": "user",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, mock_settings.SECRET_KEY, algorithm="HS256")


@pytest.mark.asyncio
async def test_rejects_invalid_token(mock_settings, invalid_signature_token, monkeypatch):
    """Test that invalid tokens are rejected with 401."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create mock request and credentials
    request = type('Request', (), {})()
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=invalid_signature_token
    )

    # Should raise 401 Unauthorized
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in exc_info.value.detail
    assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}


@pytest.mark.asyncio
async def test_rejects_expired_token(mock_settings, expired_token, monkeypatch):
    """Test that expired tokens are rejected with 401."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create mock request and credentials
    request = type('Request', (), {})()
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=expired_token
    )

    # Should raise 401 Unauthorized
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Token expired" in exc_info.value.detail
    assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}


@pytest.mark.asyncio
async def test_rejects_token_missing_user_id(mock_settings, token_missing_user_id, monkeypatch):
    """Test that tokens without user ID are rejected."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create mock request and credentials
    request = type('Request', (), {})()
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token_missing_user_id
    )

    # Should raise 401 Unauthorized
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid token: missing user ID" in exc_info.value.detail


@pytest.mark.asyncio
async def test_accepts_valid_token(mock_settings, valid_token, monkeypatch):
    """Test that valid tokens are accepted and user info is extracted."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create mock request and credentials
    request = type('Request', (), {})()
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=valid_token
    )

    # Should succeed and return user info
    user = await get_current_user(request, credentials)

    assert user["id"] == "user123"
    assert user["username"] == "testuser"
    assert user["email"] == "test@example.com"
    assert user["role"] == "user"


@pytest.mark.asyncio
async def test_requires_credentials_in_production(mock_settings, monkeypatch):
    """Test that credentials are required when not in debug mode."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create mock request with no credentials
    request = type('Request', (), {})()
    credentials = None

    # Should raise 401 Unauthorized
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Not authenticated" in exc_info.value.detail
    assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}


@pytest.mark.asyncio
async def test_debug_mode_allows_no_credentials(mock_debug_settings, monkeypatch):
    """Test that debug mode allows access without credentials."""
    monkeypatch.setattr("app.dependencies.settings", mock_debug_settings)

    # Create mock request with no credentials
    request = type('Request', (), {})()
    credentials = None

    # Should succeed in debug mode
    user = await get_current_user(request, credentials)

    assert user["id"] == "dev-user"
    assert user["username"] == "dev"
    assert user["role"] == "admin"


def test_requires_secret_key_in_production(mock_settings):
    """Test that SECRET_KEY is required and has appropriate warning."""
    # Check that default SECRET_KEY contains warning
    default_settings = AppSettings()
    assert "CHANGE_THIS_IN_PRODUCTION" in default_settings.SECRET_KEY

    # Check that custom SECRET_KEY works
    assert mock_settings.SECRET_KEY == "test-secret-key-at-least-32-characters-long"


@pytest.mark.asyncio
async def test_rejects_malformed_jwt(mock_settings, monkeypatch):
    """Test that malformed JWT tokens are rejected."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create mock request with malformed token
    request = type('Request', (), {})()
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="not-a-valid-jwt-token"
    )

    # Should raise 401 Unauthorized
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(request, credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Could not validate credentials" in exc_info.value.detail


@pytest.mark.asyncio
async def test_handles_token_without_expiration(mock_settings, monkeypatch):
    """Test that tokens without expiration claim are accepted."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create token without exp claim
    payload = {
        "sub": "user123",
        "username": "testuser",
        "email": "test@example.com",
        "role": "user"
        # No exp claim
    }
    token = jwt.encode(payload, mock_settings.SECRET_KEY, algorithm="HS256")

    request = type('Request', (), {})()
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token
    )

    # Should succeed - tokens without exp don't expire
    user = await get_current_user(request, credentials)
    assert user["id"] == "user123"


@pytest.mark.asyncio
async def test_extracts_default_values_for_optional_fields(mock_settings, monkeypatch):
    """Test that optional fields get default values if missing."""
    monkeypatch.setattr("app.dependencies.settings", mock_settings)

    # Create minimal token with only required sub claim
    payload = {
        "sub": "user456",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    token = jwt.encode(payload, mock_settings.SECRET_KEY, algorithm="HS256")

    request = type('Request', (), {})()
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token
    )

    # Should succeed with default values
    user = await get_current_user(request, credentials)
    assert user["id"] == "user456"
    assert user["username"] == "user456"  # Defaults to user_id
    assert user["email"] == ""
    assert user["role"] == "user"
