"""
Tests for the configuration module.
"""
import os
import pytest
from app.core.config import get_settings, AppMode, AppSettings
from fastapi.testclient import TestClient
from app.main import app

# Test that settings can be loaded
def test_settings_loaded():
    """Test that settings are loaded correctly."""
    settings = get_settings()
    assert settings is not None
    assert isinstance(settings, AppSettings)

# Test each application mode
@pytest.mark.parametrize("mode", [
    AppMode.DEFAULT,
    AppMode.DEBUG,
    AppMode.MINIMAL,
    AppMode.ENHANCED,
    AppMode.SIMPLIFIED,
])
def test_app_modes(mode):
    """Test that all application modes can be used."""
    # Set environment variable
    os.environ["APP_MODE"] = mode.value
    
    # Get settings with this mode
    settings = get_settings()
    
    # Verify mode was set
    assert settings.APP_MODE == mode

# Test application root route in each mode
@pytest.mark.parametrize("mode", [
    AppMode.DEFAULT,
    AppMode.DEBUG,
    AppMode.MINIMAL,
    AppMode.ENHANCED,
    AppMode.SIMPLIFIED,
])
def test_app_root_endpoint(mode):
    """Test that the root endpoint reflects the correct mode."""
    # Set environment variable
    os.environ["APP_MODE"] = mode.value
    
    # Create test client
    client = TestClient(app)
    
    # Test root endpoint
    response = client.get("/")
    assert response.status_code == 200
    
    # For non-default modes, the mode should be in the response
    data = response.json()
    if mode != AppMode.DEFAULT:
        assert mode.value in str(data.get("message", "")).lower()
    
    # Test health endpoint
    response = client.get("/health")
    assert response.status_code == 200
