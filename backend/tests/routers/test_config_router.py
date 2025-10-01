# File: backend/tests/routers/test_config_router.py

from fastapi.testclient import TestClient

# Import your FastAPI app instance
from app.main import app

# Use FastAPI's TestClient
client = TestClient(app)

def test_get_status_endpoint():
    """Test the GET /status endpoint."""
    response = client.get("/api/v1/status")
    
    assert response.status_code == 200
    data = response.json()
    
    # Check the response has the expected structure
    assert "sentry_api_token_configured" in data
    assert "ollama_connection_status" in data
    assert "ollama_model_configured" in data
    
    # Check types
    assert isinstance(data["sentry_api_token_configured"], bool)
    assert isinstance(data["ollama_connection_status"], str)
    # ollama_model_configured can be None or string

def test_update_config_endpoint():
    """Test the PUT /config endpoint."""
    update_payload = {"organization_slug": "new-org", "project_slug": "new-proj"}
    
    response = client.put("/api/v1/config", json=update_payload)
    
    assert response.status_code == 200
    data = response.json()
    
    # Check the response matches what we sent
    assert data["organization_slug"] == "new-org"
    assert data["project_slug"] == "new-proj"
    
    # Verify the config was actually updated by getting it again
    get_response = client.get("/api/v1/config")
    assert get_response.status_code == 200
    current_config = get_response.json()
    assert current_config["organization_slug"] == "new-org"
    assert current_config["project_slug"] == "new-proj"