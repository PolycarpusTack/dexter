"""
Test script for the new Dexter architecture.

This script tests that the application can be created correctly in all modes.
"""
import os
import sys
import logging
import requests
from contextlib import contextmanager
import time
import threading
import uvicorn

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test modes
MODES = ["default", "debug", "minimal", "enhanced", "simplified"]

# Test server port
PORT = 8080


@contextmanager
def run_server_in_background(mode, port=PORT):
    """Run the server in a background thread."""
    # Set mode environment variable
    os.environ["APP_MODE"] = mode
    
    # Create server thread
    def server_thread():
        try:
            # Import after setting environment variable
            from app.main import app
            uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")
        except Exception as e:
            logger.error(f"Server error: {e}")
    
    # Start thread
    thread = threading.Thread(target=server_thread)
    thread.daemon = True
    thread.start()
    
    # Wait for server to start
    time.sleep(2)
    
    try:
        yield
    finally:
        # No need to explicitly stop, as it's a daemon thread
        pass


def test_mode(mode):
    """Test a specific application mode."""
    logger.info(f"Testing {mode} mode...")
    
    with run_server_in_background(mode):
        try:
            # Test root endpoint
            response = requests.get(f"http://127.0.0.1:{PORT}/")
            if response.status_code != 200:
                logger.error(f"Root endpoint returned {response.status_code}")
                return False
            
            # Verify mode from response
            data = response.json()
            if mode != "default" and mode not in str(data.get("message")):
                logger.error(f"Mode not in response: {data}")
                return False
            
            # Test health endpoint
            response = requests.get(f"http://127.0.0.1:{PORT}/health")
            if response.status_code != 200:
                logger.error(f"Health endpoint returned {response.status_code}")
                return False
            
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
