# File: backend/tests/routers/test_config_router.py

from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock # For mocking the service dependency

# Import your FastAPI app instance
from app.main import app
# Import the service instance we want to mock
from app.services.config_service import config_service_instance

# Use FastAPI's TestClient
client = TestClient(app)

def test_get_status_endpoint():
    """Test the GET /status endpoint."""
    # Mock the service's check_status method BEFORE making the call
    expected_status = {
        "sentry_api_token_configured": True,
        "ollama_connection_status": "OK",
        "ollama_model_configured": "mistral:latest",
    }
    # Patch the actual instance used by the dependency injector for this test
    with patch.object(config_service_instance, 'check_status', return_value=expected_status) as mock_check:
        response = client.get("/api/v1/status")
        mock_check.assert_awaited_once() # Ensure the mocked async method was called

    assert response.status_code == 200
    assert response.json() == expected_status

def test_update_config_endpoint():
    """Test the PUT /config endpoint."""
    update_payload = {"organization_slug": "new-org", "project_slug": "new-proj"}
    expected_response = {"organization_slug": "new-org", "project_slug": "new-proj"}

    # Mock the service's update_config method
    with patch.object(config_service_instance, 'update_config', return_value=expected_response) as mock_update:
        response = client.put("/api/v1/config", json=update_payload)
        # Assert mock was called with Pydantic model (FastAPI handles conversion)
        # Actual assertion might need adjustment based on how FastAPI passes models
        assert mock_update.call_count == 1
        call_args = mock_update.call_args[0][0] # Get the first positional arg
        assert call_args.organization_slug == "new-org"
        assert call_args.project_slug == "new-proj"


    assert response.status_code == 200
    assert response.json() == expected_response

    # Verify the in-memory state was actually updated (optional, depends on test strategy)
    # current_config = config_service_instance.get_config()
    # assert current_config == expected_response