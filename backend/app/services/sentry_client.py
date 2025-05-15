import httpx
import logging
import asyncio
from typing import Dict, List, Optional, Any, Union
from ..utils.path_resolver import get_full_url
from ..config.settings import settings
from ..models.sentry import SentryIssue, SentryEvent

logger = logging.getLogger(__name__)

# Global client instance
_sentry_client = None

def get_sentry_client() -> "SentryApiClient":
    """Get the global SentryApiClient instance.
    
    Returns:
        Global SentryApiClient instance
    """
    global _sentry_client
    if _sentry_client is None:
        _sentry_client = SentryApiClient(token=settings.sentry_token)
    return _sentry_client


class SentryApiClient:
    """Sentry API client using the unified API configuration system.
    
    This client interacts with the Sentry API using the paths defined in
    the unified API configuration system.
    """
    
    def __init__(self, token: Optional[str] = None, timeout: int = 30):
        """Initialize the Sentry API client.
        
        Args:
            token: Sentry API token. If None, uses the token from settings.
            timeout: Request timeout in seconds.
        """
        self.token = token or settings.sentry_token
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
        
        # Common parameters
        self.common_params = {
            "sentry_base_url": settings.sentry_base_url
        }
    
    async def _request(
        self, 
        method: str, 
        url: str, 
        params: Optional[Dict[str, Any]] = None, 
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make a request to the Sentry API.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            url: Full URL for the request
            params: Query parameters
            data: Request body for POST/PUT
            headers: Additional headers
            
        Returns:
            Response data as a dictionary
            
        Raises:
            httpx.HTTPStatusError: If the request fails
        """
        # Prepare headers
        request_headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        
        if headers:
            request_headers.update(headers)
        
        try:
            response = await self.client.request(
                method=method,
                url=url,
                params=params,
                json=data,
                headers=request_headers
            )
            
            # Raise for 4xx/5xx status codes
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error {e.response.status_code} for {url}: {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Request error for {url}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error for {url}: {str(e)}")
            raise
    
    # Issue-related methods
    
    async def get_issues(
        self, 
        org_slug: str, 
        project_slug: str, 
        **params
    ) -> List[SentryIssue]:
        """Get issues for a project.
        
        Args:
            org_slug: Organization slug
            project_slug: Project slug
            **params: Additional query parameters
            
        Returns:
            List of issue objects
        """
        url = get_full_url(
            "issues", "list", 
            organization_slug=org_slug,
            project_slug=project_slug,
            **self.common_params
        )
        
        response = await self._request("GET", url, params=params)
        return [SentryIssue(**issue) for issue in response]
    
    async def get_issue(self, issue_id: str) -> SentryIssue:
        """Get details for a specific issue.
        
        Args:
            issue_id: Issue ID
            
        Returns:
            Issue object
        """
        url = get_full_url(
            "issues", "detail", 
            issue_id=issue_id,
            **self.common_params
        )
        
        response = await self._request("GET", url)
        return SentryIssue(**response)
    
    async def update_issue(
        self, 
        issue_id: str, 
        status: Optional[str] = None,
        assignedTo: Optional[str] = None,
        hasSeen: Optional[bool] = None,
        isBookmarked: Optional[bool] = None,
        **kwargs
    ) -> SentryIssue:
        """Update an issue.
        
        Args:
            issue_id: Issue ID
            status: New status (resolved, unresolved, ignored)
            assignedTo: User ID to assign the issue to
            hasSeen: Whether the user has seen the issue
            isBookmarked: Whether the issue is bookmarked
            **kwargs: Additional update parameters
            
        Returns:
            Updated issue object
        """
        url = get_full_url(
            "issues", "update", 
            issue_id=issue_id,
            **self.common_params
        )
        
        data = {}
        if status is not None:
            data["status"] = status
        if assignedTo is not None:
            data["assignedTo"] = assignedTo
        if hasSeen is not None:
            data["hasSeen"] = hasSeen
        if isBookmarked is not None:
            data["isBookmarked"] = isBookmarked
        
        # Add any additional parameters
        data.update(kwargs)
        
        response = await self._request("PUT", url, data=data)
        return SentryIssue(**response)
    
    async def bulk_update_issues(
        self, 
        issue_ids: List[str], 
        org_slug: str,
        **update_params
    ) -> Dict[str, Any]:
        """Bulk update multiple issues.
        
        Args:
            issue_ids: List of issue IDs to update
            org_slug: Organization slug
            **update_params: Update parameters (status, etc.)
            
        Returns:
            API response
        """
        url = get_full_url(
            "organization_issues", "bulk", 
            organization_slug=org_slug,
            **self.common_params
        )
        
        data = {
            "ids": issue_ids,
            **update_params
        }
        
        return await self._request("PUT", url, data=data)
    
    # Event-related methods
    
    async def get_issue_events(
        self, 
        issue_id: str, 
        **params
    ) -> List[Dict[str, Any]]:
        """Get events for a specific issue.
        
        Args:
            issue_id: Issue ID
            **params: Additional query parameters
            
        Returns:
            List of event objects
        """
        url = get_full_url(
            "issue_events", "list", 
            issue_id=issue_id,
            **self.common_params
        )
        
        return await self._request("GET", url, params=params)
    
    async def get_event(
        self, 
        org_slug: str, 
        project_slug: str, 
        event_id: str
    ) -> SentryEvent:
        """Get details for a specific event.
        
        Args:
            org_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID
            
        Returns:
            Event object
        """
        url = get_full_url(
            "events", "detail", 
            organization_slug=org_slug,
            project_slug=project_slug,
            event_id=event_id,
            **self.common_params
        )
        
        response = await self._request("GET", url)
        return SentryEvent(**response)
    
    async def get_latest_event(self, issue_id: str) -> SentryEvent:
        """Get the latest event for an issue.
        
        Args:
            issue_id: Issue ID
            
        Returns:
            Event object
        """
        url = get_full_url(
            "issue_events", "latest", 
            issue_id=issue_id,
            **self.common_params
        )
        
        response = await self._request("GET", url)
        return SentryEvent(**response)
    
    # Methods used in routers
    
    async def list_project_issues(
        self, 
        organization_slug: str, 
        project_slug: str, 
        query: Optional[str] = None,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get issues for a project with pagination.
        
        This method aligns with the router implementation and returns the raw response
        with pagination information.
        
        Args:
            organization_slug: Organization slug
            project_slug: Project slug
            query: Search query string
            cursor: Pagination cursor
            
        Returns:
            Dictionary with issues and pagination information
        """
        params = {}
        if query:
            params["query"] = query
        if cursor:
            params["cursor"] = cursor
            
        url = get_full_url(
            "issues", "list", 
            organization_slug=organization_slug,
            project_slug=project_slug,
            **self.common_params
        )
        
        return await self._request("GET", url, params=params)
    
    async def get_issue_details(
        self, 
        organization_slug: str, 
        issue_id: str
    ) -> Dict[str, Any]:
        """Get details for a specific issue.
        
        This method aligns with the router implementation.
        
        Args:
            organization_slug: Organization slug (unused in API call but maintained for interface consistency)
            issue_id: Issue ID
            
        Returns:
            Issue details as a dictionary
        """
        url = get_full_url(
            "issues", "detail", 
            issue_id=issue_id,
            **self.common_params
        )
        
        return await self._request("GET", url)
    
    async def update_issue_status(
        self, 
        issue_id: str, 
        status: str
    ) -> Dict[str, Any]:
        """Update the status of an issue.
        
        This method aligns with the router implementation.
        
        Args:
            issue_id: Issue ID
            status: New status (resolved, unresolved, ignored)
            
        Returns:
            Updated issue details
        """
        url = get_full_url(
            "issues", "update", 
            issue_id=issue_id,
            **self.common_params
        )
        
        data = {"status": status}
        
        return await self._request("PUT", url, data=data)
    
    async def assign_issue(
        self, 
        issue_id: str, 
        assignee: Optional[str] = None
    ) -> Dict[str, Any]:
        """Assign an issue to a user.
        
        This method aligns with the router implementation.
        
        Args:
            issue_id: Issue ID
            assignee: User ID to assign the issue to, or None to unassign
            
        Returns:
            Updated issue details
        """
        url = get_full_url(
            "issues", "update", 
            issue_id=issue_id,
            **self.common_params
        )
        
        data = {"assignedTo": assignee}
        
        return await self._request("PUT", url, data=data)
    
    async def add_issue_tags(
        self, 
        issue_id: str, 
        tags: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Add tags to an issue.
        
        This method aligns with the bulk operations in the router.
        
        Args:
            issue_id: Issue ID
            tags: List of tag objects with key and value
            
        Returns:
            Updated issue details
        """
        url = get_full_url(
            "issues", "update", 
            issue_id=issue_id,
            **self.common_params
        )
        
        data = {"tags": tags}
        
        return await self._request("PUT", url, data=data)
        
    # Event router methods
    
    async def get_event_details(
        self, 
        organization_slug: str, 
        project_slug: str, 
        event_id: str
    ) -> Dict[str, Any]:
        """Get details for a specific event.
        
        This method aligns with the events router implementation.
        
        Args:
            organization_slug: Organization slug
            project_slug: Project slug
            event_id: Event ID
            
        Returns:
            Event details as a dictionary
        """
        url = get_full_url(
            "events", "detail", 
            organization_slug=organization_slug,
            project_slug=project_slug,
            event_id=event_id,
            **self.common_params
        )
        
        return await self._request("GET", url)
    
    async def list_issue_events(
        self, 
        organization_slug: str, 
        issue_id: str, 
        cursor: Optional[str] = None,
        environment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get events for a specific issue with pagination.
        
        This method aligns with the events router implementation.
        
        Args:
            organization_slug: Organization slug (unused in API call but maintained for interface consistency)
            issue_id: Issue ID
            cursor: Pagination cursor
            environment: Filter by environment
            
        Returns:
            Dictionary with events and pagination information
        """
        params = {}
        if cursor:
            params["cursor"] = cursor
        if environment:
            params["environment"] = environment
            
        url = get_full_url(
            "issue_events", "list", 
            issue_id=issue_id,
            **self.common_params
        )
        
        return await self._request("GET", url, params=params)
    
    async def get_issue_event(
        self, 
        organization_slug: str, 
        issue_id: str, 
        event_id: str,
        environment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get a specific event for an issue.
        
        This method aligns with the events router implementation.
        The event_id can be a specific ID or one of: 'latest', 'oldest', or 'recommended'.
        
        Args:
            organization_slug: Organization slug (unused in API call but maintained for interface consistency)
            issue_id: Issue ID
            event_id: Event ID or 'latest', 'oldest', 'recommended'
            environment: Filter by environment
            
        Returns:
            Event details as a dictionary
        """
        params = {}
        if environment:
            params["environment"] = environment
            
        # Handle special event_id values
        if event_id in ["latest", "oldest", "recommended"]:
            url = get_full_url(
                "issue_events", event_id, 
                issue_id=issue_id,
                **self.common_params
            )
        else:
            # This is a regular event ID, construct the URL differently
            # May need to adjust based on actual API structure
            url = get_full_url(
                "issue_events", "detail", 
                issue_id=issue_id,
                event_id=event_id,
                **self.common_params
            )
        
        return await self._request("GET", url, params=params)
    
    # Alert rule methods
    
    async def list_issue_alert_rules(
        self,
        org_slug: str,
        project_slug: str
    ) -> Dict[str, Any]:
        """List issue alert rules for a project.
        
        Args:
            org_slug: Organization slug
            project_slug: Project slug
            
        Returns:
            Dictionary with issue alert rules
        """
        url = get_full_url(
            "issue_alert_rules", "list",
            organization_slug=org_slug,
            project_slug=project_slug,
            **self.common_params
        )
        
        return await self._request("GET", url)
    
    async def get_issue_alert_rule(
        self,
        org_slug: str,
        project_slug: str,
        rule_id: str
    ) -> Dict[str, Any]:
        """Get issue alert rule details.
        
        Args:
            org_slug: Organization slug
            project_slug: Project slug
            rule_id: Alert rule ID
            
        Returns:
            Issue alert rule details
        """
        url = get_full_url(
            "issue_alert_rules", "detail",
            organization_slug=org_slug,
            project_slug=project_slug,
            rule_id=rule_id,
            **self.common_params
        )
        
        return await self._request("GET", url)
    
    async def create_issue_alert_rule(
        self,
        org_slug: str,
        project_slug: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new issue alert rule.
        
        Args:
            org_slug: Organization slug
            project_slug: Project slug
            rule_data: Alert rule data
            
        Returns:
            Created issue alert rule
        """
        url = get_full_url(
            "issue_alert_rules", "create",
            organization_slug=org_slug,
            project_slug=project_slug,
            **self.common_params
        )
        
        return await self._request("POST", url, data=rule_data)
    
    async def update_issue_alert_rule(
        self,
        org_slug: str,
        project_slug: str,
        rule_id: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an issue alert rule.
        
        Args:
            org_slug: Organization slug
            project_slug: Project slug
            rule_id: Alert rule ID
            rule_data: Alert rule data
            
        Returns:
            Updated issue alert rule
        """
        url = get_full_url(
            "issue_alert_rules", "update",
            organization_slug=org_slug,
            project_slug=project_slug,
            rule_id=rule_id,
            **self.common_params
        )
        
        return await self._request("PUT", url, data=rule_data)
    
    async def delete_issue_alert_rule(
        self,
        org_slug: str,
        project_slug: str,
        rule_id: str
    ) -> Dict[str, Any]:
        """Delete an issue alert rule.
        
        Args:
            org_slug: Organization slug
            project_slug: Project slug
            rule_id: Alert rule ID
            
        Returns:
            Response data
        """
        url = get_full_url(
            "issue_alert_rules", "delete",
            organization_slug=org_slug,
            project_slug=project_slug,
            rule_id=rule_id,
            **self.common_params
        )
        
        return await self._request("DELETE", url)
    
    async def list_metric_alert_rules(
        self,
        org_slug: str
    ) -> Dict[str, Any]:
        """List metric alert rules for an organization.
        
        Args:
            org_slug: Organization slug
            
        Returns:
            Dictionary with metric alert rules
        """
        url = get_full_url(
            "metric_alert_rules", "list",
            organization_slug=org_slug,
            **self.common_params
        )
        
        return await self._request("GET", url)
    
    async def get_metric_alert_rule(
        self,
        org_slug: str,
        rule_id: str
    ) -> Dict[str, Any]:
        """Get metric alert rule details.
        
        Args:
            org_slug: Organization slug
            rule_id: Alert rule ID
            
        Returns:
            Metric alert rule details
        """
        url = get_full_url(
            "metric_alert_rules", "detail",
            organization_slug=org_slug,
            rule_id=rule_id,
            **self.common_params
        )
        
        return await self._request("GET", url)
    
    async def create_metric_alert_rule(
        self,
        org_slug: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new metric alert rule.
        
        Args:
            org_slug: Organization slug
            rule_data: Alert rule data
            
        Returns:
            Created metric alert rule
        """
        url = get_full_url(
            "metric_alert_rules", "create",
            organization_slug=org_slug,
            **self.common_params
        )
        
        return await self._request("POST", url, data=rule_data)
    
    async def update_metric_alert_rule(
        self,
        org_slug: str,
        rule_id: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a metric alert rule.
        
        Args:
            org_slug: Organization slug
            rule_id: Alert rule ID
            rule_data: Alert rule data
            
        Returns:
            Updated metric alert rule
        """
        url = get_full_url(
            "metric_alert_rules", "update",
            organization_slug=org_slug,
            rule_id=rule_id,
            **self.common_params
        )
        
        return await self._request("PUT", url, data=rule_data)
    
    async def delete_metric_alert_rule(
        self,
        org_slug: str,
        rule_id: str
    ) -> Dict[str, Any]:
        """Delete a metric alert rule.
        
        Args:
            org_slug: Organization slug
            rule_id: Alert rule ID
            
        Returns:
            Response data
        """
        url = get_full_url(
            "metric_alert_rules", "delete",
            organization_slug=org_slug,
            rule_id=rule_id,
            **self.common_params
        )
        
        return await self._request("DELETE", url)
        
    # Analyzer methods
    
    async def get_event_by_id(
        self,
        event_id: str
    ) -> Dict[str, Any]:
        """Get event by ID (across all projects).
        
        This method is used by the analyzers router to get event details.
        
        Args:
            event_id: Event ID
            
        Returns:
            Event details as a dictionary
        """
        url = get_full_url(
            "event_analysis", "get_event_by_id",
            event_id=event_id,
            **self.common_params
        )
        
        return await self._request("GET", url)
        
    # Discover methods
    
    async def discover_query(
        self,
        org_slug: str,
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a Discover query.
        
        Args:
            org_slug: Organization slug
            query_params: Query parameters
            
        Returns:
            Query results
        """
        url = get_full_url(
            "discover", "query",
            organization_slug=org_slug,
            **self.common_params
        )
        
        return await self._request("GET", url, params=query_params)
    
    async def get_discover_saved_queries(
        self,
        org_slug: str
    ) -> List[Dict[str, Any]]:
        """Get saved Discover queries.
        
        Args:
            org_slug: Organization slug
            
        Returns:
            List of saved queries
        """
        url = get_full_url(
            "discover", "saved_queries",
            organization_slug=org_slug,
            **self.common_params
        )
        
        response = await self._request("GET", url)
        return response.get("data", [])
    
    async def create_discover_saved_query(
        self,
        org_slug: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a saved Discover query.
        
        Args:
            org_slug: Organization slug
            query_data: Query definition
            
        Returns:
            Created query object
        """
        url = get_full_url(
            "discover", "create_saved_query",
            organization_slug=org_slug,
            **self.common_params
        )
        
        return await self._request("POST", url, data=query_data)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
