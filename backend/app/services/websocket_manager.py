"""
WebSocket connection manager for handling real-time communications.
"""
from typing import Dict, List, Optional, Set
from fastapi import WebSocket
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and message broadcasting.
    """
    
    def __init__(self):
        # Store active connections: {client_id: {"websocket": WebSocket, "user_id": str, "channels": Set[str]}}
        self.active_connections: Dict[str, Dict] = {}
        
        # Store channel subscriptions: {channel: Set[client_id]}
        self.channel_subscriptions: Dict[str, Set[str]] = {}
        
        # Store user presence data
        self.user_presence: Dict[str, Dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str, user_id: Optional[str] = None):
        """
        Add a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            client_id: Unique client identifier
            user_id: Optional authenticated user ID
        """
        self.active_connections[client_id] = {
            "websocket": websocket,
            "user_id": user_id,
            "channels": set(),
            "connected_at": datetime.utcnow().isoformat()
        }
        
        if user_id:
            self.user_presence[user_id] = {
                "status": "online",
                "last_seen": datetime.utcnow().isoformat(),
                "client_id": client_id
            }
        
        logger.info(f"Client {client_id} connected (user: {user_id})")
    
    def disconnect(self, client_id: str):
        """
        Remove a WebSocket connection.
        
        Args:
            client_id: Client identifier to disconnect
        """
        if client_id in self.active_connections:
            connection = self.active_connections[client_id]
            user_id = connection.get("user_id")
            
            # Clean up channel subscriptions
            for channel in connection.get("channels", set()):
                if channel in self.channel_subscriptions:
                    self.channel_subscriptions[channel].discard(client_id)
                    if not self.channel_subscriptions[channel]:
                        del self.channel_subscriptions[channel]
            
            # Update user presence
            if user_id and user_id in self.user_presence:
                self.user_presence[user_id]["status"] = "offline"
                self.user_presence[user_id]["last_seen"] = datetime.utcnow().isoformat()
            
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected")
    
    async def subscribe(self, client_id: str, channel: str):
        """
        Subscribe a client to a channel.
        
        Args:
            client_id: Client identifier
            channel: Channel name to subscribe to
        """
        if client_id in self.active_connections:
            self.active_connections[client_id]["channels"].add(channel)
            
            if channel not in self.channel_subscriptions:
                self.channel_subscriptions[channel] = set()
            
            self.channel_subscriptions[channel].add(client_id)
            logger.debug(f"Client {client_id} subscribed to channel {channel}")
    
    async def unsubscribe(self, client_id: str, channel: str):
        """
        Unsubscribe a client from a channel.
        
        Args:
            client_id: Client identifier
            channel: Channel name to unsubscribe from
        """
        if client_id in self.active_connections:
            self.active_connections[client_id]["channels"].discard(channel)
            
            if channel in self.channel_subscriptions:
                self.channel_subscriptions[channel].discard(client_id)
                if not self.channel_subscriptions[channel]:
                    del self.channel_subscriptions[channel]
            
            logger.debug(f"Client {client_id} unsubscribed from channel {channel}")
    
    async def broadcast(self, message: dict, channel: Optional[str] = None):
        """
        Broadcast a message to all connected clients or to a specific channel.
        
        Args:
            message: Message to broadcast
            channel: Optional channel to broadcast to
        """
        if channel:
            # Broadcast to specific channel
            client_ids = self.channel_subscriptions.get(channel, set())
            connections = [
                self.active_connections[client_id]["websocket"]
                for client_id in client_ids
                if client_id in self.active_connections
            ]
        else:
            # Broadcast to all connections
            connections = [
                conn["websocket"]
                for conn in self.active_connections.values()
            ]
        
        # Send message to all relevant connections
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
    
    async def send_to_client(self, client_id: str, message: dict):
        """
        Send a message to a specific client.
        
        Args:
            client_id: Client identifier
            message: Message to send
        """
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]["websocket"]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to client {client_id}: {e}")
                self.disconnect(client_id)
    
    async def send_to_user(self, user_id: str, message: dict):
        """
        Send a message to all connections of a specific user.
        
        Args:
            user_id: User identifier
            message: Message to send
        """
        client_ids = [
            client_id
            for client_id, conn in self.active_connections.items()
            if conn.get("user_id") == user_id
        ]
        
        for client_id in client_ids:
            await self.send_to_client(client_id, message)
    
    async def update_presence(self, client_id: str, status: str):
        """
        Update user presence status.
        
        Args:
            client_id: Client identifier
            status: New status (online, away, busy, etc.)
        """
        if client_id in self.active_connections:
            user_id = self.active_connections[client_id].get("user_id")
            if user_id:
                self.user_presence[user_id] = {
                    "status": status,
                    "last_seen": datetime.utcnow().isoformat(),
                    "client_id": client_id
                }
                
                # Broadcast presence update
                await self.broadcast({
                    "type": "presence_update",
                    "user_id": user_id,
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat()
                }, channel="presence")
    
    def get_online_users(self) -> List[Dict]:
        """
        Get list of online users.
        
        Returns:
            List of online user presence data
        """
        return [
            {"user_id": user_id, **data}
            for user_id, data in self.user_presence.items()
            if data.get("status") == "online"
        ]
    
    async def notify_issue_update(self, issue_id: str, update_type: str, data: dict):
        """
        Notify clients about issue updates.
        
        Args:
            issue_id: Issue identifier
            update_type: Type of update (created, updated, resolved, etc.)
            data: Update data
        """
        message = {
            "type": "issue_update",
            "update_type": update_type,
            "issue_id": issue_id,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast to issue channel and global updates channel
        await self.broadcast(message, channel=f"issue:{issue_id}")
        await self.broadcast(message, channel="issues")
    
    async def notify_alert_trigger(self, alert_id: str, alert_data: dict):
        """
        Notify clients about alert triggers.
        
        Args:
            alert_id: Alert identifier
            alert_data: Alert data
        """
        message = {
            "type": "alert_trigger",
            "alert_id": alert_id,
            "data": alert_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.broadcast(message, channel="alerts")
        
        # Also send to specific project channel if available
        project_id = alert_data.get("project_id")
        if project_id:
            await self.broadcast(message, channel=f"project:{project_id}")
