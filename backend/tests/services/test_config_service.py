# File: backend/tests/services/test_config_service.py

import pytest

from app.services.config_service import ConfigService
from app.models.config import DexterConfigUpdate

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
async def test_status_check():
    """Test the status check functionality of the config service."""
    service = ConfigService()
    status = await service.check_status()
    
    # Check the response has the expected structure and types
    assert "sentry_api_token_configured" in status
    assert "ollama_connection_status" in status
    assert "ollama_model_configured" in status
    
    assert isinstance(status["sentry_api_token_configured"], bool)
    assert isinstance(status["ollama_connection_status"], str)