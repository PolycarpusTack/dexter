"""
Utility module for Pydantic version compatibility.
Provides functions and helpers to maintain compatibility 
between Pydantic v1 and v2.
"""

import logging
from pydantic import Field

logger = logging.getLogger(__name__)

def get_pydantic_version():
    """
    Get the installed Pydantic version.
    
    Returns:
        int: Major version number (1 or 2)
    """
    try:
        import pydantic
        version = getattr(pydantic, "__version__", "1.0.0")
        major_version = int(version.split(".")[0])
        return major_version
    except (ImportError, ValueError, IndexError):
        return 1  # Default to v1 if we can't determine version

# Flag to check if we're using Pydantic v2+
PYDANTIC_V2 = get_pydantic_version() >= 2

# Log the detected version on module import
logger.info(f"Using Pydantic v{'2+' if PYDANTIC_V2 else '1'}")

def pattern_field(pattern, **kwargs):
    """
    Create a Field with the appropriate validation parameter 
    based on the Pydantic version.
    
    Args:
        pattern (str): Regex pattern string
        **kwargs: Additional field arguments
        
    Returns:
        Field: Pydantic Field with appropriate validation
    """
    if PYDANTIC_V2:
        return Field(pattern=pattern, **kwargs)
    else:
        return Field(regex=pattern, **kwargs)

def config_class_factory(config_dict):
    """
    Create the appropriate config class or dictionary
    based on the Pydantic version.
    
    Args:
        config_dict (dict): Configuration dictionary
        
    Returns:
        Union[type, dict]: Config class for v1, dict for v2
    """
    if PYDANTIC_V2:
        return config_dict
    else:
        class Config:
            pass
        
        for key, value in config_dict.items():
            if key == "json_schema_extra":
                setattr(Config, "schema_extra", value)
            else:
                setattr(Config, key, value)
        
        return Config
