"""Test script to check if backend can be started."""
import sys
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add the backend directory to the path
backend_dir = str(Path(__file__).parent)
sys.path.insert(0, backend_dir)

try:
    # Test if we can import the main app
    from app.main import app
    logger.info("✓ Successfully imported main app")
    
    # List all routes
    logger.info("\nAvailable routes:")
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            logger.info(f"  {list(route.methods)} {route.path}")
            
except Exception as e:
    logger.error(f"✗ Failed to import main app: {str(e)}")
    import traceback
    logger.error(traceback.format_exc())