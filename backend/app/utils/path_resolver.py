import logging
from typing import Dict, Any, Optional
from ..config.api.path_mappings import api_path_manager

logger = logging.getLogger(__name__)

def resolve_path(category: str, endpoint: str, **kwargs) -> str:
    """Resolve API path with parameters.
    
    This function resolves a path template using the unified API path configuration system.
    
    Args:
        category: Category name from the API configuration
        endpoint: Endpoint name within the category
        **kwargs: Path parameters to substitute in the template
        
    Returns:
        Resolved path string
        
    Raises:
        ValueError: If path resolution fails or required parameters are missing
    """
    resolved_path = api_path_manager.resolve_path(category, endpoint, **kwargs)
    
    if not resolved_path:
        logger.error(f"Failed to resolve path for {category}.{endpoint}")
        raise ValueError(f"Failed to resolve path for {category}.{endpoint}")
        
    return resolved_path


def get_full_url(category: str, endpoint: str, **kwargs) -> str:
    """Get full URL with base URL and resolved path.
    
    This function returns a complete URL by combining the base URL with a resolved path.
    
    Args:
        category: Category name from the API configuration
        endpoint: Endpoint name within the category
        **kwargs: Path parameters to substitute in the template
        
    Returns:
        Complete URL string
        
    Raises:
        ValueError: If URL generation fails or required parameters are missing
    """
    full_url = api_path_manager.get_full_url(category, endpoint, **kwargs)
    
    if not full_url:
        logger.error(f"Failed to get full URL for {category}.{endpoint}")
        raise ValueError(f"Failed to get full URL for {category}.{endpoint}")
        
    return full_url


# Compatibility functions for the old API path system
def legacy_resolve_path(path_key: str, **kwargs) -> str:
    """Legacy compatibility function for the old path resolution system.
    
    This maps old path_key values to the new category.endpoint format and delegates
    to the new system.
    
    Args:
        path_key: Path key from the old system
        **kwargs: Path parameters to substitute in the template
        
    Returns:
        Resolved path string
        
    Raises:
        ValueError: If path resolution fails or the path_key is unknown
    """
    # Mapping from old path_key to new (category, endpoint) format
    legacy_mappings = {
        # Issues
        "ISSUES_LIST": ("issues", "list"),
        "ISSUE_DETAIL": ("issues", "detail"),
        "ISSUE_UPDATE": ("issues", "update"),
        "ISSUE_BULK_UPDATE": ("organization_issues", "bulk"),
        "ISSUE_ASSIGN": ("organization_issues", "assign"),
        "ISSUE_COMMENTS": ("organization_issues", "comments"),
        "ISSUE_ADD_COMMENT": ("organization_issues", "add_comment"),
        "ISSUE_EXPORT": ("organization_issues", "export"),
        
        # Events
        "ISSUE_EVENTS": ("issue_events", "list"),
        "ISSUE_EVENT_DETAIL": ("issue_events", "detail"),
        "ISSUE_EVENT_LATEST": ("issue_events", "latest"),
        "ISSUE_EVENT_OLDEST": ("issue_events", "oldest"),
        "EVENT_DETAIL": ("events", "detail"),
        
        # Projects
        "PROJECTS_LIST": ("projects", "list"),
        "PROJECT_DETAIL": ("projects", "detail"),
        "PROJECT_STATS": ("projects", "stats"),
        "PROJECT_USERS": ("projects", "users"),
        
        # Project Keys
        "PROJECT_KEYS_LIST": ("project_keys", "list"),
        "PROJECT_KEY_DETAIL": ("project_keys", "detail"),
    }
    
    if path_key not in legacy_mappings:
        logger.error(f"Unknown legacy path key: {path_key}")
        raise ValueError(f"Unknown legacy path key: {path_key}")
    
    category, endpoint = legacy_mappings[path_key]
    return resolve_path(category, endpoint, **kwargs)
