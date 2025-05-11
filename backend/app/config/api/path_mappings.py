# Centralized API path mapping configuration
# Maps between frontend paths, backend paths, and Sentry API paths

from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class HttpMethod(Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"


@dataclass
class ApiEndpoint:
    """Configuration for a single API endpoint"""
    name: str
    frontend_path: str
    backend_path: str
    sentry_path: str
    method: HttpMethod = HttpMethod.GET
    path_params: list[str] = field(default_factory=list)
    query_params: list[str] = field(default_factory=list)
    requires_auth: bool = True
    cache_ttl: Optional[int] = None  # Cache TTL in seconds
    description: str = ""
    
    def resolve_frontend_path(self, **params) -> str:
        """Resolve frontend path with parameters"""
        path = self.frontend_path
        for param, value in params.items():
            path = path.replace(f"{{{param}}}", str(value))
        return path
    
    def resolve_backend_path(self, **params) -> str:
        """Resolve backend path with parameters"""
        path = self.backend_path
        for param, value in params.items():
            path = path.replace(f"{{{param}}}", str(value))
        return path
    
    def resolve_sentry_path(self, **params) -> str:
        """Resolve Sentry API path with parameters"""
        path = self.sentry_path
        for param, value in params.items():
            path = path.replace(f"{{{param}}}", str(value))
        return path


# API Path Mappings
API_MAPPINGS: Dict[str, ApiEndpoint] = {
    # Issues endpoints
    "list_issues": ApiEndpoint(
        name="list_issues",
        frontend_path="/api/v1/issues",
        backend_path="/organizations/{organization_slug}/projects/{project_slug}/issues",
        sentry_path="/api/0/projects/{organization_slug}/{project_slug}/issues/",
        method=HttpMethod.GET,
        path_params=["organization_slug", "project_slug"],
        query_params=["cursor", "status", "query", "limit"],
        cache_ttl=300,  # 5 minutes
        description="List project issues"
    ),
    
    "get_issue": ApiEndpoint(
        name="get_issue",
        frontend_path="/api/v1/issues/{issue_id}",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}",
        sentry_path="/api/0/issues/{issue_id}/",
        method=HttpMethod.GET,
        path_params=["organization_slug", "issue_id"],
        cache_ttl=60,  # 1 minute
        description="Get issue details"
    ),
    
    "update_issue": ApiEndpoint(
        name="update_issue",
        frontend_path="/api/v1/issues/{issue_id}",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}",
        sentry_path="/api/0/issues/{issue_id}/",
        method=HttpMethod.PUT,
        path_params=["organization_slug", "issue_id"],
        description="Update issue"
    ),
    
    "bulk_update_issues": ApiEndpoint(
        name="bulk_update_issues",
        frontend_path="/api/v1/issues/bulk",
        backend_path="/organizations/{organization_slug}/projects/{project_slug}/issues/bulk",
        sentry_path="/api/0/projects/{organization_slug}/{project_slug}/issues/",
        method=HttpMethod.PUT,
        path_params=["organization_slug", "project_slug"],
        query_params=["id", "status"],
        description="Bulk update issues"
    ),
    
    # Events endpoints
    "get_event": ApiEndpoint(
        name="get_event",
        frontend_path="/api/v1/events/{event_id}",
        backend_path="/organizations/{organization_slug}/projects/{project_slug}/events/{event_id}",
        sentry_path="/api/0/projects/{organization_slug}/{project_slug}/events/{event_id}/",
        method=HttpMethod.GET,
        path_params=["organization_slug", "project_slug", "event_id"],
        cache_ttl=600,  # 10 minutes
        description="Get event details"
    ),
    
    "list_issue_events": ApiEndpoint(
        name="list_issue_events",
        frontend_path="/api/v1/issues/{issue_id}/events",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}/events",
        sentry_path="/api/0/issues/{issue_id}/events/",
        method=HttpMethod.GET,
        path_params=["organization_slug", "issue_id"],
        query_params=["cursor", "environment"],
        cache_ttl=60,  # 1 minute
        description="List issue events"
    ),
    
    # Tag management
    "list_issue_tags": ApiEndpoint(
        name="list_issue_tags",
        frontend_path="/api/v1/issues/{issue_id}/tags",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}/tags",
        sentry_path="/api/0/issues/{issue_id}/tags/",
        method=HttpMethod.GET,
        path_params=["organization_slug", "issue_id"],
        cache_ttl=300,  # 5 minutes
        description="List issue tags"
    ),
    
    "add_issue_tags": ApiEndpoint(
        name="add_issue_tags",
        frontend_path="/api/v1/issues/{issue_id}/tags",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}/tags",
        sentry_path="/api/0/issues/{issue_id}/tags/",
        method=HttpMethod.POST,
        path_params=["organization_slug", "issue_id"],
        description="Add tags to issue"
    ),
    
    # Assignment
    "assign_issue": ApiEndpoint(
        name="assign_issue",
        frontend_path="/api/v1/issues/{issue_id}/assign",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}/assign",
        sentry_path="/api/0/issues/{issue_id}/",
        method=HttpMethod.PUT,
        path_params=["organization_slug", "issue_id"],
        description="Assign issue to user"
    ),
    
    # Comments
    "list_issue_comments": ApiEndpoint(
        name="list_issue_comments",
        frontend_path="/api/v1/issues/{issue_id}/comments",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}/comments",
        sentry_path="/api/0/issues/{issue_id}/comments/",
        method=HttpMethod.GET,
        path_params=["organization_slug", "issue_id"],
        cache_ttl=60,  # 1 minute
        description="List issue comments"
    ),
    
    "add_issue_comment": ApiEndpoint(
        name="add_issue_comment",
        frontend_path="/api/v1/issues/{issue_id}/comments",
        backend_path="/organizations/{organization_slug}/issues/{issue_id}/comments",
        sentry_path="/api/0/issues/{issue_id}/comments/",
        method=HttpMethod.POST,
        path_params=["organization_slug", "issue_id"],
        description="Add comment to issue"
    ),
    
    # Alert rules
    "list_alert_rules": ApiEndpoint(
        name="list_alert_rules",
        frontend_path="/api/v1/alert-rules",
        backend_path="/organizations/{organization_slug}/alert-rules",
        sentry_path="/api/0/organizations/{organization_slug}/alert-rules/",
        method=HttpMethod.GET,
        path_params=["organization_slug"],
        cache_ttl=300,  # 5 minutes
        description="List alert rules"
    ),
    
    "create_alert_rule": ApiEndpoint(
        name="create_alert_rule",
        frontend_path="/api/v1/alert-rules",
        backend_path="/organizations/{organization_slug}/alert-rules",
        sentry_path="/api/0/organizations/{organization_slug}/alert-rules/",
        method=HttpMethod.POST,
        path_params=["organization_slug"],
        description="Create alert rule"
    ),
    
    # Discover API
    "discover_query": ApiEndpoint(
        name="discover_query",
        frontend_path="/api/v1/discover",
        backend_path="/organizations/{organization_slug}/discover",
        sentry_path="/api/0/organizations/{organization_slug}/events/",
        method=HttpMethod.GET,
        path_params=["organization_slug"],
        query_params=["field", "query", "statsPeriod", "start", "end", "project", "environment"],
        cache_ttl=60,  # 1 minute
        description="Query discover events"
    ),
}


