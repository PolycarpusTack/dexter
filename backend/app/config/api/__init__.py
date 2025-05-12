from .path_mappings import api_path_manager
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def initialize_api_config():
    """Initialize the API configuration system.
    
    This loads all API endpoint configurations from YAML files
    in the endpoints directory.
    """
    # Create endpoints directory if it doesn't exist
    endpoints_dir = Path(__file__).parent / "endpoints"
    endpoints_dir.mkdir(exist_ok=True)
    
    # Load all configurations
    api_path_manager.load_all_configs()
    
    logger.info("API configuration initialized")

# Initialize on import
initialize_api_config()
