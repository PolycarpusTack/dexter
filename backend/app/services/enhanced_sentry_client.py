# Enhanced Sentry client with path resolution and standardized API calls
import logging
import httpx
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status

from .sentry_client import SentryApiClient
from .path_resolver_service import path_resolver
from ..config.api.path_mappings import HttpMethod

logger = logging.getLogger(__name__)


class EnhancedSentryClient(SentryApiClient):
    """Enhanced Sentry client with path resolution and standardized API calls"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.path_resolver = path_resolver
    
    async def call_endpoint(
        self, 
        endpoint_name: str, 
        params: Dict[str, Any], 
        data: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Any:
        """
        Call a Sentry API endpoint by name
        
        Args:
            endpoint_name: Name of the endpoint from path mappings
            params: Parameters for path and query
            data: Request body data for POST/PUT requests
            **kwargs: Additional arguments for the HTTP request
            
        Returns:
            API response data
        """
        # Get endpoint configuration
        endpoint = self.path_resolver.path_manager.get_endpoint(endpoint_name)
        if not endpoint:
            raise ValueError(f"Unknown endpoint: {endpoint_name}")
        
        # Validate parameters
        is_valid, missing = self.path_resolver.validate_params(endpoint_name, params)
        if not is_valid:
            raise ValueError(f"Missing required parameters: {missing}")
        
        # Build the full URL
        url = self.path_resolver.build_sentry_url(endpoint_name, **params)
        
        # Separate path and query parameters
        path_params = {k: v for k, v in params.items() if k in endpoint.path_params}
        query_params = {k: v for k, v in params.items() if k in endpoint.query_params}
        
        # Make the API call based on method
        try:
            if endpoint.method == HttpMethod.GET:
                response = await self.client.get(url, headers=self.headers, params=query_params, **kwargs)
            elif endpoint.method == HttpMethod.POST:
                response = await self.client.post(url, headers=self.headers, json=data, params=query_params, **kwargs)
            elif endpoint.method == HttpMethod.PUT:
                response = await self.client.put(url, headers=self.headers, json=data, params=query_params, **kwargs)
            elif endpoint.method == HttpMethod.DELETE:
                response = await self.client.delete(url, headers=self.headers, params=query_params, **kwargs)
            elif endpoint.method == HttpMethod.PATCH:
                response = await self.client.patch(url, headers=self.headers, json=data, params=query_params, **kwargs)
            else:
                raise ValueError(f"Unsupported HTTP method: {endpoint.method}")
            
            response.raise_for_status()
            
            # Handle pagination information if present
            result = response.json()
            if 'Link' in response.headers:
                result['_pagination'] = self._parse_link_header(response.headers['Link'])
            
            return result
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error calling {endpoint_name}: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except httpx.RequestError as e:
            logger.error(f"Request error calling {endpoint_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Error connecting to Sentry API: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error calling {endpoint_name}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
    
    def _parse_link_header(self, link_header: str) -> Dict[str, Any]:
        """Parse Link header for pagination information"""
        links = {}
        parts = link_header.split(',')
        
        for part in parts:
            section = part.split(';')
            if len(section) != 2:
                continue
                
            url = section[0].strip()[1:-1]  # Remove < and >
            name = section[1].strip().split('=')[1][1:-1]  # Remove quotes
            
            # Extract cursor from URL
            from urllib.parse import urlparse, parse_qs
            parsed_url = urlparse(url)
            query_params = parse_qs(parsed_url.query)
            cursor = query_params.get('cursor', [None])[0]
            
            links[name] = {
                'url': url,
                'cursor': cursor
            }
        
        return links
    
    # Override methods to use path resolution
    async def list_project_issues(
        self, 
        organization_slug: str, 
        project_slug: str, 
        query: Optional[str] = None, 
        cursor: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List issues using path resolution"""
        params = {
            'organization_slug': organization_slug,
            'project_slug': project_slug,
        }
        
        if query:
            params['query'] = query
        if cursor:
            params['cursor'] = cursor
        if status and status != 'all':
            params['status'] = status
        
        return await self.call_endpoint('list_issues', params)
    
    async def get_issue_details(self, organization_slug: str, issue_id: str) -> Dict[str, Any]:
        """Get issue details using path resolution"""
        params = {
            'organization_slug': organization_slug,
            'issue_id': issue_id,
        }
        
        return await self.call_endpoint('get_issue', params)
    
    async def update_issue_status(self, issue_id: str, status: str, organization_slug: str = "default") -> Dict[str, Any]:
        """Update issue status using path resolution"""
        params = {
            'organization_slug': organization_slug,
            'issue_id': issue_id,
        }
        
        data = {'status': status}
        
        return await self.call_endpoint('update_issue', params, data)
    
    async def get_event_details(
        self, 
        organization_slug: str, 
        project_slug: str, 
        event_id: str
    ) -> Dict[str, Any]:
        """Get event details using path resolution"""
        params = {
            'organization_slug': organization_slug,
            'project_slug': project_slug,
            'event_id': event_id,
        }
        
        return await self.call_endpoint('get_event', params)
    
    # Discover API methods
    async def discover_query(
        self,
        organization_slug: str,
        query_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a Discover query
        
        Args:
            organization_slug: Organization slug
            query_params: Query parameters including fields, query, sort, etc.
            
        Returns:
            Query results with data and metadata
        """
        url = f"{self.base_url}/organizations/{organization_slug}/events/"
        
        try:
            response = await self.client.get(url, headers=self.headers, params=query_params)
            response.raise_for_status()
            
            result = response.json()
            
            # Add pagination info if available
            if 'Link' in response.headers:
                result['_pagination'] = self._parse_link_header(response.headers['Link'])
            
            return result
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in discover query: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Error executing discover query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to execute discover query: {str(e)}"
            )
    
    async def get_discover_saved_queries(
        self,
        organization_slug: str
    ) -> List[Dict[str, Any]]:
        """
        Get saved Discover queries from Sentry
        
        Args:
            organization_slug: Organization slug
            
        Returns:
            List of saved queries
        """
        url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/"
        
        try:
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting saved queries: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Sentry API error: {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Error getting saved queries: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get saved queries: {str(e)}"
            )
    
    async def create_discover_saved_query(
        self,
        organization_slug: str,
        query_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a saved Discover query
        
        Args:
            organization_slug: Organization slug
            query_data: Query definition data
            
        Returns:
            Created query object
        """
        url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/"
        
        try:
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
            logger.error(f"Error creating saved query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create saved query: {str(e)}"
            )
    
    @classmethod
    async def get_instance(cls):
        """Get an enhanced Sentry API client instance for dependency injection"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            return cls(client=client)


# Dependency for FastAPI
async def get_enhanced_sentry_client() -> EnhancedSentryClient:
    """Get an enhanced Sentry API client for dependency injection"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield EnhancedSentryClient(client=client)