class ApiPathManager:
    """Manager for API path resolution and configuration"""
    
    def __init__(self, mappings: Dict[str, ApiEndpoint] = None):
        self.mappings = mappings or API_MAPPINGS
    
    def get_endpoint(self, name: str) -> Optional[ApiEndpoint]:
        """Get endpoint configuration by name"""
        return self.mappings.get(name)
    
    def resolve_frontend_path(self, name: str, **params) -> str:
        """Resolve frontend path for an endpoint"""
        endpoint = self.get_endpoint(name)
        if not endpoint:
            raise ValueError(f"Unknown endpoint: {name}")
        return endpoint.resolve_frontend_path(**params)
    
    def resolve_backend_path(self, name: str, **params) -> str:
        """Resolve backend path for an endpoint"""
        endpoint = self.get_endpoint(name)
        if not endpoint:
            raise ValueError(f"Unknown endpoint: {name}")
        return endpoint.resolve_backend_path(**params)
    
    def resolve_sentry_path(self, name: str, **params) -> str:
        """Resolve Sentry API path for an endpoint"""
        endpoint = self.get_endpoint(name)
        if not endpoint:
            raise ValueError(f"Unknown endpoint: {name}")
        return endpoint.resolve_sentry_path(**params)
    
    def list_endpoints(self) -> list[str]:
        """List all available endpoint names"""
        return list(self.mappings.keys())
    
    def get_endpoints_by_method(self, method: HttpMethod) -> list[ApiEndpoint]:
        """Get all endpoints for a specific HTTP method"""
        return [
            endpoint for endpoint in self.mappings.values()
            if endpoint.method == method
        ]
    
    def get_cached_endpoints(self) -> list[ApiEndpoint]:
        """Get all endpoints that have caching enabled"""
        return [
            endpoint for endpoint in self.mappings.values()
            if endpoint.cache_ttl is not None
        ]


# Default instance
api_path_manager = ApiPathManager()
