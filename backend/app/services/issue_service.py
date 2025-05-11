"""
Issue service with WebSocket notifications
"""
from typing import Optional, Dict, Any
from app.services.sentry_client import SentryClient
from app.services.websocket_manager import WebSocketManager

class IssueService:
    def __init__(self, sentry_client: SentryClient):
        self.sentry = sentry_client
        self.ws_manager = WebSocketManager()
    
    async def update_issue_status(
        self, 
        issue_id: str, 
        status: str, 
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update issue status and notify WebSocket clients.
        
        Args:
            issue_id: Issue identifier
            status: New status
            user_id: User making the update
        
        Returns:
            Updated issue data
        """
        # Update in Sentry
        response = await self.sentry.update_issue(issue_id, {"status": status})
        
        # Notify WebSocket clients
        await self.ws_manager.notify_issue_update(
            issue_id=issue_id,
            update_type="status_changed",
            data={
                "status": status,
                "previous_status": response.get("previous_status"),
                "updated_by": user_id,
                "title": response.get("title"),
                "project": response.get("project"),
            }
        )
        
        return response
    
    async def assign_issue(
        self, 
        issue_id: str, 
        assignee: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Assign issue and notify WebSocket clients.
        
        Args:
            issue_id: Issue identifier
            assignee: User to assign to
            user_id: User making the assignment
        
        Returns:
            Updated issue data
        """
        # Update in Sentry
        response = await self.sentry.update_issue(issue_id, {"assignedTo": assignee})
        
        # Notify WebSocket clients
        await self.ws_manager.notify_issue_update(
            issue_id=issue_id,
            update_type="assigned",
            data={
                "assignee": assignee,
                "assigned_by": user_id,
                "title": response.get("title"),
                "project": response.get("project"),
            }
        )
        
        # Also notify the specific assignee
        await self.ws_manager.send_to_user(assignee, {
            "type": "assignment_notification",
            "issue_id": issue_id,
            "title": response.get("title"),
            "assigned_by": user_id,
        })
        
        return response
    
    async def create_comment(
        self,
        issue_id: str,
        text: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Create issue comment and notify WebSocket clients.
        
        Args:
            issue_id: Issue identifier
            text: Comment text
            user_id: User creating the comment
        
        Returns:
            Created comment data
        """
        # Create comment in Sentry (if supported)
        # For now, we'll simulate this
        comment = {
            "id": f"comment_{issue_id}_{user_id}",
            "issue_id": issue_id,
            "text": text,
            "user_id": user_id,
            "created_at": "2024-01-15T12:00:00Z"
        }
        
        # Notify WebSocket clients
        await self.ws_manager.notify_issue_update(
            issue_id=issue_id,
            update_type="comment_added",
            data={
                "comment": comment,
                "user_id": user_id,
            }
        )
        
        return comment
