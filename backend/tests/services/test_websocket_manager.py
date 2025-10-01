"""
Tests for WebSocketManager service
"""
import pytest
import asyncio
from unittest.mock import Mock, MagicMock, AsyncMock
from datetime import datetime, timedelta

from app.services.websocket_manager import WebSocketManager


@pytest.fixture
def websocket_manager():
    """Create a WebSocketManager instance for testing"""
    return WebSocketManager()


@pytest.fixture
def mock_websocket():
    """Create a mock WebSocket"""
    ws = Mock()
    ws.send_json = AsyncMock()
    return ws


class TestWebSocketManager:
    """Test cases for WebSocketManager"""

    @pytest.mark.asyncio
    async def test_connect_adds_connection(self, websocket_manager, mock_websocket):
        """Test that connect properly adds a connection"""
        client_id = "test-client-1"
        user_id = "user-1"
        
        await websocket_manager.connect(mock_websocket, client_id, user_id)
        
        assert client_id in websocket_manager.active_connections
        assert websocket_manager.active_connections[client_id]["websocket"] == mock_websocket
        assert websocket_manager.active_connections[client_id]["user_id"] == user_id
        assert websocket_manager.user_presence[user_id]["status"] == "online"

    @pytest.mark.asyncio
    async def test_connect_enforces_max_connections(self, websocket_manager, mock_websocket):
        """Test that connect enforces maximum connection limit"""
        # Fill up to max connections
        for i in range(websocket_manager.MAX_CONNECTIONS):
            await websocket_manager.connect(mock_websocket, f"client-{i}")
        
        # Verify we're at capacity
        assert len(websocket_manager.active_connections) == websocket_manager.MAX_CONNECTIONS
        
        # Add one more - should evict oldest
        await websocket_manager.connect(mock_websocket, "client-new")
        
        # Should still be at max capacity
        assert len(websocket_manager.active_connections) == websocket_manager.MAX_CONNECTIONS
        # Oldest should be gone
        assert "client-0" not in websocket_manager.active_connections
        # New one should be present
        assert "client-new" in websocket_manager.active_connections

    def test_disconnect_removes_connection(self, websocket_manager, mock_websocket):
        """Test that disconnect properly removes a connection"""
        client_id = "test-client-1"
        user_id = "user-1"
        
        # Manually add connection
        websocket_manager.active_connections[client_id] = {
            "websocket": mock_websocket,
            "user_id": user_id,
            "channels": set(),
            "connected_at": datetime.utcnow().isoformat()
        }
        websocket_manager.user_presence[user_id] = {
            "status": "online",
            "last_seen": datetime.utcnow().isoformat(),
            "client_id": client_id
        }
        
        websocket_manager.disconnect(client_id)
        
        assert client_id not in websocket_manager.active_connections
        assert websocket_manager.user_presence[user_id]["status"] == "offline"

    def test_disconnect_handles_missing_client(self, websocket_manager):
        """Test that disconnect handles missing client gracefully"""
        # Should not raise exception
        websocket_manager.disconnect("non-existent-client")

    @pytest.mark.asyncio
    async def test_subscribe_adds_to_channel(self, websocket_manager, mock_websocket):
        """Test that subscribe adds client to channel"""
        client_id = "test-client-1"
        channel = "test-channel"
        
        # Add connection first
        await websocket_manager.connect(mock_websocket, client_id)
        
        await websocket_manager.subscribe(client_id, channel)
        
        assert channel in websocket_manager.active_connections[client_id]["channels"]
        assert client_id in websocket_manager.channel_subscriptions[channel]

    @pytest.mark.asyncio
    async def test_subscribe_enforces_channel_limit(self, websocket_manager, mock_websocket):
        """Test that subscribe enforces channel limit"""
        # Fill up channels
        for i in range(websocket_manager.MAX_CHANNELS):
            channel = f"channel-{i}"
            websocket_manager.channel_subscriptions[channel] = set()
        
        # Try to subscribe to new channel
        client_id = "test-client"
        await websocket_manager.connect(mock_websocket, client_id)
        
        with pytest.raises(ValueError, match="Maximum number of channels"):
            await websocket_manager.subscribe(client_id, "new-channel")

    @pytest.mark.asyncio
    async def test_unsubscribe_removes_from_channel(self, websocket_manager, mock_websocket):
        """Test that unsubscribe removes client from channel"""
        client_id = "test-client-1"
        channel = "test-channel"
        
        # Setup subscription
        await websocket_manager.connect(mock_websocket, client_id)
        await websocket_manager.subscribe(client_id, channel)
        
        # Unsubscribe
        await websocket_manager.unsubscribe(client_id, channel)
        
        assert channel not in websocket_manager.active_connections[client_id]["channels"]
        assert channel not in websocket_manager.channel_subscriptions

    @pytest.mark.asyncio
    async def test_broadcast_to_all(self, websocket_manager, mock_websocket):
        """Test broadcasting to all connections"""
        # Add multiple connections
        for i in range(3):
            await websocket_manager.connect(mock_websocket, f"client-{i}")
        
        message = {"type": "test", "data": "broadcast"}
        await websocket_manager.broadcast(message)
        
        # Each websocket should have received the message
        assert mock_websocket.send_json.call_count == 3
        mock_websocket.send_json.assert_called_with(message)

    @pytest.mark.asyncio
    async def test_broadcast_to_channel(self, websocket_manager):
        """Test broadcasting to specific channel"""
        # Create different websockets for different clients
        ws1 = Mock()
        ws1.send_json = AsyncMock()
        ws2 = Mock()
        ws2.send_json = AsyncMock()
        ws3 = Mock()
        ws3.send_json = AsyncMock()
        
        # Connect clients
        await websocket_manager.connect(ws1, "client-1")
        await websocket_manager.connect(ws2, "client-2")
        await websocket_manager.connect(ws3, "client-3")
        
        # Subscribe only client-1 and client-2 to channel
        await websocket_manager.subscribe("client-1", "test-channel")
        await websocket_manager.subscribe("client-2", "test-channel")
        
        message = {"type": "channel-message", "data": "test"}
        await websocket_manager.broadcast(message, channel="test-channel")
        
        # Only subscribed clients should receive message
        ws1.send_json.assert_called_once_with(message)
        ws2.send_json.assert_called_once_with(message)
        ws3.send_json.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_to_client(self, websocket_manager, mock_websocket):
        """Test sending message to specific client"""
        client_id = "test-client"
        await websocket_manager.connect(mock_websocket, client_id)
        
        message = {"type": "direct", "data": "test"}
        await websocket_manager.send_to_client(client_id, message)
        
        mock_websocket.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_send_to_user(self, websocket_manager):
        """Test sending message to all connections of a user"""
        user_id = "user-1"
        
        # Create multiple connections for same user
        ws1 = Mock()
        ws1.send_json = AsyncMock()
        ws2 = Mock()
        ws2.send_json = AsyncMock()
        
        await websocket_manager.connect(ws1, "client-1", user_id)
        await websocket_manager.connect(ws2, "client-2", user_id)
        
        message = {"type": "user-message", "data": "test"}
        await websocket_manager.send_to_user(user_id, message)
        
        # Both connections should receive message
        ws1.send_json.assert_called_once_with(message)
        ws2.send_json.assert_called_once_with(message)

    @pytest.mark.asyncio
    async def test_cleanup_stale_connections(self, websocket_manager, mock_websocket):
        """Test cleanup of stale connections"""
        # Add a connection with old timestamp
        client_id = "stale-client"
        old_time = datetime.utcnow() - timedelta(hours=25)
        
        websocket_manager.active_connections[client_id] = {
            "websocket": mock_websocket,
            "user_id": None,
            "channels": set(),
            "connected_at": old_time.isoformat()
        }
        
        # Run cleanup
        await websocket_manager._cleanup_stale_connections()
        
        # Stale connection should be removed
        assert client_id not in websocket_manager.active_connections
        assert websocket_manager.metrics["connections_timed_out"] == 1

    def test_cleanup_old_presence_data(self, websocket_manager):
        """Test cleanup of old presence data"""
        # Add old presence data
        old_time = datetime.utcnow() - timedelta(hours=25)
        
        for i in range(1100):  # More than the 1000 limit
            websocket_manager.user_presence[f"user-{i}"] = {
                "status": "offline",
                "last_seen": old_time.isoformat(),
                "client_id": f"client-{i}"
            }
        
        # Add one recent offline user
        websocket_manager.user_presence["recent-user"] = {
            "status": "offline", 
            "last_seen": datetime.utcnow().isoformat(),
            "client_id": "recent-client"
        }
        
        # Trigger cleanup
        websocket_manager._cleanup_old_presence_data()
        
        # Old users should be cleaned up
        assert len(websocket_manager.user_presence) < 1100
        # Recent user should still be there
        assert "recent-user" in websocket_manager.user_presence

    def test_get_online_users(self, websocket_manager):
        """Test getting list of online users"""
        # Add mixed presence data
        websocket_manager.user_presence = {
            "user-1": {"status": "online", "last_seen": "2024-01-01T12:00:00"},
            "user-2": {"status": "offline", "last_seen": "2024-01-01T11:00:00"},
            "user-3": {"status": "online", "last_seen": "2024-01-01T12:30:00"},
        }
        
        online_users = websocket_manager.get_online_users()
        
        assert len(online_users) == 2
        assert any(u["user_id"] == "user-1" for u in online_users)
        assert any(u["user_id"] == "user-3" for u in online_users)
        assert not any(u["user_id"] == "user-2" for u in online_users)