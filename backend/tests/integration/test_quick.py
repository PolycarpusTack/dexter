"""
Quick test for verifying the new architecture.
This is a simplified version that just tests app creation, 
without launching a server.
"""
import os
import sys
import logging
from app.core.config import AppMode, get_settings
from app.core.factory import create_app

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test modes
MODES = [mode.value for mode in AppMode]

def test_mode(mode):
    """Test a specific application mode."""
    logger.info(f"Testing {mode} mode...")
    
    try:
        # Set environment variable
        os.environ["APP_MODE"] = mode
        
        # Get settings
        settings = get_settings()
        assert settings.APP_MODE == mode, f"Expected mode {mode}, got {settings.APP_MODE}"
        
        # Create app
        app = create_app(settings)
        assert app is not None, "App should not be None"
        
        logger.info(f"✅ {mode} mode test passed")
        return True
    except Exception as e:
        logger.error(f"Error testing {mode} mode: {e}")
        return False

def main():
    """Run tests for all modes."""
    success = True
    
    for mode in MODES:
        if not test_mode(mode):
            success = False
    
    if success:
        logger.info("✅ All tests passed!")
        return 0
    else:
        logger.error("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
