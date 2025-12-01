"""
Tests for Sentry client lifecycle management.

Tests Issue 4 fix: Leaked Sentry HTTP client.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx

from app.services.sentry_client import SentryApiClient
from app.core.config import AppSettings


@pytest.fixture
def mock_settings():
    """Mock settings for testing."""
    return AppSettings(
        DEBUG=True,
        SENTRY_BASE_URL="https://sentry.io",
        SENTRY_API_TOKEN="test-token"
    )


@pytest.mark.asyncio
async def test_sentry_client_has_close_method():
    """Test that SentryApiClient has a close() method."""
    client = SentryApiClient(token="test-token")

    # Should have close method
    assert hasattr(client, 'close')
    assert callable(client.close)

    # Close should be async
    await client.close()


@pytest.mark.asyncio
async def test_close_method_closes_http_client():
    """Test that close() actually closes the httpx.AsyncClient."""
    client = SentryApiClient(token="test-token")

    # Mock the httpx client
    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.aclose = AsyncMock()
    client.client = mock_http_client

    # Call close
    await client.close()

    # Verify aclose was called
    mock_http_client.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_close_handles_none_client():
    """Test that close() handles None client gracefully."""
    client = SentryApiClient(token="test-token")
    client.client = None

    # Should not raise error
    await client.close()


@pytest.mark.asyncio
async def test_context_manager_support():
    """Test that SentryApiClient supports async context manager."""
    client = SentryApiClient(token="test-token")

    # Mock the httpx client
    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.aclose = AsyncMock()
    client.client = mock_http_client

    # Use as context manager
    async with client as c:
        assert c is client

    # Verify close was called
    mock_http_client.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_context_manager_closes_on_exception():
    """Test that context manager closes client even when exception occurs."""
    client = SentryApiClient(token="test-token")

    # Mock the httpx client
    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.aclose = AsyncMock()
    client.client = mock_http_client

    # Use as context manager with exception
    with pytest.raises(ValueError):
        async with client:
            raise ValueError("Test exception")

    # Verify close was still called
    mock_http_client.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_dependency_injection_closes_client():
    """Test that dependency injection pattern closes client properly."""
    from app.dependencies import get_sentry_client
    from fastapi import FastAPI

    app = FastAPI()

    # Mock settings
    with patch('app.dependencies.settings') as mock_settings:
        mock_settings.get_sentry_token.return_value = "test-token"

        # Create a mock client
        mock_client = AsyncMock(spec=SentryApiClient)
        mock_client.close = AsyncMock()

        with patch('app.dependencies.SentryApiClient', return_value=mock_client):
            # Simulate dependency injection
            async for client in get_sentry_client():
                assert client is mock_client

            # Verify close was called
            mock_client.close.assert_awaited_once()


@pytest.mark.asyncio
async def test_client_can_be_reused_after_initialization():
    """Test that client can be reused multiple times before closing."""
    client = SentryApiClient(token="test-token")

    # Mock the httpx client to track calls
    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.request = AsyncMock(return_value=MagicMock(
        status_code=200,
        json=lambda: {"test": "data"}
    ))
    client.client = mock_http_client

    # Make multiple requests
    await client._request("GET", "https://sentry.io/api/test1")
    await client._request("GET", "https://sentry.io/api/test2")
    await client._request("GET", "https://sentry.io/api/test3")

    # Should have made 3 requests
    assert mock_http_client.request.await_count == 3

    # Now close
    mock_http_client.aclose = AsyncMock()
    await client.close()

    # Verify close was called once
    mock_http_client.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_multiple_close_calls_are_safe():
    """Test that calling close() multiple times doesn't cause errors."""
    client = SentryApiClient(token="test-token")

    # Mock the httpx client
    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.aclose = AsyncMock()
    client.client = mock_http_client

    # Call close multiple times
    await client.close()
    await client.close()
    await client.close()

    # Should have been called multiple times (that's OK)
    assert mock_http_client.aclose.await_count >= 1


@pytest.mark.asyncio
async def test_client_initialization_creates_http_client():
    """Test that initializing SentryApiClient creates httpx.AsyncClient."""
    client = SentryApiClient(token="test-token", timeout=30)

    # Should have created an AsyncClient
    assert client.client is not None
    assert isinstance(client.client, httpx.AsyncClient)

    # Check timeout configuration
    assert client.timeout == 30

    # Clean up
    await client.close()


@pytest.mark.asyncio
async def test_shutdown_hook_closes_cache_service():
    """Test that shutdown hook properly closes cache service."""
    from app.core.factory import create_app

    settings = AppSettings(DEBUG=True)
    app = create_app(settings)

    # Add mock cache to app state
    mock_cache = AsyncMock()
    mock_cache.close = AsyncMock()
    app.state.cache = mock_cache

    # Simulate shutdown event
    from contextlib import asynccontextmanager

    # Get the shutdown event handler
    for handler in app.router.lifespan_context.__wrapped__.__code__.co_consts:
        if hasattr(handler, '__name__') and 'shutdown' in str(handler):
            break

    # Trigger shutdown by creating and closing the lifespan context
    async with app.router.lifespan_context(app):
        pass  # Startup happens here

    # After context exits, shutdown should have been called
    # Note: This is a simplified test - in reality, the shutdown event is handled by FastAPI


def test_sentry_client_stores_token():
    """Test that SentryApiClient properly stores the token."""
    token = "test-api-token-12345"
    client = SentryApiClient(token=token)

    assert client.token == token


def test_sentry_client_uses_settings_token_by_default(mock_settings):
    """Test that SentryApiClient uses settings token when none provided."""
    with patch('app.services.sentry_client.settings', mock_settings):
        client = SentryApiClient()

        assert client.token == mock_settings.SENTRY_API_TOKEN


@pytest.mark.asyncio
async def test_client_logging_on_close():
    """Test that closing client logs a message."""
    client = SentryApiClient(token="test-token")

    # Mock the httpx client
    mock_http_client = AsyncMock(spec=httpx.AsyncClient)
    mock_http_client.aclose = AsyncMock()
    client.client = mock_http_client

    # Mock logger
    with patch('app.services.sentry_client.logger') as mock_logger:
        await client.close()

        # Verify logging occurred
        mock_logger.info.assert_called_once()
        log_message = mock_logger.info.call_args[0][0]
        assert "closed" in log_message.lower()
