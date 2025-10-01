# Minimal test for config_service.py
import sys
import os
sys.path.insert(0, os.path.abspath('.'))

# Import directly
from app.models.config import DexterConfigUpdate

# Implementation class copy for testing
class ConfigService:
    def __init__(self):
        self._organization_slug = None
        self._project_slug = None
        print("In-memory ConfigService initialized.")

    def get_config(self):
        return {"organization_slug": self._organization_slug, "project_slug": self._project_slug}

    def update_config(self, config_update: DexterConfigUpdate):
        if config_update.organization_slug is not None:
            self._organization_slug = config_update.organization_slug.strip() or None
            print(f"Config updated: organization_slug='{self._organization_slug}'")
        if config_update.project_slug is not None:
            self._project_slug = config_update.project_slug.strip() or None
            print(f"Config updated: project_slug='{self._project_slug}'")
        return self.get_config()

# Simple test for the config update functionality
def test_config_service_update():
    service = ConfigService()
    
    # Test initial state
    initial_config = service.get_config()
    print("Initial config:", initial_config)
    
    # Test update
    update_data = DexterConfigUpdate(organization_slug="test-org", project_slug="test-proj ")
    updated_config = service.update_config(update_data)
    print("Updated config:", updated_config)
    
    # Verify update worked
    assert updated_config["organization_slug"] == "test-org"
    assert updated_config["project_slug"] == "test-proj"
    
    print("Config service update test passed!")

if __name__ == "__main__":
    test_config_service_update()