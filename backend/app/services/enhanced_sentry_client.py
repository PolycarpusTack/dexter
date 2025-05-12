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

logger = logging.getLogger(__name__)


class EnhancedSentryClient(SentryApiClient):
    """
    Enhanced Sentry API client with additional functionality beyond the base client.
    Provides methods for Discover API, enhanced event analysis, etc.
    """
    
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
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/eventsv2/"
            logger.debug(f"Making GET request to {url} with params: {query_params}")
            
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
            logger.error(f"Error executing Discover query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error executing query: {str(e)}"
            )
    
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
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/"
            logger.debug(f"Making GET request to {url}")
            
            response = await self.client.get(url, headers=self.headers)
            response.raise_for_status()
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error getting saved queries: {e.response.status_code} - {e.response.text}")
            # Return empty list on error rather than raising exception
            return []
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
        
        try:
            url = f"{self.base_url}/organizations/{organization_slug}/discover/saved/"
            logger.debug(f"Making POST request to {url}")
            
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
                detail=f"Error creating query: {str(e)}"
            )
    
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
        # Get basic event details first
        event = await self.get_event_details(organization_slug, project_slug, event_id)
        
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
    
    Args:
        sentry_client: Base Sentry client from dependency injection
        
    Returns:
        EnhancedSentryClient instance
    """
    # Convert base client to enhanced client
    enhanced_client = EnhancedSentryClient(
        client=sentry_client.client,
        base_url=sentry_client.base_url,
        auth_token=sentry_client.auth_token
    )
    
    return enhanced_client
