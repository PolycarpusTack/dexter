import logging
from typing import Dict, Optional, Any
from fastapi import Request
from ..config.api.path_mappings import api_path_manager
from ..config.api.models import ApiEndpoint, HttpMethod

# Path resolver service for handling API path resolution

logger = logging.getLogger(__name__)


class PathResolverService:
    """Service for resolving and managing API paths"""

    def __init__(self):
        self.path_manager = api_path_manager
        # Legacy endpoint-name to (category, name) mapping
        self._name_map = {
            # Issues
            "list_issues": ("issues", "list"),
            "get_issue": ("issues", "detail"),
            "update_issue": ("issues", "update"),
            # Events
            "list_issue_events": ("issue_events", "list"),
            "event_detail": ("events", "detail"),
        }

    def resolve_from_request(
        self, request: Request
    ) -> tuple[Optional[ApiEndpoint], Dict[str, Any]]:
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
        actual_segments = actual_path.strip("/").split("/")
        pattern_segments = pattern.strip("/").split("/")

        # Must have same number of segments
        if len(actual_segments) != len(pattern_segments):
            return False

        # Compare each segment
        for actual, pattern in zip(actual_segments, pattern_segments):
            if pattern.startswith("{") and pattern.endswith("}"):
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

        mapped = self._name_map.get(endpoint_name)
        if not mapped:
            raise ValueError(f"Unknown endpoint: {endpoint_name}")
        category, name = mapped
        # Build full URL against Sentry base URL
        endpoint = self.path_manager.get_endpoint(category, name)
        if not endpoint:
            raise ValueError(f"Unknown endpoint: {endpoint_name}")

        # Resolve full URL using the path manager
        url = self.path_manager.get_full_url(
            category, name, sentry_base_url=settings.sentry_base_url, **params
        )
        if not url:
            raise ValueError(f"Failed to resolve URL for endpoint: {endpoint_name}")
        return url

    def build_frontend_url(self, endpoint_name: str, **params) -> str:
        """Build frontend URL for an endpoint"""
        # Provide minimal, stable frontend paths for known endpoints
        if endpoint_name == "get_issue":
            issue_id = params.get("issue_id") or params.get("id")
            if not issue_id:
                raise ValueError("issue_id is required")
            return f"/api/v1/issues/{issue_id}"
        if endpoint_name == "list_issues":
            return "/api/v1/issues"
        return f"/api/v1/{endpoint_name}"

    def get_cache_ttl(self, endpoint_name: str) -> Optional[int]:
        """Get cache TTL for an endpoint"""
        mapped = self._name_map.get(endpoint_name)
        if not mapped:
            return None
        category, name = mapped
        endpoint = self.path_manager.get_endpoint(category, name)
        ttl = endpoint.cache_ttl if endpoint else None
        # Normalize: treat 0/False as no cache
        return ttl or None

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
        mapped = self._name_map.get(endpoint_name)
        if not mapped:
            return {}
        category, name = mapped
        ep = self.path_manager.get_endpoint(category, name)
        if not ep:
            return {}
        # Extract path params from template
        import re

        path_params = re.findall(r"{(.*?)}", ep.path or "")
        return {
            "name": name,
            "method": ep.method.value,
            "frontend_path": self.build_frontend_url(
                endpoint_name, **{p: f"{{{p}}}" for p in path_params}
            ),
            "backend_path": (
                self.path_manager.resolve_path(
                    category, name, **{p: f"{{{p}}}" for p in path_params}
                )
                or ""
            ),
            "sentry_path": ep.path,
            "path_params": path_params,
            "query_params": list((ep.params or {}).keys()),
            "requires_auth": ep.requires_auth,
            "cache_ttl": ep.cache_ttl,
            "description": ep.description,
        }


# Singleton instance
path_resolver = PathResolverService()
