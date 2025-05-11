from typing import Dict, Any, Optional
from dataclasses import dataclass
import os


@dataclass
class PathMapping:
    """Represents a mapping of paths between frontend, backend, and Sentry API."""
    frontend_path: str
    backend_path: str
    sentry_path: str
    method: str = "GET"
    description: str = ""


class ApiPathConfig:
    """Centralized API path configuration."""
    
    # Base URLs - can be overridden by environment variables
    SENTRY_API_BASE = os.getenv("SENTRY_API_BASE", "https://sentry.io/api/0")
    
    # Path mappings organized by feature area
    _PATHS: Dict[str, Dict[str, PathMapping]] = {
        "issues": {
            "list": PathMapping(
                frontend_path="/api/v1/issues",
                backend_path="/api/events",
                sentry_path="/projects/{organization_slug}/{project_slug}/issues/",
                method="GET",
                description="List project issues"
            ),
            "detail": PathMapping(
                frontend_path="/api/v1/issues/{id}",
                backend_path="/api/events/{id}",
                sentry_path="/issues/{id}/",
                method="GET",
                description="Get issue details"
            ),
            "bulk_mutate": PathMapping(
                frontend_path="/api/v1/issues/bulk",
                backend_path="/api/events/bulk",
                sentry_path="/projects/{organization_slug}/{project_slug}/issues/",
                method="PUT",
                description="Bulk mutate issues"
            ),
            "delete": PathMapping(
                frontend_path="/api/v1/issues/{id}",
                backend_path="/api/events/{id}",
                sentry_path="/issues/{id}/",
                method="DELETE",
                description="Delete an issue"
            ),
            "update": PathMapping(
                frontend_path="/api/v1/issues/{id}",
                backend_path="/api/events/{id}",
                sentry_path="/issues/{id}/",
                method="PUT",
                description="Update an issue"
            ),
            "tags": PathMapping(
                frontend_path="/api/v1/issues/{id}/tags/{key}",
                backend_path="/api/events/{id}/tags/{key}",
                sentry_path="/issues/{id}/tags/{key}/",
                method="GET",
                description="Get tag details for issue"
            ),
            "tag_values": PathMapping(
                frontend_path="/api/v1/issues/{id}/tags/{key}/values",
                backend_path="/api/events/{id}/tags/{key}/values",
                sentry_path="/issues/{id}/tags/{key}/values/",
                method="GET",
                description="Get tag values for issue"
            ),
            "comments": PathMapping(
                frontend_path="/api/v1/issues/{id}/comments",
                backend_path="/api/events/{id}/comments",
                sentry_path="/issues/{id}/comments/",
                method="GET",
                description="Get issue comments"
            ),
            "user_feedback": PathMapping(
                frontend_path="/api/v1/projects/{project}/feedback",
                backend_path="/api/projects/{organization_slug}/{project_slug}/feedback",
                sentry_path="/projects/{organization_slug}/{project_slug}/user-feedback/",
                method="GET",
                description="Get user feedback"
            ),
            "events": PathMapping(
                frontend_path="/api/v1/issues/{id}/events",
                backend_path="/api/events/{id}/events",
                sentry_path="/issues/{id}/events/",
                method="GET",
                description="Get issue events"
            ),
            "hashes": PathMapping(
                frontend_path="/api/v1/issues/{id}/hashes",
                backend_path="/api/events/{id}/hashes",
                sentry_path="/issues/{id}/hashes/",
                method="GET",
                description="Get issue hashes"
            ),
            "latest_event": PathMapping(
                frontend_path="/api/v1/issues/{id}/events/latest",
                backend_path="/api/events/{id}/events/latest",
                sentry_path="/issues/{id}/events/latest/",
                method="GET",
                description="Get latest event for issue"
            ),
            "oldest_event": PathMapping(
                frontend_path="/api/v1/issues/{id}/events/oldest",
                backend_path="/api/events/{id}/events/oldest",
                sentry_path="/issues/{id}/events/oldest/",
                method="GET",
                description="Get oldest event for issue"
            )
        },
        "projects": {
            "list": PathMapping(
                frontend_path="/api/v1/projects",
                backend_path="/api/projects",
                sentry_path="/organizations/{organization_slug}/projects/",
                method="GET",
                description="List organization projects"
            ),
            "detail": PathMapping(
                frontend_path="/api/v1/projects/{project}",
                backend_path="/api/projects/{organization_slug}/{project_slug}",
                sentry_path="/projects/{organization_slug}/{project_slug}/",
                method="GET",
                description="Get project details"
            ),
            "create": PathMapping(
                frontend_path="/api/v1/projects",
                backend_path="/api/projects",
                sentry_path="/teams/{organization_slug}/{team_slug}/projects/",
                method="POST",
                description="Create new project"
            ),
            "update": PathMapping(
                frontend_path="/api/v1/projects/{project}",
                backend_path="/api/projects/{organization_slug}/{project_slug}",
                sentry_path="/projects/{organization_slug}/{project_slug}/",
                method="PUT",
                description="Update project"
            ),
            "delete": PathMapping(
                frontend_path="/api/v1/projects/{project}",
                backend_path="/api/projects/{organization_slug}/{project_slug}",
                sentry_path="/projects/{organization_slug}/{project_slug}/",
                method="DELETE",
                description="Delete project"
            ),
            "keys": PathMapping(
                frontend_path="/api/v1/projects/{project}/keys",
                backend_path="/api/projects/{organization_slug}/{project_slug}/keys",
                sentry_path="/projects/{organization_slug}/{project_slug}/keys/",
                method="GET",
                description="List project client keys"
            ),
            "stats": PathMapping(
                frontend_path="/api/v1/projects/{project}/stats",
                backend_path="/api/projects/{organization_slug}/{project_slug}/stats",
                sentry_path="/projects/{organization_slug}/{project_slug}/stats/",
                method="GET",
                description="Get project stats"
            ),
            "events": PathMapping(
                frontend_path="/api/v1/projects/{project}/events",
                backend_path="/api/projects/{organization_slug}/{project_slug}/events",
                sentry_path="/projects/{organization_slug}/{project_slug}/events/",
                method="GET",
                description="List project events"
            ),
            "event_detail": PathMapping(
                frontend_path="/api/v1/projects/{project}/events/{event_id}",
                backend_path="/api/projects/{organization_slug}/{project_slug}/events/{event_id}",
                sentry_path="/projects/{organization_slug}/{project_slug}/events/{event_id}/",
                method="GET",
                description="Get event detail"
            ),
            "users": PathMapping(
                frontend_path="/api/v1/projects/{project}/users",
                backend_path="/api/projects/{organization_slug}/{project_slug}/users",
                sentry_path="/projects/{organization_slug}/{project_slug}/users/",
                method="GET",
                description="List project users"
            ),
            "tags": PathMapping(
                frontend_path="/api/v1/projects/{project}/tags/{key}/values",
                backend_path="/api/projects/{organization_slug}/{project_slug}/tags/{key}/values",
                sentry_path="/projects/{organization_slug}/{project_slug}/tags/{key}/values/",
                method="GET",
                description="Get project tag values"
            )
        },
        "organizations": {
            "list": PathMapping(
                frontend_path="/api/v1/organizations",
                backend_path="/api/organizations",
                sentry_path="/organizations/",
                method="GET",
                description="List organizations"
            ),
            "detail": PathMapping(
                frontend_path="/api/v1/organizations/{org}",
                backend_path="/api/organizations/{organization_slug}",
                sentry_path="/organizations/{organization_slug}/",
                method="GET",
                description="Get organization details"
            ),
            "members": PathMapping(
                frontend_path="/api/v1/organizations/{org}/members",
                backend_path="/api/organizations/{organization_slug}/members",
                sentry_path="/organizations/{organization_slug}/members/",
                method="GET",
                description="List organization members"
            ),
            "stats": PathMapping(
                frontend_path="/api/v1/organizations/{org}/stats",
                backend_path="/api/organizations/{organization_slug}/stats_v2",
                sentry_path="/organizations/{organization_slug}/stats_v2/",
                method="GET",
                description="Get organization stats"
            ),
            "discover": PathMapping(
                frontend_path="/api/v1/organizations/{org}/discover",
                backend_path="/api/organizations/{organization_slug}/events",
                sentry_path="/organizations/{organization_slug}/events/",
                method="GET",
                description="Query discover events"
            ),
            "releases": PathMapping(
                frontend_path="/api/v1/organizations/{org}/releases",
                backend_path="/api/organizations/{organization_slug}/releases",
                sentry_path="/organizations/{organization_slug}/releases/",
                method="GET",
                description="List organization releases"
            ),
            "release_detail": PathMapping(
                frontend_path="/api/v1/organizations/{org}/releases/{version}",
                backend_path="/api/organizations/{organization_slug}/releases/{version}",
                sentry_path="/organizations/{organization_slug}/releases/{version}/",
                method="GET",
                description="Get release details"
            ),
            "alerts": PathMapping(
                frontend_path="/api/v1/organizations/{org}/alerts",
                backend_path="/api/organizations/{organization_slug}/alert-rules",
                sentry_path="/organizations/{organization_slug}/alert-rules/",
                method="GET",
                description="List alert rules"
            )
        },
        "teams": {
            "list": PathMapping(
                frontend_path="/api/v1/organizations/{org}/teams",
                backend_path="/api/organizations/{organization_slug}/teams",
                sentry_path="/organizations/{organization_slug}/teams/",
                method="GET",
                description="List organization teams"
            ),
            "detail": PathMapping(
                frontend_path="/api/v1/teams/{team}",
                backend_path="/api/teams/{organization_slug}/{team_slug}",
                sentry_path="/teams/{organization_slug}/{team_slug}/",
                method="GET",
                description="Get team details"
            ),
            "create": PathMapping(
                frontend_path="/api/v1/organizations/{org}/teams",
                backend_path="/api/organizations/{organization_slug}/teams",
                sentry_path="/organizations/{organization_slug}/teams/",
                method="POST",
                description="Create new team"
            ),
            "update": PathMapping(
                frontend_path="/api/v1/teams/{team}",
                backend_path="/api/teams/{organization_slug}/{team_slug}",
                sentry_path="/teams/{organization_slug}/{team_slug}/",
                method="PUT",
                description="Update team"
            ),
            "delete": PathMapping(
                frontend_path="/api/v1/teams/{team}",
                backend_path="/api/teams/{organization_slug}/{team_slug}",
                sentry_path="/teams/{organization_slug}/{team_slug}/",
                method="DELETE",
                description="Delete team"
            ),
            "projects": PathMapping(
                frontend_path="/api/v1/teams/{team}/projects",
                backend_path="/api/teams/{organization_slug}/{team_slug}/projects",
                sentry_path="/teams/{organization_slug}/{team_slug}/projects/",
                method="GET",
                description="List team projects"
            )
        },
        "authentication": {
            "api_tokens": PathMapping(
                frontend_path="/api/v1/api-tokens",
                backend_path="/api/api-tokens",
                sentry_path="/api-tokens/",
                method="GET",
                description="List API tokens"
            )
        }
    }
    
    @classmethod
    def get_path(cls, category: str, operation: str) -> Optional[PathMapping]:
        """Get path mapping for a specific category and operation."""
        return cls._PATHS.get(category, {}).get(operation)
    
    @classmethod
    def get_all_paths(cls) -> Dict[str, Dict[str, PathMapping]]:
        """Get all path mappings."""
        return cls._PATHS.copy()
    
    @classmethod
    def get_category_paths(cls, category: str) -> Dict[str, PathMapping]:
        """Get all path mappings for a specific category."""
        return cls._PATHS.get(category, {}).copy()
    
    @classmethod
    def resolve_path(cls, template: str, **kwargs) -> str:
        """
        Resolve a path template with provided parameters.
        
        Args:
            template: Path template with {placeholder} syntax
            **kwargs: Values to substitute into the template
            
        Returns:
            Resolved path string
        """
        # Handle special cases for path resolution
        resolved = template
        
        # Replace organization_slug if org is provided
        if 'org' in kwargs and 'organization_slug' not in kwargs:
            kwargs['organization_slug'] = kwargs['org']
        
        # Replace project_slug if project is provided
        if 'project' in kwargs and 'project_slug' not in kwargs:
            kwargs['project_slug'] = kwargs['project']
            
        # Replace team_slug if team is provided
        if 'team' in kwargs and 'team_slug' not in kwargs:
            kwargs['team_slug'] = kwargs['team']
        
        # Perform substitution
        for key, value in kwargs.items():
            placeholder = f"{{{key}}}"
            if placeholder in resolved:
                resolved = resolved.replace(placeholder, str(value))
        
        return resolved
    
    @classmethod
    def get_sentry_url(cls, path: str) -> str:
        """Get full Sentry API URL."""
        # Remove leading slash if present
        if path.startswith('/'):
            path = path[1:]
        return f"{cls.SENTRY_API_BASE}/{path}"
