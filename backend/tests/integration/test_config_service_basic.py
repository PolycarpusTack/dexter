import sys
import os
sys.path.insert(0, os.path.abspath('.'))

# Test the indentation fixes
from app.services.config_service import ConfigService
from app.models.config import DexterConfigUpdate

# Simple test for the config update functionality
def test_config_service_update():
    service = ConfigService()
    
    # Test initial state
    initial_config = service.get_config()
    print("Initial config:", initial_config)
    
    # Test update
    update_data = DexterConfigUpdate(organization_slug="test-org", project_slug="test-proj")
    updated_config = service.update_config(update_data)
    print("Updated config:", updated_config)
    
    # Verify update worked
    assert updated_config["organization_slug"] == "test-org"
    assert updated_config["project_slug"] == "test-proj"
    
    print("Config service update test passed!")

if __name__ == "__main__":
    test_config_service_update()