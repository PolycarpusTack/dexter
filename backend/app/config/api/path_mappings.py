from typing import Dict, Optional, Any, List, Type, Union
from .models import ApiEndpoint, ApiCategory, ApiPathConfig
import os
import yaml
from pathlib import Path
import logging
from functools import lru_cache


logger = logging.getLogger(__name__)


class ApiPathManager:
    """Unified API path manager with enhanced functionality.
    
    This class manages API endpoint configurations, providing methods to:
    - Load configurations from YAML files
    - Retrieve endpoint definitions
    - Resolve path templates with parameters
    - Generate full URLs
    
    The manager supports loading multiple configuration files and merging them.
    """
    
    def __init__(self):
        self.config: Optional[ApiPathConfig] = None
        self._loaded_files: List[str] = []
    
    def load_from_yaml(self, file_path: str) -> None:
        """Load configuration from YAML file.
        
        Args:
            file_path: Path to the YAML configuration file
            
        Raises:
            FileNotFoundError: If the file doesn't exist
            yaml.YAMLError: If the YAML is invalid
        """
        if file_path in self._loaded_files:
            logger.debug(f"Config file already loaded: {file_path}")
            return
            
        try:
            with open(file_path, 'r') as f:
                config_data = yaml.safe_load(f)
                
            if not self.config:
                # First config loaded becomes the base
                self.config = ApiPathConfig(**config_data)
            else:
                # Merge with existing config
                self._merge_config(config_data)
                    
            self._loaded_files.append(file_path)
            logger.info(f"Loaded API configuration from {file_path}")
        except FileNotFoundError:
            logger.error(f"Config file not found: {file_path}")
            raise
        except yaml.YAMLError as e:
            logger.error(f"Invalid YAML in {file_path}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading config from {file_path}: {e}")
            raise
    
    def _merge_config(self, config_data: Dict[str, Any]) -> None:
        """Merge new config data with existing configuration.
        
        Args:
            config_data: Dictionary with configuration data from YAML
        """
        if not self.config:
            return
            
        # Check version compatibility
        if config_data.get("version") != self.config.version:
            logger.warning(f"Config version mismatch: {config_data.get('version')} vs {self.config.version}")
        
        # Merge categories
        for category_name, category_data in config_data.get("categories", {}).items():
            if category_name in self.config.categories:
                # Merge endpoints in existing category
                category_obj = self.config.categories[category_name]
                
                # Update base_path if provided
                if "base_path" in category_data and category_data["base_path"]:
                    category_obj.base_path = category_data["base_path"]
                
                # Merge endpoints
                for endpoint_name, endpoint_data in category_data.get("endpoints", {}).items():
                    category_obj.endpoints[endpoint_name] = ApiEndpoint(**endpoint_data)
            else:
                # Add new category
                self.config.categories[category_name] = ApiCategory(
                    name=category_data.get("name", category_name),
                    base_path=category_data.get("base_path"),
                    endpoints={
                        name: ApiEndpoint(**data) 
                        for name, data in category_data.get("endpoints", {}).items()
                    }
                )
    
    def load_all_configs(self) -> None:
        """Load all YAML configurations from the endpoints directory.
        
        Searches for .yaml files in the endpoints directory and loads them.
        """
        endpoint_dir = Path(__file__).parent / "endpoints"
        
        if not endpoint_dir.exists():
            logger.warning(f"Endpoints directory not found: {endpoint_dir}")
            return
            
        for file_path in endpoint_dir.glob("*.yaml"):
            try:
                self.load_from_yaml(str(file_path))
            except Exception as e:
                logger.error(f"Failed to load {file_path}: {e}")
    
    def get_endpoint(self, category: str, name: str) -> Optional[ApiEndpoint]:
        """Get endpoint configuration by category and name.
        
        Args:
            category: Category name
            name: Endpoint name within the category
            
        Returns:
            ApiEndpoint if found, None otherwise
        """
        if not self.config:
            logger.warning("No configuration loaded")
            return None
            
        category_config = self.config.categories.get(category)
        if not category_config:
            logger.warning(f"Category not found: {category}")
            return None
            
        endpoint = category_config.endpoints.get(name)
        if not endpoint:
            logger.warning(f"Endpoint not found: {category}.{name}")
            
        return endpoint
    
    def resolve_path(self, category: str, name: str, **kwargs) -> Optional[str]:
        """Resolve endpoint path with provided parameters.
        
        Args:
            category: Category name
            name: Endpoint name within the category
            **kwargs: Path parameters to substitute in the template
            
        Returns:
            Resolved path string or None if endpoint not found
            
        Raises:
            ValueError: If required parameters are missing
        """
        endpoint = self.get_endpoint(category, name)
        if not endpoint:
            return None
            
        # Get base path for category
        category_config = self.config.categories.get(category)
        base_path = ""
        if category_config and category_config.base_path:
            try:
                base_path = category_config.base_path.format(**kwargs)
            except KeyError as e:
                raise ValueError(f"Missing required parameter for category base path: {e}")
        
        # Combine with endpoint path
        full_path_template = f"{base_path}{endpoint.path}"
        
        # Replace placeholders
        try:
            resolved_path = full_path_template.format(**kwargs)
            return resolved_path
        except KeyError as e:
            raise ValueError(f"Missing required parameter for path resolution: {e}")
    
    def get_full_url(self, category: str, name: str, **kwargs) -> Optional[str]:
        """Get complete URL including base URL and resolved path.
        
        Args:
            category: Category name
            name: Endpoint name within the category
            **kwargs: Path parameters to substitute in the template
            
        Returns:
            Complete URL string or None if endpoint not found
        """
        if not self.config:
            logger.warning("No configuration loaded")
            return None
            
        resolved_path = self.resolve_path(category, name, **kwargs)
        if not resolved_path:
            return None
        
        # Format base URL if it contains placeholders
        try:
            base_url = self.config.base_url.format(**kwargs)
        except KeyError as e:
            raise ValueError(f"Missing required parameter for base URL: {e}")
            
        return f"{base_url}{resolved_path}"
    
    @lru_cache(maxsize=100)
    def get_cached_full_url(self, category: str, name: str, **kwargs) -> Optional[str]:
        """Cached version of get_full_url for frequently accessed endpoints.
        
        Implements simple LRU caching to avoid repeated string formatting.
        
        Args:
            category: Category name
            name: Endpoint name within the category
            **kwargs: Path parameters to substitute in the template
            
        Returns:
            Complete URL string or None if endpoint not found
        """
        return self.get_full_url(category, name, **kwargs)


# Global instance 
api_path_manager = ApiPathManager()
