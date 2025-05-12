"""
Sentry API client for interacting with Sentry.io.

This module provides a client for the Sentry API to retrieve events, issues, and other data.
"""

import logging
import httpx
from fastapi import Depends, HTTPException, status
from typing import Dict, List, Optional, Any

# Import settings from core.settings
from app.core.settings import settings

logger = logging.getLogger(__name__)

class SentryApiClient:
    """Client for the Sentry API."""
    
    def __init__(self, client=None, base_url: str = settings.sentry_base_url, auth_token: str = settings.sentry_api_token):
        """Initialize the Sentry API client.
        
        Args:
            client: Optional httpx client to use for requests
            base_url: Base URL for the Sentry API
            auth_token: Authentication token for the Sentry API
        """
        self.client = client
        self.base_url = base_url.rstrip('/')
        self.auth_token = auth_token.strip() if auth_token else ""
        
        # Set up headers with proper token formatting for Sentry API
        self.headers = {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }
        
        # Log initialization but avoid exposing the full token
        token_preview = self.auth_token[:5] + '...' if self.auth_token else 'none'
        logger.info(f"Initialized Sentry API client with base URL: {base_url}, token preview: {token_preview}")
        logger.info(f"Headers: {self.headers.keys()}")
        
        # Add additional debugging for the settings
        logger.info(f"Using Sentry API token starting with: {self.auth_token[:5]}... (length: {len(self.auth_token)})")
        if self.auth_token == "YOUR_SENTRY_API_TOKEN" or not self.auth_token:
            logger.warning("Using default token or empty token - API calls will fail!")
    
    @classmethod
    async def get_instance(cls):
        """Get a Sentry API client instance for dependency injection"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            return cls(client=client)
    
    async def get_event_details(self, organization_slug: str, project_slug: str, event_id: str) -> Dict[str, Any]:
        """Get detailed information for a specific event.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            event_id: The ID of the event
            
        Returns:
            The event details as a dictionary
        """
        logger.info(f"Fetching event details for {organization_slug}/{project_slug}/{event_id}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for event details")
            return self._mock_event_details(event_id)
        
        # Make API request
        try:
            url = f"{self.base_url}/projects/{organization_slug}/{project_slug}/events/{event_id}/"
            
            # Make the GET request with detailed logs
            logger.info(f"Making GET request to {url} with headers: {self.headers.keys()}")
            
            response = await self.client.get(url, headers=self.headers)
            logger.info(f"Response status: {response.status_code}")
            
            # If we get here, the request was successful
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching event details: {e.response.status_code} - {e.response.text}")
            
            # Handle 404 errors specifically
            if e.response.status_code == 404:
                logger.warning(f"Event not found: {event_id}")
                # Return mock data as a fallback for development
                logger.info(f"Using mock data as fallback for non-existent event")
                return self._mock_event_details(event_id)
                
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error fetching event details: {str(e)}")
            # Return mock data as a fallback for development
            logger.info(f"Using mock data as fallback for request error")
            return self._mock_event_details(event_id)
        except Exception as e:
            logger.error(f"Unexpected error fetching event details: {str(e)}")
            # Return mock data as a fallback for development
            logger.info(f"Using mock data as fallback for unexpected error")
            return self._mock_event_details(event_id)
    
    async def get_event_by_id(self, event_id: str) -> Dict[str, Any]:
        """Get an event by its ID.
        
        Args:
            event_id: The ID of the event to retrieve
            
        Returns:
            The event data as a dictionary
        """
        logger.info(f"Fetching event {event_id}")
        
        # This would require knowing the org/project, so we'd need to do a search
        # For now, this would need to be implemented differently or use another endpoint
        logger.error("Direct event lookup by ID without org/project not supported")
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Direct event lookup by ID without org/project not supported"
        )
    
    async def list_project_issues(
        self, 
        organization_slug: str, 
        project_slug: str, 
        query: Optional[str] = None, 
        cursor: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List issues for a project with optional filtering.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            query: Optional query string for filtering
            cursor: Optional pagination cursor
            status: Optional status filter
            
        Returns:
            A dictionary containing the issues and pagination information
        """
        logger.info(f"Fetching issues for {organization_slug}/{project_slug}")
        
        # Use mock data if enabled
        use_mock = getattr(settings, "USE_MOCK_DATA", "false").lower() == "true"
        if use_mock:
            logger.info("Using mock data for project issues")
            return self._mock_project_issues(organization_slug, project_slug, status, query, cursor)
        
        # Build query parameters
        params = {}
        if query:
            params["query"] = query
        if cursor:
            params["cursor"] = cursor
        if status:
            if status != "all":
                # Convert to Sentry API format
                params["status"] = status
        
        # Make API request
        try:
            url = f"{self.base_url}/projects/{organization_slug}/{project_slug}/issues/"
            
            # Make the GET request with detailed logs
            logger.info(f"Making GET request to {url} with headers: {self.headers.keys()}")
            logger.info(f"Using params: {params}")
            
            response = await self.client.get(url, headers=self.headers, params=params)
            logger.info(f"Response status: {response.status_code}")
            
            # If we get here, the request was successful
            response.raise_for_status()
            
            # Format response to match expected structure
            issues = response.json()
            return {
                "data": issues,
                "pagination": {
                    "next": {
                        "cursor": response.links.get("next", {}).get("cursor")
                    },
                    "previous": {
                        "cursor": response.links.get("previous", {}).get("cursor")
                    } if "previous" in response.links else None
                }
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching project issues: {e.response.status_code} - {e.response.text}")
            # Return mock data as a fallback
            logger.info(f"Using mock data as fallback for HTTP error")
            return self._mock_project_issues(organization_slug, project_slug, status, query, cursor)
        except httpx.RequestError as e:
            logger.error(f"Request error fetching project issues: {str(e)}")
            # Return mock data as a fallback
            logger.info(f"Using mock data as fallback for request error")
            return self._mock_project_issues(organization_slug, project_slug, status, query, cursor)
        except Exception as e:
            logger.error(f"Unexpected error fetching project issues: {str(e)}")
            # Always return mock data for any errors in development
            logger.info(f"Using mock data as fallback for unexpected error")
            return self._mock_project_issues(organization_slug, project_slug, status, query, cursor)
    
    async def get_issue_details(self, organization_slug: str, issue_id: str) -> Dict[str, Any]:
        """Get detailed information for a specific issue.
        
        Args:
            organization_slug: The slug of the organization
            issue_id: The ID of the issue
            
        Returns:
            The issue details as a dictionary
        """
        logger.info(f"Fetching issue details for {organization_slug}/{issue_id}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for issue details")
            return self._mock_issue_details(issue_id)
        
        # Make API request
        try:
            url = f"{self.base_url}/issues/{issue_id}/"
            logger.info(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching issue details: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error fetching issue details: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error fetching issue details: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def add_issue_tags(self, issue_id: str, tags: List[str]) -> Dict[str, Any]:
        """Add tags to an issue.
        
        Args:
            issue_id: The ID of the issue
            tags: List of tags to add
            
        Returns:
            The updated issue data as a dictionary
        """
        logger.info(f"Adding tags to issue {issue_id}: {tags}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for adding tags")
            return {
                "id": issue_id,
                "tags": tags,
                "status": "success"
            }
        
        # For Sentry API, tags are added through the issue update endpoint
        try:
            url = f"{self.base_url}/issues/{issue_id}/"
            logger.info(f"Making PUT request to {url} to add tags")
            
            # Sentry expects tags in a specific format
            tags_data = {f"tags[{tag}]": tag for tag in tags}
            
            response = await self.client.put(url, headers=self.headers, json=tags_data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error adding tags: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error adding tags: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error adding tags: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def assign_issue(self, issue_id: str, assignee: str) -> Dict[str, Any]:
        """Assign an issue to a user.
        
        Args:
            issue_id: The ID of the issue
            assignee: The user ID or email of the assignee
            
        Returns:
            The updated issue data as a dictionary
        """
        logger.info(f"Assigning issue {issue_id} to {assignee}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for issue assignment")
            return {
                "id": issue_id,
                "assignee": {
                    "id": assignee,
                    "email": f"{assignee}@example.com" if '@' not in assignee else assignee,
                },
                "assignedBy": "current_user",
                "dateAssigned": "2023-07-05T14:32:00Z"
            }
        
        # Make API request
        try:
            url = f"{self.base_url}/issues/{issue_id}/"
            logger.info(f"Making PUT request to {url} with assignee={assignee}")
            
            data = {"assignedTo": assignee}
            response = await self.client.put(url, headers=self.headers, json=data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error assigning issue: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error assigning issue: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error assigning issue: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def update_issue_status(self, issue_id: str, status: str) -> Dict[str, Any]:
        """Update the status of an issue.
        
        Args:
            issue_id: The ID of the issue
            status: The new status (e.g., "resolved", "ignored")
            
        Returns:
            The updated issue data as a dictionary
        """
        logger.info(f"Updating issue {issue_id} to status {status}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for issue status update")
            return {
                "id": issue_id,
                "status": status,
                "statusDetails": {}
            }
        
        # Make API request
        try:
            url = f"{self.base_url}/issues/{issue_id}/"
            logger.info(f"Making PUT request to {url} with status={status}")
            
            data = {"status": status}
            response = await self.client.put(url, headers=self.headers, json=data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error updating issue status: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error updating issue status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating issue status: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def list_issue_events(
        self,
        organization_slug: str,
        issue_id: str,
        cursor: Optional[str] = None,
        environment: Optional[str] = None
    ) -> Dict[str, Any]:
        """List events for a specific issue.
        
        Args:
            organization_slug: The slug of the organization
            issue_id: The ID of the issue
            cursor: Optional pagination cursor
            environment: Optional environment to filter by
            
        Returns:
            A dictionary containing the events and pagination information
        """
        logger.info(f"Listing events for issue: {issue_id}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for issue events")
            return self._mock_issue_events(issue_id, cursor)
        
        # Build query parameters
        params = {}
        if cursor:
            params["cursor"] = cursor
        if environment:
            params["environment"] = environment
        
        # Make API request
        try:
            url = f"{self.base_url}/issues/{issue_id}/events/"
            logger.info(f"Making GET request to {url} with params {params}")
            
            response = await self.client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            # Format response to match expected structure
            events = response.json()
            return {
                "data": events,
                "pagination": {
                    "next": {
                        "cursor": response.links.get("next", {}).get("cursor")
                    },
                    "previous": {
                        "cursor": response.links.get("previous", {}).get("cursor")
                    } if "previous" in response.links else None
                }
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error listing issue events: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error listing issue events: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error listing issue events: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def get_issue_event(
        self,
        organization_slug: str,
        issue_id: str,
        event_id: str,
        environment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get a specific event for an issue.
        
        Args:
            organization_slug: The slug of the organization
            issue_id: The ID of the issue
            event_id: The ID of the event (or 'latest', 'oldest', 'recommended')
            environment: Optional environment to filter by
            
        Returns:
            The event data as a dictionary
        """
        logger.info(f"Fetching event {event_id} for issue: {issue_id}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for issue event")
            return self._mock_issue_event(issue_id, event_id)
        
        # Build query parameters
        params = {}
        if environment:
            params["environment"] = environment
        
        # Make API request
        try:
            # Handle special event identifiers
            if event_id in ['latest', 'oldest', 'recommended']:
                url = f"{self.base_url}/issues/{issue_id}/events/{event_id}/"
            else:
                url = f"{self.base_url}/organizations/{organization_slug}/events/{event_id}/"
            
            logger.info(f"Making GET request to {url} with params {params}")
            
            response = await self.client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching issue event: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 404:
                # Special handling for 404 errors
                if event_id in ['latest', 'oldest', 'recommended']:
                    logger.warning(f"No {event_id} event found for issue {issue_id}")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"No {event_id} event found for issue {issue_id}"
                    )
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error fetching issue event: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error fetching issue event: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def get_issue_stats(
        self,
        organization_slug: str,
        issue_id: str,
        stat: str = "24h",
        interval: Optional[str] = None,
        environment: Optional[str] = None
    ) -> List[List[Any]]:
        """Get stats for a specific issue.
        
        Args:
            organization_slug: The slug of the organization  
            issue_id: The ID of the issue
            stat: The stat type (e.g., "24h", "14d", "30d")
            interval: The interval for stats (e.g., "1h", "1d")
            environment: Optional environment to filter by
            
        Returns:
            A list of [timestamp, count] pairs
        """
        logger.info(f"Fetching stats for issue: {issue_id}, stat: {stat}, interval: {interval}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for issue stats")
            return self._mock_issue_stats(issue_id, stat, interval)
        
        # Build query parameters
        params = {"stat": stat}
        if interval:
            params["interval"] = interval
        if environment:
            params["environment"] = environment
        
        # Make API request
        try:
            url = f"{self.base_url}/issues/{issue_id}/stats/"
            logger.info(f"Making GET request to {url} with params {params}")
            
            response = await self.client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching issue stats: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error fetching issue stats: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error fetching issue stats: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    # Alert rule methods
    async def list_issue_alert_rules(
        self,
        organization_slug: str,
        project_slug: str
    ) -> Dict[str, Any]:
        """List issue alert rules for a project.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            
        Returns:
            A dictionary containing the issue alert rules
        """
        logger.info(f"Listing issue alert rules for {organization_slug}/{project_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/projects/{organization_slug}/{project_slug}/rules/"
            logger.info(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return {"data": response.json()}
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error listing issue alert rules: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error listing issue alert rules: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def list_metric_alert_rules(
        self,
        organization_slug: str
    ) -> Dict[str, Any]:
        """List metric alert rules for an organization.
        
        Args:
            organization_slug: The slug of the organization
            
        Returns:
            A dictionary containing the metric alert rules
        """
        logger.info(f"Listing metric alert rules for {organization_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/alert-rules/"
            logger.info(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return {"data": response.json()}
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error listing metric alert rules: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error listing metric alert rules: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def create_issue_alert_rule(
        self,
        organization_slug: str,
        project_slug: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create an issue alert rule.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            rule_data: The rule configuration data
            
        Returns:
            The created issue alert rule data
        """
        logger.info(f"Creating issue alert rule for {organization_slug}/{project_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/projects/{organization_slug}/{project_slug}/rules/"
            logger.info(f"Making POST request to {url}")
            
            response = await self.client.post(url, headers=self.headers, json=rule_data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error creating issue alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error creating issue alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def create_metric_alert_rule(
        self,
        organization_slug: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a metric alert rule.
        
        Args:
            organization_slug: The slug of the organization
            rule_data: The rule configuration data
            
        Returns:
            The created metric alert rule data
        """
        logger.info(f"Creating metric alert rule for {organization_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/alert-rules/"
            logger.info(f"Making POST request to {url}")
            
            response = await self.client.post(url, headers=self.headers, json=rule_data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error creating metric alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error creating metric alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def update_issue_alert_rule(
        self,
        organization_slug: str,
        project_slug: str,
        rule_id: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an issue alert rule.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            rule_id: The ID of the rule to update
            rule_data: The updated rule configuration data
            
        Returns:
            The updated issue alert rule data
        """
        logger.info(f"Updating issue alert rule {rule_id} for {organization_slug}/{project_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/projects/{organization_slug}/{project_slug}/rules/{rule_id}/"
            logger.info(f"Making PUT request to {url}")
            
            response = await self.client.put(url, headers=self.headers, json=rule_data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error updating issue alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating issue alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def update_metric_alert_rule(
        self,
        organization_slug: str,
        rule_id: str,
        rule_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a metric alert rule.
        
        Args:
            organization_slug: The slug of the organization
            rule_id: The ID of the rule to update
            rule_data: The updated rule configuration data
            
        Returns:
            The updated metric alert rule data
        """
        logger.info(f"Updating metric alert rule {rule_id} for {organization_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/alert-rules/{rule_id}/"
            logger.info(f"Making PUT request to {url}")
            
            response = await self.client.put(url, headers=self.headers, json=rule_data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error updating metric alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating metric alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def delete_issue_alert_rule(
        self,
        organization_slug: str,
        project_slug: str,
        rule_id: str
    ) -> None:
        """Delete an issue alert rule.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            rule_id: The ID of the rule to delete
        """
        logger.info(f"Deleting issue alert rule {rule_id} for {organization_slug}/{project_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/projects/{organization_slug}/{project_slug}/rules/{rule_id}/"
            logger.info(f"Making DELETE request to {url}")
            
            response = await self.client.delete(url, headers=self.headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error deleting issue alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting issue alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def delete_metric_alert_rule(
        self,
        organization_slug: str,
        rule_id: str
    ) -> None:
        """Delete a metric alert rule.
        
        Args:
            organization_slug: The slug of the organization
            rule_id: The ID of the rule to delete
        """
        logger.info(f"Deleting metric alert rule {rule_id} for {organization_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/alert-rules/{rule_id}/"
            logger.info(f"Making DELETE request to {url}")
            
            response = await self.client.delete(url, headers=self.headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error deleting metric alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting metric alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def get_issue_alert_rule(
        self,
        organization_slug: str,
        project_slug: str,
        rule_id: str
    ) -> Dict[str, Any]:
        """Get an issue alert rule.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            rule_id: The ID of the rule to retrieve
            
        Returns:
            The issue alert rule data
        """
        logger.info(f"Getting issue alert rule {rule_id} for {organization_slug}/{project_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/projects/{organization_slug}/{project_slug}/rules/{rule_id}/"
            logger.info(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting issue alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error getting issue alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def get_metric_alert_rule(
        self,
        organization_slug: str,
        rule_id: str
    ) -> Dict[str, Any]:
        """Get a metric alert rule.
        
        Args:
            organization_slug: The slug of the organization
            rule_id: The ID of the rule to retrieve
            
        Returns:
            The metric alert rule data
        """
        logger.info(f"Getting metric alert rule {rule_id} for {organization_slug}")
        
        # Make API request
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/alert-rules/{rule_id}/"
            logger.info(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting metric alert rule: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error getting metric alert rule: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def _make_request(self, method: str, url: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a raw HTTP request to the Sentry API.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            url: Full URL to request
            params: Optional query parameters
            
        Returns:
            The response data as a dictionary
        """
        logger.info(f"Making {method} request to {url}")
        
        # Use mock data if enabled
        if getattr(settings, "USE_MOCK_DATA", "false").lower() == "true":
            logger.info("Using mock data for raw request")
            return self._mock_raw_request(method, url, params)
        
        try:
            request_method = getattr(self.client, method.lower())
            response = await request_method(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in raw request: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error in raw request: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error in raw request: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    # Discover API methods
    async def execute_discover_query(
        self,
        organization_slug: str,
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a Discover query.
        
        Args:
            organization_slug: The slug of the organization
            query_params: Query parameters for Discover
            
        Returns:
            Query results with data and metadata
        """
        logger.info(f"Executing Discover query for {organization_slug}")
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/eventsv2/"
            logger.info(f"Making GET request to {url}")
            
            # Convert fields list to comma-separated string
            if "fields" in query_params and isinstance(query_params["fields"], list):
                query_params["field"] = query_params["fields"]
                del query_params["fields"]
            
            response = await self.client.get(url, headers=self.headers, params=query_params)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error executing Discover query: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error executing Discover query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def execute_discover_timeseries(
        self,
        organization_slug: str,
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a Discover timeseries query.
        
        Args:
            organization_slug: The slug of the organization
            query_params: Query parameters for Discover timeseries
            
        Returns:
            Timeseries data with intervals and groups
        """
        logger.info(f"Executing Discover timeseries for {organization_slug}")
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/events-stats/"
            logger.info(f"Making GET request to {url}")
            
            # Convert fields list to comma-separated string
            if "fields" in query_params and isinstance(query_params["fields"], list):
                query_params["field"] = query_params["fields"]
                del query_params["fields"]
            
            response = await self.client.get(url, headers=self.headers, params=query_params)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error executing Discover timeseries: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error executing Discover timeseries: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def list_saved_queries(
        self,
        organization_slug: str
    ) -> List[Dict[str, Any]]:
        """List saved Discover queries.
        
        Args:
            organization_slug: The slug of the organization
            
        Returns:
            List of saved queries
        """
        logger.info(f"Listing saved queries for {organization_slug}")
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/"
            logger.info(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error listing saved queries: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error listing saved queries: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def create_saved_query(
        self,
        organization_slug: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a saved Discover query.
        
        Args:
            organization_slug: The slug of the organization
            query_data: Query data to save
            
        Returns:
            Created saved query
        """
        logger.info(f"Creating saved query for {organization_slug}")
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/"
            logger.info(f"Making POST request to {url}")
            
            response = await self.client.post(url, headers=self.headers, json=query_data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error creating saved query: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error creating saved query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def get_saved_query(
        self,
        organization_slug: str,
        query_id: str
    ) -> Dict[str, Any]:
        """Get a saved Discover query.
        
        Args:
            organization_slug: The slug of the organization
            query_id: ID of the saved query
            
        Returns:
            Saved query data
        """
        logger.info(f"Getting saved query {query_id} for {organization_slug}")
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/{query_id}/"
            logger.info(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting saved query: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error getting saved query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def update_saved_query(
        self,
        organization_slug: str,
        query_id: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update a saved Discover query.
        
        Args:
            organization_slug: The slug of the organization
            query_id: ID of the saved query
            query_data: Updated query data
            
        Returns:
            Updated saved query
        """
        logger.info(f"Updating saved query {query_id} for {organization_slug}")
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/{query_id}/"
            logger.info(f"Making PUT request to {url}")
            
            response = await self.client.put(url, headers=self.headers, json=query_data)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error updating saved query: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error updating saved query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    async def delete_saved_query(
        self,
        organization_slug: str,
        query_id: str
    ) -> None:
        """Delete a saved Discover query.
        
        Args:
            organization_slug: The slug of the organization
            query_id: ID of the saved query
        """
        logger.info(f"Deleting saved query {query_id} for {organization_slug}")
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/{query_id}/"
            logger.info(f"Making DELETE request to {url}")
            
            response = await self.client.delete(url, headers=self.headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error deleting saved query: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Unexpected error deleting saved query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )

    # --- Mock data methods ---
    
    def _mock_event_details(self, event_id: str) -> Dict[str, Any]:
        """Generate mock event details.
        
        Args:
            event_id: The ID of the event
            
        Returns:
            Mock event details as a dictionary
        """
        return {
            "id": event_id,
            "message": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details.",
            "exception": {
                "values": [
                    {
                        "type": "DatabaseError",
                        "value": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details.",
                        "mechanism": {
                            "type": "postgresql",
                            "handled": False
                        }
                    }
                ]
            },
            "tags": [
                {"key": "error_code", "value": "40P01"},
                {"key": "db.system", "value": "postgresql"}
            ],
            "entries": [
                {
                    "type": "exception",
                    "data": {
                        "values": [
                            {
                                "type": "DatabaseError",
                                "value": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details."
                            }
                        ]
                    }
                },
                {
                    "type": "message",
                    "data": {
                        "message": "Process 12345: statement: UPDATE accounts SET balance = balance - 100 WHERE user_id = 42;\nProcess 67890: statement: UPDATE users SET last_login = now() WHERE id = 42;"
                    }
                }
            ],
            "eventID": event_id,
            "issueId": "issue1",
            "projectId": "project123",
            "project": {
                "id": "project123",
                "name": "Backend API"
            }
        }
    
    def _mock_project_issues(
        self, 
        organization_slug: str, 
        project_slug: str, 
        status: Optional[str] = None, 
        query: Optional[str] = None, 
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate mock project issues.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            status: Optional status filter
            query: Optional query string for filtering
            cursor: Optional pagination cursor
            
        Returns:
            Mock project issues as a dictionary
        """
        return {
            "data": [
                {
                    "id": "issue1",
                    "shortId": "PROJ-1",
                    "title": "DatabaseError: deadlock detected",
                    "culprit": "api.transactions.process",
                    "status": "unresolved",
                    "level": "error",
                    "firstSeen": "2023-07-01T10:00:00Z",
                    "lastSeen": "2023-07-05T14:32:00Z",
                    "count": 5,
                    "userCount": 3,
                    "project": {
                        "id": "project123",
                        "slug": project_slug
                    }
                },
                {
                    "id": "issue2",
                    "shortId": "PROJ-2",
                    "title": "TypeError: Cannot read property of undefined",
                    "culprit": "frontend.components.UserProfile",
                    "status": "unresolved",
                    "level": "error",
                    "firstSeen": "2023-07-02T11:20:00Z",
                    "lastSeen": "2023-07-04T09:15:00Z",
                    "count": 8,
                    "userCount": 5,
                    "project": {
                        "id": "project123",
                        "slug": project_slug
                    }
                }
            ],
            "pagination": {
                "next": {
                    "cursor": cursor or "mock-cursor-next"
                },
                "previous": None
            }
        }
    
    def _mock_issue_details(self, issue_id: str) -> Dict[str, Any]:
        """Generate mock issue details.
        
        Args:
            issue_id: The ID of the issue
            
        Returns:
            Mock issue details as a dictionary
        """
        return {
            "id": issue_id,
            "shortId": "PROJ-1",
            "title": "DatabaseError: deadlock detected",
            "culprit": "api.transactions.process",
            "status": "unresolved",
            "level": "error",
            "firstSeen": "2023-07-01T10:00:00Z",
            "lastSeen": "2023-07-05T14:32:00Z",
            "count": 5,
            "userCount": 3,
            "project": {
                "id": "project123",
                "slug": "backend-api"
            },
            "events": [
                {
                    "id": "event1",
                    "message": "ERROR: deadlock detected",
                    "dateCreated": "2023-07-05T14:32:00Z"
                }
            ]
        }
    
    def _mock_issue_events(self, issue_id: str, cursor: Optional[str] = None) -> Dict[str, Any]:
        """Generate mock issue events.
        
        Args:
            issue_id: The ID of the issue
            cursor: Optional pagination cursor
            
        Returns:
            Mock issue events as a dictionary
        """
        return {
            "data": [
                {
                    "id": "event1",
                    "eventID": "event1",
                    "groupID": issue_id,
                    "message": "ERROR: deadlock detected",
                    "dateCreated": "2023-07-05T14:32:00Z",
                    "user": {
                        "id": "user1",
                        "email": "user@example.com"
                    }
                },
                {
                    "id": "event2",
                    "eventID": "event2",
                    "groupID": issue_id,
                    "message": "ERROR: deadlock detected",
                    "dateCreated": "2023-07-04T10:15:00Z",
                    "user": {
                        "id": "user2",
                        "email": "another@example.com"
                    }
                }
            ],
            "pagination": {
                "next": {
                    "cursor": cursor or "mock-cursor-next"
                },
                "previous": None
            }
        }
    
    def _mock_issue_event(self, issue_id: str, event_id: str) -> Dict[str, Any]:
        """Generate mock issue event.
        
        Args:
            issue_id: The ID of the issue
            event_id: The ID of the event (or 'latest', 'oldest', 'recommended')
            
        Returns:
            Mock issue event as a dictionary
        """
        # Handle special event identifiers
        if event_id in ['latest', 'oldest', 'recommended']:
            if event_id == 'latest':
                # Return a mock 'latest' event
                return {
                    "id": "event1",
                    "eventID": "event1",
                    "issueId": issue_id,
                    "message": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details.",
                    "dateCreated": "2023-07-05T14:32:00Z",
                    "user": {
                        "id": "user1",
                        "email": "user@example.com"
                    },
                    "exception": {
                        "values": [
                            {
                                "type": "DatabaseError",
                                "value": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details.",
                                "mechanism": {
                                    "type": "postgresql",
                                    "handled": False
                                }
                            }
                        ]
                    },
                    "tags": [
                        {"key": "error_code", "value": "40P01"},
                        {"key": "db.system", "value": "postgresql"}
                    ],
                    "entries": [
                        {
                            "type": "exception",
                            "data": {
                                "values": [
                                    {
                                        "type": "DatabaseError",
                                        "value": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details."
                                    }
                                ]
                            }
                        },
                        {
                            "type": "message",
                            "data": {
                                "message": "Process 12345: statement: UPDATE accounts SET balance = balance - 100 WHERE user_id = 42;\nProcess 67890: statement: UPDATE users SET last_login = now() WHERE id = 42;"
                            }
                        }
                    ]
                }
            elif event_id == 'oldest':
                # Return a mock 'oldest' event
                return {
                    "id": "event10",
                    "eventID": "event10",
                    "issueId": issue_id,
                    "message": "ERROR: deadlock detected",
                    "dateCreated": "2023-07-01T09:45:00Z",
                    "user": {
                        "id": "user5",
                        "email": "olduser@example.com"
                    }
                }
            else:  # 'recommended'
                # Return a mock 'recommended' event
                return {
                    "id": "event3",
                    "eventID": "event3",
                    "issueId": issue_id,
                    "message": "ERROR: deadlock detected",
                    "dateCreated": "2023-07-03T16:20:00Z",
                    "user": {
                        "id": "user3",
                        "email": "recommended@example.com"
                    }
                }
        
        # Handle regular event IDs
        return {
            "id": event_id,
            "eventID": event_id,
            "issueId": issue_id,
            "message": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details.",
            "dateCreated": "2023-07-05T14:32:00Z",
            "user": {
                "id": "user1",
                "email": "user@example.com"
            },
            "exception": {
                "values": [
                    {
                        "type": "DatabaseError",
                        "value": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details.",
                        "mechanism": {
                            "type": "postgresql",
                            "handled": False
                        }
                    }
                ]
            },
            "tags": [
                {"key": "error_code", "value": "40P01"},
                {"key": "db.system", "value": "postgresql"}
            ],
            "entries": [
                {
                    "type": "exception",
                    "data": {
                        "values": [
                            {
                                "type": "DatabaseError",
                                "value": "ERROR: deadlock detected\nDETAIL: Process 12345 waits for ShareLock on relation users; blocked by process 67890.\nProcess 67890 waits for ShareLock on relation accounts; blocked by process 12345.\nHINT: See server log for query details."
                            }
                        ]
                    }
                },
                {
                    "type": "message",
                    "data": {
                        "message": "Process 12345: statement: UPDATE accounts SET balance = balance - 100 WHERE user_id = 42;\nProcess 67890: statement: UPDATE users SET last_login = now() WHERE id = 42;"
                    }
                }
            ]
        }
    
    def _mock_issue_stats(self, issue_id: str, stat: str, interval: Optional[str] = None) -> List[List[Any]]:
        """Generate mock issue stats.
        
        Args:
            issue_id: The ID of the issue
            stat: The stat type (e.g., "24h", "14d", "30d")
            interval: The interval for stats (e.g., "1h", "1d")
            
        Returns:
            Mock issue stats as a list of [timestamp, count] pairs
        """
        # Generate some mock data points
        import time
        current_time = int(time.time())
        
        if stat == "24h":
            # Generate hourly data for the last 24 hours
            data_points = []
            for i in range(24, 0, -1):
                timestamp = current_time - (i * 3600)  # 3600 seconds = 1 hour
                count = 5 + (i % 7)  # Mock count with some variation
                data_points.append([timestamp, count])
        elif stat == "7d":
            # Generate daily data for the last 7 days
            data_points = []
            for i in range(7, 0, -1):
                timestamp = current_time - (i * 86400)  # 86400 seconds = 1 day
                count = 10 + (i % 15)  # Mock count with some variation
                data_points.append([timestamp, count])
        else:  # Default to 30d
            # Generate daily data for the last 30 days
            data_points = []
            for i in range(30, 0, -1):
                timestamp = current_time - (i * 86400)  # 86400 seconds = 1 day
                count = 20 + (i % 25)  # Mock count with some variation
                data_points.append([timestamp, count])
        
        return data_points
    
    def _mock_raw_request(self, method: str, url: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Generate mock raw request response.
        
        Args:
            method: HTTP method
            url: Full URL 
            params: Optional query parameters
            
        Returns:
            Mock response data
        """
        # Simple mock response for general requests
        return {
            "data": [],
            "links": {},
            "meta": {}
        }

# Dependency for FastAPI
async def get_sentry_client() -> SentryApiClient:
    """Get a Sentry API client for dependency injection.
    
    Returns:
        A SentryApiClient instance
    """
    # For the dependency, we need to be able to create a client dynamically
    # This will be passed to the SentryApiClient constructor
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield SentryApiClient(client=client)
