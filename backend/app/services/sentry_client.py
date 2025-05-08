"""
Sentry API client for interacting with Sentry.io.

This module provides a client for the Sentry API to retrieve events, issues, and other data.
"""

import logging
import httpx
from fastapi import Depends, HTTPException
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Configuration (would normally be in config.py)
SENTRY_API_URL = "https://sentry.io/api/0"
SENTRY_AUTH_TOKEN = "your-auth-token"  # In production, get from environment variable

class SentryApiClient:
    """Client for the Sentry API."""
    
    def __init__(self, client=None, base_url: str = SENTRY_API_URL, auth_token: str = SENTRY_AUTH_TOKEN):
        """Initialize the Sentry API client.
        
        Args:
            base_url: Base URL for the Sentry API
            auth_token: Authentication token for the Sentry API
        """
        self.client = client
        self.base_url = base_url
        self.auth_token = auth_token
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
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
        
        # Mock data for development
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
    
    async def get_event_by_id(self, event_id: str) -> Dict[str, Any]:
        """Get an event by its ID.
        
        Args:
            event_id: The ID of the event to retrieve
            
        Returns:
            The event data as a dictionary
        """
        # In a real implementation, this would call the Sentry API
        logger.info(f"Fetching event {event_id}")
        
        # For now, return mock data to allow development without a Sentry instance
        return {
            "id": event_id,
            "eventID": event_id,
            "issueId": "issue1",
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
            "projectId": "project123",
            "project": {
                "id": "project123",
                "name": "Backend API"
            }
        }
    
    async def list_project_issues(
        self, 
        organization_slug: str, 
        project_slug: str, 
        query: Optional[str] = None, 
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """List issues for a project with optional filtering.
        
        Args:
            organization_slug: The slug of the organization
            project_slug: The slug of the project
            query: Optional query string for filtering (e.g., "is:unresolved")
            cursor: Optional pagination cursor
            
        Returns:
            A dictionary containing the issues and pagination information
        """
        logger.info(f"Fetching issues for {organization_slug}/{project_slug}")
        
        # Mock data for development
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
    
    async def get_issue_details(self, organization_slug: str, issue_id: str) -> Dict[str, Any]:
        """Get detailed information for a specific issue.
        
        Args:
            organization_slug: The slug of the organization
            issue_id: The ID of the issue
            
        Returns:
            The issue details as a dictionary
        """
        logger.info(f"Fetching issue details for {organization_slug}/{issue_id}")
        
        # Mock data for development
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
    
    async def update_issue_status(self, issue_id: str, status: str) -> Dict[str, Any]:
        """Update the status of an issue.
        
        Args:
            issue_id: The ID of the issue
            status: The new status (e.g., "resolved", "ignored")
            
        Returns:
            The updated issue data as a dictionary
        """
        logger.info(f"Updating issue {issue_id} to status {status}")
        
        # Mock data for development
        return {
            "id": issue_id,
            "status": status,
            "statusDetails": {}
        }
    
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
        
        # Mock data for development
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
        
        # Handle special event identifiers
        if event_id in ['latest', 'oldest', 'recommended']:
            logger.info(f"Using {event_id} event for issue {issue_id}")
            
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
        # Mock data for development
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

# Dependency for FastAPI
async def get_sentry_client() -> SentryApiClient:
    """Get a Sentry API client for dependency injection.
    
    Returns:
        A SentryApiClient instance
    """
    return SentryApiClient()
