"""
Enhanced Sentry API client with additional functionality.
Extends the base SentryApiClient with Discover API features.
"""

from typing import Dict, Any, List, Optional, Union
import logging
import httpx
from fastapi import Depends, HTTPException, status

from app.services.sentry_client import SentryApiClient, get_sentry_client
from app.core.settings import settings
from app.utils.path_resolver import get_full_url

logger = logging.getLogger(__name__)


class EnhancedSentryClient(SentryApiClient):
    """
    Enhanced Sentry API client with additional functionality beyond the base client.
    Provides methods for Discover API, enhanced event analysis, etc.
    """
    
    async def call_endpoint(
        self,
        endpoint_name: str,
        params: Dict[str, Any],
        data: Optional[Dict[str, Any]] = None,
        method: str = "GET"
    ) -> Dict[str, Any]:
        """
        Generic method to call any endpoint defined in the API path configuration.
        
        Args:
            endpoint_name: The logical name of the endpoint in the mapping (e.g., 'assign_issue')
            params: Parameters for URL resolution and query params
            data: Optional body data for POST/PUT requests
            method: HTTP method to use (GET, POST, PUT, DELETE)
            
        Returns:
            API response data
        """
        # Map endpoint names to category and endpoint in the config
        # This mapping connects the logical endpoint names used in the enhanced_issues.py
        # to the actual category and endpoint names in the YAML config
        endpoint_mapping = {
            # Issues endpoints
            'list_project_issues': ('issues', 'list'),
            'get_issue_details': ('issues', 'detail'),
            'update_issue_status': ('issues', 'update'),
            'assign_issue': ('issues', 'update'), # Same endpoint, different data
            'list_issue_tags': ('issues', 'detail'), # Uses the same endpoint for now
            'add_issue_tags': ('issues', 'update'), # Same endpoint, different data
            'bulk_update_issues': ('organization_issues', 'bulk'),
            
            # Events endpoints
            'list_issue_events': ('issue_events', 'list'),
            'get_event_details': ('events', 'detail'),
            
            # Discover endpoints
            'discover_query': ('discover', 'query'),
            'get_discover_saved_queries': ('discover', 'saved_queries'),
            'create_discover_saved_query': ('discover', 'create_saved_query'),
        }
        
        if endpoint_name not in endpoint_mapping:
            raise ValueError(f"Unknown endpoint name: {endpoint_name}")
        
        category, endpoint = endpoint_mapping[endpoint_name]
        
        # Extract path params and query params
        path_params = params.copy()
        query_params = {}
        
        # Some common query params that should not be used for path resolution
        QUERY_PARAMS = ['status', 'query', 'cursor', 'id', 'environment']
        
        for param in QUERY_PARAMS:
            if param in path_params:
                query_params[param] = path_params.pop(param)
        
        # Add common params
        path_params.update(self.common_params)
        
        # Resolve URL
        url = get_full_url(category, endpoint, **path_params)
        
        # Make request
        try:
            logger.debug(f"Making {method} request to {url}")
            
            if method in ["GET", "DELETE"]:
                response = await self._request(method, url, params=query_params)
            else: # POST, PUT
                response = await self._request(method, url, params=query_params, data=data)
            
            return response
        except Exception as e:
            logger.error(f"Error calling endpoint {endpoint_name}: {str(e)}")
            raise
    
    async def list_project_issues(
        self,
        organization_slug: str,
        project_slug: str,
        query: Optional[str] = None,
        cursor: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List issues for a project.
        
        Args:
            organization_slug: Organization slug
            project_slug: Project slug
            query: Optional search query
            cursor: Optional pagination cursor
            status: Optional status filter
            
        Returns:
            List of issues with pagination info
        """
        params = {
            'organization_slug': organization_slug,
            'project_slug': project_slug,
            'query': query,
            'cursor': cursor,
            'status': status
        }
        
        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}
        
        return await self.call_endpoint('list_project_issues', params)
    
    async def get_issue_details(
        self,
        organization_slug: str,
        issue_id: str
    ) -> Dict[str, Any]:
        """
        Get details for a specific issue.
        
        Args:
            organization_slug: Organization slug
            issue_id: Issue ID
            
        Returns:
            Issue details
        """
        params = {
            'organization_slug': organization_slug,
            'issue_id': issue_id
        }
        
        return await self.call_endpoint('get_issue_details', params)
    
    async def update_issue_status(
        self,
        issue_id: str,
        status: str,
        organization_slug: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update the status of an issue.
        
        Args:
            issue_id: Issue ID
            status: New status
            organization_slug: Optional organization slug (not used in API call)
            
        Returns:
            Updated issue
        """
        params = {
            'issue_id': issue_id
        }
        
        data = {
            'status': status
        }
        
        return await self.call_endpoint('update_issue_status', params, data, method="PUT")
    
    async def discover_query(
        self,
        organization_slug: str,
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a Discover query.
        
        Args:
            organization_slug: The organization slug
            query_params: Query parameters
            
        Returns:
            Query results
        """
        logger.info(f"Executing Discover query for {organization_slug}")
        
        params = {
            'organization_slug': organization_slug,
            **query_params
        }
        
        return await self.call_endpoint('discover_query', params)
    
    async def get_discover_saved_queries(
        self,
        organization_slug: str
    ) -> List[Dict[str, Any]]:
        """
        Get saved Discover queries.
        
        Args:
            organization_slug: The organization slug
            
        Returns:
            List of saved queries
        """
        logger.info(f"Getting saved Discover queries for {organization_slug}")
        
        params = {
            'organization_slug': organization_slug
        }
        
        try:
            result = await self.call_endpoint('get_discover_saved_queries', params)
            return result
        except Exception as e:
            logger.error(f"Error getting saved queries: {str(e)}")
            return []
    
    async def create_discover_saved_query(
        self,
        organization_slug: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a saved Discover query.
        
        Args:
            organization_slug: The organization slug
            query_data: Query data
            
        Returns:
            Created query
        """
        logger.info(f"Creating saved Discover query for {organization_slug}")
        
        params = {
            'organization_slug': organization_slug
        }
        
        return await self.call_endpoint('create_discover_saved_query', params, query_data, method="POST")
    
    async def analyze_event(
        self,
        organization_slug: str,
        project_slug: str,
        event_id: str
    ) -> Dict[str, Any]:
        """
        Perform enhanced analysis on an event.
        
        Args:
            organization_slug: The organization slug
            project_slug: The project slug
            event_id: The event ID
            
        Returns:
            Enhanced event analysis
        """
        # Get basic event details
        params = {
            'organization_slug': organization_slug,
            'project_slug': project_slug,
            'event_id': event_id
        }
        
        event = await self.call_endpoint('get_event_details', params)
        
        # Then add enhanced analysis
        analysis = {
            "event": event,
            "analysis": {
                "summary": "Event analysis not available in this version",
                "recommendations": [],
                "similar_events": []
            }
        }
        
        return analysis


# FastAPI dependency
async def get_enhanced_sentry_client(
    sentry_client: SentryApiClient = Depends(get_sentry_client)
) -> EnhancedSentryClient:
    """
    Get an instance of the enhanced Sentry client.
    This dependency function is used in the enhanced_issues router.
    
    Args:
        sentry_client: Base Sentry client from dependency injection
        
    Returns:
        EnhancedSentryClient instance
    """
    # Create enhanced client with same settings as the base client
    enhanced_client = EnhancedSentryClient(
        token=sentry_client.token,
        timeout=sentry_client.timeout
    )
    
    # Copy the client to avoid creating a new connection
    enhanced_client.client = sentry_client.client
    enhanced_client.common_params = sentry_client.common_params
    
    return enhanced_client
