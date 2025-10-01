"""
WebSocket connection manager for handling real-time communications.
"""
from typing import Dict, List, Optional, Set
from fastapi import WebSocket
import logging
from datetime import datetime, timedelta
import asyncio
from collections import OrderedDict

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and message broadcasting with memory protection.
    """

    # Configuration constants
    MAX_CONNECTIONS = 1000  # Maximum number of concurrent connections
    MAX_CHANNELS = 500  # Maximum number of channels
    MAX_CHANNEL_SUBSCRIBERS = 100  # Maximum subscribers per channel
    CONNECTION_TIMEOUT_HOURS = 24  # Auto-disconnect after this many hours
    CLEANUP_INTERVAL_MINUTES = 30  # Run cleanup task every 30 minutes

    def __init__(self):
        # Use OrderedDict for LRU behavior when at capacity
        self.active_connections: OrderedDict[str, Dict] = OrderedDict()

        # Store channel subscriptions with size limits
        self.channel_subscriptions: Dict[str, Set[str]] = {}

        # Store user presence data with automatic cleanup
        self.user_presence: Dict[str, Dict] = {}

        # Track connection metrics for monitoring
        self.metrics = {
            "total_connections": 0,
            "connections_rejected": 0,
            "connections_timed_out": 0,
            "cleanup_runs": 0,
        }

        # Background cleanup task
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start_cleanup_task(self):
        """Start the background cleanup task if not already running."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            logger.info("Started WebSocket cleanup task")

    async def stop_cleanup_task(self):
        """Stop the background cleanup task."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            logger.info("Stopped WebSocket cleanup task")

    async def _periodic_cleanup(self):
        """Periodically clean up stale connections and data."""
        while True:
            try:
                await asyncio.sleep(self.CLEANUP_INTERVAL_MINUTES * 60)
                await self._cleanup_stale_connections()
                self.metrics["cleanup_runs"] += 1
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup task: {e}")

    async def _cleanup_stale_connections(self):
        """Remove connections that have exceeded the timeout."""
        now = datetime.utcnow()
        timeout_threshold = now - timedelta(hours=self.CONNECTION_TIMEOUT_HOURS)

        stale_clients = []
        for client_id, conn in self.active_connections.items():
            connected_at = datetime.fromisoformat(conn["connected_at"])
            if connected_at < timeout_threshold:
                stale_clients.append(client_id)

        for client_id in stale_clients:
            logger.warning(f"Disconnecting stale client {client_id}")
            self.disconnect(client_id)
            self.metrics["connections_timed_out"] += 1

    async def connect(self, websocket: WebSocket, client_id: str, user_id: Optional[str] = None):
        """
        Add a new WebSocket connection with capacity management.

        Args:
            websocket: WebSocket connection
            client_id: Unique client identifier
            user_id: Optional authenticated user ID

        Raises:
            ConnectionError: If connection limit is reached
        """
        # Check connection limit
        if len(self.active_connections) >= self.MAX_CONNECTIONS:
            # Remove oldest connection if at capacity (LRU)
            oldest_client = next(iter(self.active_connections))
            logger.warning(
                f"Connection limit reached, disconnecting oldest client: {oldest_client}"
            )
            self.disconnect(oldest_client)
            self.metrics["connections_rejected"] += 1

        # Add new connection
        self.active_connections[client_id] = {
            "websocket": websocket,
            "user_id": user_id,
            "channels": set(),
            "connected_at": datetime.utcnow().isoformat(),
        }

        # Move to end for LRU ordering
        self.active_connections.move_to_end(client_id)

        if user_id:
            self.user_presence[user_id] = {
                "status": "online",
                "last_seen": datetime.utcnow().isoformat(),
                "client_id": client_id,
            }

        self.metrics["total_connections"] += 1
        logger.info(f"Client {client_id} connected (user: {user_id})")

        # Start cleanup task if not running
        await self.start_cleanup_task()

    def disconnect(self, client_id: str):
        """
        Remove a WebSocket connection with proper cleanup.

        Args:
            client_id: Client identifier to disconnect
        """
        try:
            if client_id not in self.active_connections:
                return  # Already disconnected

            connection = self.active_connections.get(client_id, {})
            user_id = connection.get("user_id")

            # Clean up channel subscriptions
            channels_copy = set(
                connection.get("channels", set())
            )  # Create copy to avoid modification during iteration
            for channel in channels_copy:
                if channel in self.channel_subscriptions:
                    self.channel_subscriptions[channel].discard(client_id)
                    if not self.channel_subscriptions[channel]:
                        del self.channel_subscriptions[channel]

            # Update user presence
            if user_id and user_id in self.user_presence:
                self.user_presence[user_id]["status"] = "offline"
                self.user_presence[user_id]["last_seen"] = datetime.utcnow().isoformat()

                # Clean up presence data for users offline for more than 24 hours
                if len(self.user_presence) > 1000:  # Arbitrary limit
                    self._cleanup_old_presence_data()

            # Remove the connection
            self.active_connections.pop(client_id, None)
            logger.info(f"Client {client_id} disconnected")

        except Exception as e:
            logger.error(f"Error during disconnect for client {client_id}: {e}")
            # Force cleanup even if error occurs
            self.active_connections.pop(client_id, None)

    def _cleanup_old_presence_data(self):
        """Clean up presence data for users offline for more than 24 hours."""
        try:
            now = datetime.utcnow()
            threshold = now - timedelta(hours=24)

            users_to_remove = []
            for user_id, data in self.user_presence.items():
                if data.get("status") == "offline":
                    last_seen = datetime.fromisoformat(data.get("last_seen", now.isoformat()))
                    if last_seen < threshold:
                        users_to_remove.append(user_id)

            for user_id in users_to_remove:
                del self.user_presence[user_id]

            if users_to_remove:
                logger.info(f"Cleaned up presence data for {len(users_to_remove)} offline users")

        except Exception as e:
            logger.error(f"Error cleaning up presence data: {e}")

    async def subscribe(self, client_id: str, channel: str):
        """
        Subscribe a client to a channel with capacity limits.

        Args:
            client_id: Client identifier
            channel: Channel name to subscribe to

        Raises:
            ValueError: If channel limit is exceeded
        """
        if client_id not in self.active_connections:
            logger.warning(f"Cannot subscribe disconnected client {client_id}")
            return

        # Check channel limit
        if len(self.channel_subscriptions) >= self.MAX_CHANNELS:
            # Find and remove least active channel
            if channel not in self.channel_subscriptions:
                logger.warning(
                    f"Channel limit reached ({self.MAX_CHANNELS}), cannot create new channel: {channel}"
                )
                raise ValueError(f"Maximum number of channels ({self.MAX_CHANNELS}) reached")

        # Check subscribers per channel limit
        if channel in self.channel_subscriptions:
            if len(self.channel_subscriptions[channel]) >= self.MAX_CHANNEL_SUBSCRIBERS:
                logger.warning(
                    f"Channel {channel} has reached subscriber limit ({self.MAX_CHANNEL_SUBSCRIBERS})"
                )
                raise ValueError(
                    f"Channel {channel} has reached maximum subscribers ({self.MAX_CHANNEL_SUBSCRIBERS})"
                )

        # Add subscription
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
            connections = [conn["websocket"] for conn in self.active_connections.values()]

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
                    "client_id": client_id,
                }

                # Broadcast presence update
                await self.broadcast(
                    {
                        "type": "presence_update",
                        "user_id": user_id,
                        "status": status,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                    channel="presence",
                )

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
            "timestamp": datetime.utcnow().isoformat(),
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
            "timestamp": datetime.utcnow().isoformat(),
        }

        await self.broadcast(message, channel="alerts")

        # Also send to specific project channel if available
        project_id = alert_data.get("project_id")
        if project_id:
            await self.broadcast(message, channel=f"project:{project_id}")
