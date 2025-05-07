# File: backend/tests/services/test_config_service.py

import pytest
from unittest.mock import AsyncMock # For mocking async functions if needed
import httpx

from app.services.config_service import ConfigService
from app.models.config import DexterConfigUpdate
from app.config import settings # To potentially override during test

# Use pytest-asyncio decorator for async tests
@pytest.mark.asyncio
async def test_config_service_update_get():
    """Test updating and getting configuration."""
    service = ConfigService()
    initial_config = service.get_config()
    assert initial_config["organization_slug"] is None
    assert initial_config["project_slug"] is None

    update_data = DexterConfigUpdate(organization_slug="test-org", project_slug="test-proj ") # Note trailing space
    updated_config = service.update_config(update_data)

    assert updated_config["organization_slug"] == "test-org"
    assert updated_config["project_slug"] == "test-proj" # Check stripping

    final_config = service.get_config()
    assert final_config["organization_slug"] == "test-org"
    assert final_config["project_slug"] == "test-proj"

@pytest.mark.asyncio
async def test_status_check_sentry_ok_ollama_ok(respx_mock): # respx_mock from pytest-httpx or httpx itself
    """Test status check when Sentry token is OK and Ollama responds."""
    # Assume SENTRY_API_TOKEN is set correctly via test environment/fixture
    # Mock the Ollama call
    respx_mock.get(settings.ollama_base_url).mock(return_value=httpx.Response(200, text="Ollama is running"))

    service = ConfigService()
    status = await service.check_status()

    assert status["sentry_api_token_configured"] is True
    assert status["ollama_connection_status"] == "OK"
    assert status["ollama_model_configured"] == settings.ollama_model

@pytest.mark.asyncio
async def test_status_check_sentry_missing_ollama_offline(respx_mock, monkeypatch):
    """Test status check when Sentry token is missing and Ollama fails."""
    # Temporarily unset Sentry token for this test
    monkeypatch.setattr(settings, 'sentry_api_token', None)

    # Mock the Ollama call to raise connection error
    respx_mock.get(settings.ollama_base_url).mock(side_effect=httpx.ConnectError("Connection failed"))

    service = ConfigService()
    status = await service.check_status()

    assert status["sentry_api_token_configured"] is False
    assert status["ollama_connection_status"] == "Configured (Offline)"
    assert status["ollama_model_configured"] is None