"""Test module to check route loading issues."""
import sys
import os
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add the backend directory to the path
backend_dir = str(Path(__file__).parent)
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

# Test each router individually
routers_to_test = [
    "events",
    "issues",
    "config",
    "debug",
    "ai",
    "analyzers",
    "discover",
    "alerts",
    "organization_alerts",
    "templates",
    "metrics",
]

for router_name in routers_to_test:
    try:
        logger.info(f"Testing import of {router_name} router...")
        module = __import__(f"app.routers.{router_name}", fromlist=["router"])
        router = getattr(module, "router")
        logger.info(f"✓ {router_name} router imported successfully")
    except Exception as e:
        logger.error(f"✗ {router_name} router failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())