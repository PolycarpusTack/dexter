# File: backend/app/services/sentry_client.py

import httpx
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any, AsyncGenerator
import logging
import re
from cachetools import TTLCache, cached
from cachetools.keys import hashkey

from ..config import settings

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

# --- Caching Setup ---
# Create cache instances for various API calls
issues_list_cache = TTLCache(maxsize=256, ttl=300)  # 5 minutes
issue_events_cache = TTLCache(maxsize=128, ttl=300)  # 5 minutes
event_details_cache = TTLCache(maxsize=128, ttl=300)  # 5 minutes

def _parse_link_header(header: Optional[str]) -> Dict[str, str]:
    """Parse pagination links from Link header.
    
    Example Link header format:
    <https://sentry.io/api/0/projects/org/proj/issues/?cursor=0:0:0>; rel="previous"; results="false"; cursor="0:0:0",
    <https://sentry.io/api/0/projects/org/proj/issues/?cursor=100:0:1>; rel="next"; results="true"; cursor="100:0:1"
    
    Returns a dict with keys 'next' and 'prev' with cursor values.
    """
    if not header:
        return {}
    
    links = {}
    for link in header.split(","):
        try:
            url, params = link.strip().split(";", 1)
            url = url.strip("<> ")
            
            # Parse rel parameter to determine if next/prev
            rel_match = re.search(r'rel="([^"]+)"', params)
            if not rel_match:
                continue
            rel = rel_match.group(1)
            
            # Parse cursor parameter
            cursor_match = re.search(r'cursor="([^"]+)"', params)
            if cursor_match:
                cursor = cursor_match.group(1)
            else:
                # Extract cursor from URL if not in params
                cursor_url_match = re.search(r'cursor=([^&]+)', url)
                cursor = cursor_url_match.group(1) if cursor_url_match else None
            
            if cursor and rel in ['next', 'previous']:
                links[rel if rel != 'previous' else 'prev'] = cursor
        except Exception as e:
            logger.warning(f"Error parsing Link header part: {link} - {e}")
            continue
    
    return links

