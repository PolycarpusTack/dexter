# Path resolver service for handling API path resolution
import logging
from typing import Dict, Optional, Any
from fastapi import Request
from urllib.parse import urlparse, parse_qs

from ..config.api.path_mappings import api_path_manager, ApiEndpoint, HttpMethod

logger = logging.getLogger(__name__)


class PathResolverService:
    """Service for resolving and managing API paths"""
    
    def __init__(self):
        self.path_manager = api_path_manager
    
    def resolve_from_request(self, request: Request) -> tuple[Optional[ApiEndpoint], Dict[str, Any]]:
        """
        Resolve API endpoint from incoming request
        
        Returns:
            Tuple of (endpoint config, extracted parameters)
        """
        path = request.url.path
        method = HttpMethod(request.method.upper())
        
        # Extract path parameters from URL
        path_params = {}
        query_params = dict(request.query_params)
        
        # Try to match the path with known endpoints
        for endpoint in self.path_manager.mappings.values():
            if endpoint.method != method:
                continue
            
            # Check if the path pattern matches
            if self._match_path_pattern(path, endpoint.backend_path, path_params):
                logger.debug(f"Matched endpoint {endpoint.name} for path {path}")
                return endpoint, {**path_params, **query_params}
        
        logger.warning(f"No matching endpoint found for {method} {path}")
        return None, {}
    
    def _match_path_pattern(self, actual_path: str, pattern: str, params: Dict[str, str]) -> bool:
        """
        Match actual path against a pattern and extract parameters
        
        Args:
            actual_path: The actual request path
            pattern: The path pattern with placeholders
            params: Dictionary to store extracted parameters
            
        Returns:
            True if the path matches the pattern
        """
        # Split paths into segments
        actual_segments = actual_path.strip('/').split('/')
        pattern_segments = pattern.strip('/').split('/')
        
        # Must have same number of segments
        if len(actual_segments) != len(pattern_segments):
            return False
        
        # Compare each segment
        for actual, pattern in zip(actual_segments, pattern_segments):
            if pattern.startswith('{') and pattern.endswith('}'):
                # This is a parameter placeholder
                param_name = pattern[1:-1]
                params[param_name] = actual
            elif actual != pattern:
                # Not a parameter and doesn't match
                return False
        
        return True
    
    def build_sentry_url(self, endpoint_name: str, **params) -> str:
        """Build full Sentry API URL for an endpoint"""
        from app.core.settings import settings
        
        endpoint = self.path_manager.get_endpoint(endpoint_name)
        if not endpoint:
            raise ValueError(f"Unknown endpoint: {endpoint_name}")
        
        path = endpoint.resolve_sentry_path(**params)
        return f"{settings.sentry_base_url.rstrip('/')}/{path.lstrip('/')}"
    
    def build_frontend_url(self, endpoint_name: str, **params) -> str:
        """Build frontend URL for an endpoint"""
        endpoint = self.path_manager.get_endpoint(endpoint_name)
        if not endpoint:
            raise ValueError(f"Unknown endpoint: {endpoint_name}")
        
        return endpoint.resolve_frontend_path(**params)
    
    def get_cache_ttl(self, endpoint_name: str) -> Optional[int]:
        """Get cache TTL for an endpoint"""
        endpoint = self.path_manager.get_endpoint(endpoint_name)
        return endpoint.cache_ttl if endpoint else None
    
    def validate_params(self, endpoint_name: str, params: Dict[str, Any]) -> tuple[bool, list[str]]:
        """
        Validate that all required parameters are present
        
        Returns:
            Tuple of (is_valid, missing_params)
        """
        endpoint = self.path_manager.get_endpoint(endpoint_name)
        if not endpoint:
            return False, [f"Unknown endpoint: {endpoint_name}"]
        
        missing_params = []
        
        # Check path parameters
        for param in endpoint.path_params:
            if param not in params:
                missing_params.append(param)
        
        return len(missing_params) == 0, missing_params
    
    def get_endpoint_info(self, endpoint_name: str) -> Dict[str, Any]:
        """Get detailed information about an endpoint"""
        endpoint = self.path_manager.get_endpoint(endpoint_name)
        if not endpoint:
            return {}
        
        return {
            "name": endpoint.name,
            "method": endpoint.method.value,
            "frontend_path": endpoint.frontend_path,
            "backend_path": endpoint.backend_path,
            "sentry_path": endpoint.sentry_path,
            "path_params": endpoint.path_params,
            "query_params": endpoint.query_params,
            "requires_auth": endpoint.requires_auth,
            "cache_ttl": endpoint.cache_ttl,
            "description": endpoint.description,
        }


# Singleton instance
path_resolver = PathResolverService()
