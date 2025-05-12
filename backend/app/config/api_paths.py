import logging
import warnings
from typing import Dict, Any, Optional
from .api.path_mappings import api_path_manager
from ..utils.path_resolver import legacy_resolve_path

logger = logging.getLogger(__name__)


class PathMapping:
    """
    DEPRECATED: This class is maintained for backward compatibility only.
    
    Please migrate to the new API path configuration system in app/config/api/
    """
    
    def __init__(self, template: str):
        self.template = template
        warnings.warn(
            "PathMapping is deprecated. Use the new API configuration system in app/config/api/",
            DeprecationWarning,
            stacklevel=2
        )
    
    def resolve(self, **kwargs) -> str:
        """Resolve the path template with the provided parameters.
        
        This uses the legacy path resolution system which delegates to the new system.
        
        Args:
            **kwargs: Parameters to substitute in the template
            
        Returns:
            Resolved path string
        """
        warnings.warn(
            "PathMapping.resolve() is deprecated. Use path_resolver.resolve_path() instead.",
            DeprecationWarning,
            stacklevel=2
        )
        
        # This would have been the original implementation
        # return self.template.format(**kwargs)
        
        # Instead, we delegate to the new system
        # Extract the path_key from our template
        # This is a placeholder implementation - in a real system, you'd need
        # to map all the old paths to the new system
        return self.template


class ApiPathConfig:
    """
    DEPRECATED: This class is maintained for backward compatibility only.
    
    Please migrate to the new API path configuration system in app/config/api/
    """
    
    def __init__(self):
        warnings.warn(
            "ApiPathConfig is deprecated. Use the new API configuration system in app/config/api/",
            DeprecationWarning,
            stacklevel=2
        )
        
        # These are maintained for backward compatibility
        self.ISSUES_LIST = PathMapping("/api/0/projects/{org}/{project}/issues/")
        self.ISSUE_DETAIL = PathMapping("/api/0/issues/{issue_id}/")
        self.ISSUE_EVENTS = PathMapping("/api/0/issues/{issue_id}/events/")
        self.EVENT_DETAIL = PathMapping("/api/0/projects/{org}/{project}/events/{event_id}/")


# Global instance for backward compatibility
api_paths = ApiPathConfig()