class SentryApiClient:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self.base_url = settings.sentry_base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {settings.sentry_api_token}",
            "Content-Type": "application/json",
        }
        logger.info(f"Sentry API Client initialized for base URL: {self.base_url}")
        if not settings.sentry_api_token or settings.sentry_api_token == "YOUR_SENTRY_API_TOKEN":
             logger.warning("Sentry API token is not configured or using default placeholder!")

    async def _request(self, method: str, endpoint: str, params: Optional[Dict] = None, json: Optional[Dict] = None, full_url: Optional[str] = None) -> httpx.Response:
        """Send a request to the Sentry API."""
        url = full_url or f"{self.base_url}{endpoint}"
        log_params = params or {}
        log_json = json or {}
        try:
            logger.debug(f"Making Sentry API request: {method} {url} | Params: {log_params} | JSON: {log_json}")
            response = await self.client.request(
                method, url, headers=self.headers, params=params, json=json, timeout=30.0
            )
            logger.debug(f"Sentry API response status: {response.status_code} for {method} {url}")
            return response

        except httpx.TimeoutException as e:
            logger.error(f"Sentry API request timed out: {method} {url} | Params: {log_params} - {e}")
            raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=f"Request to Sentry timed out")
        except httpx.RequestError as e:
            logger.error(f"Sentry API request connection error: {method} {url} | Params: {log_params} - {e}")
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Could not connect to Sentry API: {type(e).__name__}")
        except Exception as e:
            logger.exception(f"Unexpected error during Sentry API request: {method} {url} | Params: {log_params} - {e}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error contacting Sentry API.")

    async def list_project_issues(self, organization_slug: str, project_slug: str, query: Optional[str] = "is:unresolved", cursor: Optional[str] = None) -> Dict[str, Any]:
        """Lists issues for a given project (single page) with caching."""
        # Generate a cache key based on function arguments
        cache_key = hashkey(organization_slug, project_slug, query, cursor)

        # Check cache first
        cached_result = issues_list_cache.get(cache_key)
        if cached_result is not None:
             logger.info(f"Cache hit for list_project_issues: key={cache_key}")
             return cached_result

        logger.info(f"Cache miss for list_project_issues: key={cache_key}. Fetching from Sentry.")
        endpoint = f"/projects/{organization_slug}/{project_slug}/issues/"
        params = {"query": query}
        if cursor:
            params["cursor"] = cursor

        response = await self._request("GET", endpoint, params=params)
        try:
            response.raise_for_status()
            response_data = response.json()
            if not isinstance(response_data, list):
                logger.error(f"Unexpected response type from Sentry list_project_issues: {type(response_data)}")
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unexpected response format from Sentry.")

            # Parse any Link headers for pagination info
            link_header = response.headers.get("Link", "")
            pagination_links = {}
            if link_header:
                pagination_links = _parse_link_header(link_header)
            
            # Standardize the response format to match frontend expectations
            result = {
                "data": response_data,
                "pagination": {
                    "next": {"cursor": pagination_links.get("next")} if "next" in pagination_links else None,
                    "prev": {"cursor": pagination_links.get("prev")} if "prev" in pagination_links else None,
                }
            }
            
            # Store in cache
            issues_list_cache[cache_key] = result
            logger.debug(f"Stored result in cache for list_project_issues: key={cache_key}")
            return result

        except httpx.HTTPStatusError as e:
             error_detail = f"Sentry API error: {e.response.status_code}"
             try:
                 sentry_error = e.response.json().get("detail", "Unknown Sentry error")
                 error_detail += f" - {sentry_error}"
             except Exception:
                 error_detail += f" - Response: {e.response.text[:200]}"

             logger.error(f"Failed Sentry API call in list_project_issues: {error_detail} | URL: {e.request.url}")

             if e.response.status_code == status.HTTP_401_UNAUTHORIZED:
                  raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Sentry API authentication failed. Check token.")
             elif e.response.status_code == status.HTTP_403_FORBIDDEN:
                  raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied for Sentry resource.")
             elif e.response.status_code == status.HTTP_404_NOT_FOUND:
                  raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sentry project/organization not found.")
             else:
                 raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Sentry API error: {e.response.status_code}")

    async def list_project_issues_paginated(
        self,
        organization_slug: str,
        project_slug: str,
        query: Optional[str] = "is:unresolved",
        max_results: Optional[int] = 1000
        ) -> AsyncGenerator[Dict[str, Any], None]:
        """Retrieves all issues for a project by paginating through all results.
        Yields each issue as it's processed for streamed responses."""
        endpoint = f"/projects/{organization_slug}/{project_slug}/issues/"
        params = {"query": query}
        yielded_count = 0
        cursor = None

        # Process pages until no more data or we hit the limit
        while True:
            if cursor:
                params["cursor"] = cursor

            try:
                response = await self._request("GET", endpoint, params=params)
                response.raise_for_status()
                
                issues_page = response.json()
                if not isinstance(issues_page, list):
                    logger.error(f"Unexpected response type during pagination: {type(issues_page)}")
                    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, 
                                       detail="Unexpected response format from Sentry.")
                
                # Process each issue in this page
                for issue in issues_page:
                    yield issue
                    yielded_count += 1
                    
                    # Check if we've hit our limit
                    if max_results and yielded_count >= max_results:
                        logger.info(f"Reached export limit of {max_results} issues.")
                        return
                
                # Check for more pages
                link_header = response.headers.get("Link")
                if not link_header:
                    logger.debug("No Link header found, pagination complete.")
                    break
                    
                pagination_links = _parse_link_header(link_header)
                cursor = pagination_links.get("next")
                if not cursor:
                    logger.debug("No next cursor found, pagination complete.")
                    break
                    
                logger.debug(f"Continuing pagination with cursor: {cursor}")
                
            except httpx.HTTPStatusError as e:
                error_detail = f"Sentry API error: {e.response.status_code}"
                try:
                    sentry_error = e.response.json().get("detail", "Unknown Sentry error")
                    error_detail += f" - {sentry_error}"
                except Exception:
                    error_detail += f" - Response: {e.response.text[:200]}"
                logger.error(f"Failed Sentry API call during pagination: {error_detail} | URL: {e.request.url}")
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, 
                                 detail=f"Sentry API error during pagination: {e.response.status_code}")
            except Exception as e:
                logger.exception(f"Unexpected error during pagination: {e}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                                  detail=f"Unexpected error during export: {str(e)}")
        
        logger.info(f"Pagination complete. Yielded {yielded_count} issues.")

    async def get_event_details(self, organization_slug: str, project_slug: str, event_id: str) -> Dict[str, Any]:
        """Retrieves full details for a specific event occurrence."""
        # Check cache first
        cache_key = hashkey("event_details", organization_slug, project_slug, event_id)
        cached_result = event_details_cache.get(cache_key)
        if cached_result is not None:
            logger.info(f"Cache hit for get_event_details: key={cache_key}")
            return cached_result

        logger.info(f"Cache miss for get_event_details: key={cache_key}. Fetching from Sentry.")
        endpoint = f"/projects/{organization_slug}/{project_slug}/events/{event_id}/"
        response = await self._request("GET", endpoint)
        try:
            response.raise_for_status()
            result = response.json()
            
            # Store in cache
            event_details_cache[cache_key] = result
            return result
        except httpx.HTTPStatusError as e:
             error_detail = f"Sentry API error: {e.response.status_code}"
             try:
                 sentry_error = e.response.json().get("detail", "Unknown Sentry error")
                 error_detail += f" - {sentry_error}"
             except Exception:
                 error_detail += f" - Response: {e.response.text[:200]}"
             logger.error(f"Failed Sentry API call in get_event_details: {error_detail} | URL: {e.request.url}")
             if e.response.status_code == status.HTTP_404_NOT_FOUND:
                   raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sentry event not found: {event_id}")
             else:
                  raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Sentry API error: {e.response.status_code}")

    # NEW METHODS BELOW

    async def get_issue_details(self, organization_slug: str, issue_id: str) -> Dict[str, Any]:
        """Retrieves details about a specific issue by ID.
        
        Sentry's API might not have a direct endpoint for getting issue details by ID,
        so we try multiple approaches.
        """
        logger.info(f"Fetching issue details for issue: {issue_id}")
        
        # Try the most direct endpoint first
        try:
            endpoint = f"/organizations/{organization_slug}/issues/{issue_id}/"
            logger.info(f"Trying direct issue endpoint: {endpoint}")
            response = await self._request("GET", endpoint)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.warning(f"Direct issue endpoint failed with {e.response.status_code}, trying alternative approaches")
            # Continue to alternate approaches
            
        # Try to get a list of events for this issue
        try:
            events_endpoint = f"/organizations/{organization_slug}/issues/{issue_id}/events/"
            logger.info(f"Trying to get events for issue: {events_endpoint}")
            events_response = await self._request("GET", events_endpoint)
            events_response.raise_for_status()
            events_data = events_response.json()
            
            # If we got at least one event, return its metadata as issue data
            if isinstance(events_data, list) and len(events_data) > 0:
                logger.info(f"Constructing issue details from first event")
                first_event = events_data[0]
                # Create an issue-like object from the event
                return {
                    "id": issue_id,
                    "title": first_event.get("title", "Unknown Error"),
                    "level": first_event.get("level", "error"),
                    "status": "unknown",  # Event doesn't have status
                    "culprit": first_event.get("culprit", first_event.get("title", "Unknown")),
                    "firstSeen": first_event.get("dateCreated", first_event.get("dateReceived")),
                    "lastSeen": first_event.get("dateCreated", first_event.get("dateReceived")),
                    "count": 1,  # We only know about one event
                    "userCount": 0,  # Unknown
                    "metadata": first_event.get("metadata", {}),
                    "platform": first_event.get("platform", "unknown"),
                    "tags": first_event.get("tags", []),
                    "_constructed": True  # Indicate this was constructed
                }
        except Exception as events_error:
            logger.warning(f"Events-based approach failed: {str(events_error)}")
            
        # As a last resort, create a minimal issue object
        logger.warning(f"All attempts to get issue details failed, creating minimal fallback")
        return {
            "id": issue_id,
            "title": "Issue Details Not Available",
            "level": "error",
            "status": "unknown",
            "culprit": "Details not available",
            "firstSeen": None,
            "lastSeen": None,
            "count": 0,
            "userCount": 0,
            "metadata": {},
            "platform": "unknown",
            "tags": [],
            "_fallback": True
        }

    async def list_issue_events(self, organization_slug: str, issue_id: str, cursor: Optional[str] = None, environment: Optional[str] = None) -> Dict[str, Any]:
        """Lists events for a specific issue."""
        # Generate a cache key based on function arguments
        cache_key = hashkey("issue_events", organization_slug, issue_id, cursor, environment)
        
        # Check cache first
        cached_result = issue_events_cache.get(cache_key)
        if cached_result is not None:
            logger.info(f"Cache hit for list_issue_events: key={cache_key}")
            return cached_result
            
        logger.info(f"Cache miss for list_issue_events: key={cache_key}. Fetching from Sentry.")
        endpoint = f"/organizations/{organization_slug}/issues/{issue_id}/events/"
        
        params = {}
        if cursor:
            params["cursor"] = cursor
        if environment:
            params["environment"] = environment
            
        response = await self._request("GET", endpoint, params=params)
        
        try:
            response.raise_for_status()
            response_data = response.json()
            
            # Parse pagination links from header
            link_header = response.headers.get("Link", "")
            pagination_links = {}
            if link_header:
                pagination_links = _parse_link_header(link_header)
                
            # Standardize the response format
            result = {
                "data": response_data,
                "pagination": {
                    "next": {"cursor": pagination_links.get("next")} if "next" in pagination_links else None,
                    "prev": {"cursor": pagination_links.get("prev")} if "prev" in pagination_links else None,
                }
            }
            
            # Store in cache
            issue_events_cache[cache_key] = result
            logger.debug(f"Stored result in cache for list_issue_events: key={cache_key}")
            return result
            
        except httpx.HTTPStatusError as e:
            error_detail = f"Sentry API error: {e.response.status_code}"
            try:
                sentry_error = e.response.json().get("detail", "Unknown Sentry error")
                error_detail += f" - {sentry_error}"
            except Exception:
                error_detail += f" - Response: {e.response.text[:200]}"
            logger.error(f"Failed Sentry API call in list_issue_events: {error_detail} | URL: {e.request.url}")
            
            if e.response.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sentry issue not found: {issue_id}")
            else:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Sentry API error: {e.response.status_code}")

    async def get_issue_event(self, organization_slug: str, issue_id: str, event_id: str, environment: Optional[str] = None) -> Dict[str, Any]:
        """Retrieves a specific event for an issue.
        
        The event_id can be a specific ID or one of: 'latest', 'oldest', or 'recommended'.
        """
        logger.info(f"Fetching event '{event_id}' for issue: {issue_id}")
        
        # Generate a cache key based on function arguments
        cache_key = hashkey("issue_event", organization_slug, issue_id, event_id, environment)
        
        # Check cache first
        cached_result = event_details_cache.get(cache_key)
        if cached_result is not None:
            logger.info(f"Cache hit for get_issue_event: key={cache_key}")
            return cached_result
            
        logger.info(f"Cache miss for get_issue_event: key={cache_key}. Fetching from Sentry.")
        endpoint = f"/organizations/{organization_slug}/issues/{issue_id}/events/{event_id}/"
        
        params = {}
        if environment:
            params["environment"] = environment
            
        response = await self._request("GET", endpoint, params=params)
        
        try:
            response.raise_for_status()
            result = response.json()
            
            # Store in cache
            event_details_cache[cache_key] = result
            return result
            
        except httpx.HTTPStatusError as e:
            error_detail = f"Sentry API error: {e.response.status_code}"
            try:
                sentry_error = e.response.json().get("detail", "Unknown Sentry error")
                error_detail += f" - {sentry_error}"
            except Exception:
                error_detail += f" - Response: {e.response.text[:200]}"
            logger.error(f"Failed Sentry API call in get_issue_event: {error_detail} | URL: {e.request.url}")
            
            if e.response.status_code == status.HTTP_404_NOT_FOUND:
                if event_id == 'latest' or event_id == 'oldest' or event_id == 'recommended':
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                      detail=f"No {event_id} event found for issue: {issue_id}")
                else:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, 
                                      detail=f"Event not found: {event_id} for issue: {issue_id}")
            else:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, 
                                  detail=f"Sentry API error: {e.response.status_code}")

    async def update_issue_status(self, issue_id: str, status: str) -> Dict[str, Any]:
        """Updates the status of an issue (e.g., resolve, ignore, unresolve)."""
        logger.info(f"Updating status for issue {issue_id} to '{status}'")
        endpoint = f"/issues/{issue_id}/"
        
        payload = {"status": status}
        response = await self._request("PUT", endpoint, json=payload)
        
        try:
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = f"Sentry API error: {e.response.status_code}"
            try:
                sentry_error = e.response.json().get("detail", "Unknown Sentry error")
                error_detail += f" - {sentry_error}"
            except Exception:
                error_detail += f" - Response: {e.response.text[:200]}"
            logger.error(f"Failed Sentry API call in update_issue_status: {error_detail} | URL: {e.request.url}")
            
            if e.response.status_code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sentry issue not found: {issue_id}")
            else:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Sentry API error: {e.response.status_code}")
