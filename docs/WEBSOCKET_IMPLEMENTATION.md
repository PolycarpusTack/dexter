# WebSocket Implementation Guide

## Overview

This document describes the WebSocket implementation in Dexter for real-time updates. The implementation provides bi-directional communication between the frontend and backend, enabling instant notifications for issue updates, alert triggers, and user presence.

## Architecture

### Backend Components

1. **WebSocket Router** (`backend/app/routers/websocket.py`)
   - Handles WebSocket connections and message routing
   - Manages authentication and client identification
   - Provides endpoints for broadcasting and notifications

2. **WebSocket Manager** (`backend/app/services/websocket_manager.py`)
   - Manages active connections and subscriptions
   - Handles channel-based message routing
   - Tracks user presence
   - Provides utilities for issue and alert notifications

### Frontend Components

1. **WebSocket Client** (`frontend/src/services/websocket.ts`)
   - Manages WebSocket connection lifecycle
   - Handles automatic reconnection
   - Provides event-based messaging interface
   - Implements heartbeat mechanism

2. **Real-time Hooks** (`frontend/src/hooks/useRealtimeUpdates.ts`)
   - `useRealtimeUpdates`: Main hook for real-time functionality
   - `useRealtimeIssueUpdates`: Issue-specific updates
   - `useRealtimePresence`: User presence tracking
   - `useRealtimeNotifications`: Notification management

## Features

### 1. Real-time Issue Updates
- Status changes
- Assignment notifications
- Comment additions
- Issue creation/deletion

### 2. Alert Notifications
- Alert triggers
- Threshold breaches
- Rule matches

### 3. User Presence
- Online/offline status
- Last seen timestamps
- Activity tracking

### 4. Connection Management
- Automatic reconnection
- Connection status indicators
- Graceful fallbacks

## Usage Examples

### Backend Usage

```python
# In your service or router
from app.services.websocket_manager import WebSocketManager

ws_manager = WebSocketManager()

# Notify about issue update
await ws_manager.notify_issue_update(
    issue_id="123",
    update_type="resolved",
    data={"resolved_by": "user_id", "title": "Issue Title"}
)

# Broadcast to specific channel
await ws_manager.broadcast(
    {"type": "announcement", "message": "System maintenance"},
    channel="global"
)
```

### Frontend Usage

```typescript
// In your React component
import { useRealtimeUpdates } from '../hooks/useRealtimeUpdates';

function MyComponent() {
  const { isConnected, subscribe, unsubscribe } = useRealtimeUpdates();
  
  useEffect(() => {
    // Subscribe to specific channels
    subscribe('issues');
    subscribe('alerts');
    
    return () => {
      unsubscribe('issues');
      unsubscribe('alerts');
    };
  }, []);
  
  return (
    <div>
      {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

### Issue-specific Updates

```typescript
// In issue detail page
import { useRealtimeIssueUpdates } from '../hooks/useRealtimeUpdates';

function IssueDetail({ issueId }) {
  const { isConnected, refreshIssue } = useRealtimeIssueUpdates(issueId);
  
  // Component automatically subscribes to issue-specific channel
  // and invalidates React Query cache on updates
}
```

## Configuration

### Backend Configuration

Add to your `.env` file:

```env
WEBSOCKET_ENABLED=true
WEBSOCKET_HEARTBEAT_INTERVAL=30
WEBSOCKET_MAX_CONNECTIONS=1000
```

### Frontend Configuration

Add to your `.env` file:

```env
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_WS_RECONNECT_INTERVAL=5000
REACT_APP_WS_MAX_RECONNECT_ATTEMPTS=5
```

## Message Types

### Client to Server

1. **Subscribe**
   ```json
   {
     "type": "subscribe",
     "channel": "issues"
   }
   ```

2. **Unsubscribe**
   ```json
   {
     "type": "unsubscribe",
     "channel": "issues"
   }
   ```

3. **Presence Update**
   ```json
   {
     "type": "presence",
     "status": "online"
   }
   ```

4. **Heartbeat**
   ```json
   {
     "type": "ping",
     "timestamp": "2024-01-15T12:00:00Z"
   }
   ```

### Server to Client

1. **Issue Update**
   ```json
   {
     "type": "issue_update",
     "update_type": "resolved",
     "issue_id": "123",
     "data": {
       "title": "Issue Title",
       "resolved_by": "user_id"
     }
   }
   ```

2. **Alert Trigger**
   ```json
   {
     "type": "alert_trigger",
     "alert_id": "456",
     "data": {
       "message": "High error rate detected",
       "severity": "critical"
     }
   }
   ```

3. **Presence Update**
   ```json
   {
     "type": "presence_update",
     "user_id": "user123",
     "status": "online",
     "timestamp": "2024-01-15T12:00:00Z"
   }
   ```

## Security Considerations

1. **Authentication**
   - JWT tokens are validated on connection
   - Connections without valid tokens have limited access
   - Token refresh is handled through HTTP endpoints

2. **Authorization**
   - Channel subscriptions are validated
   - Message broadcasting is restricted to backend services
   - User-specific messages require authentication

3. **Rate Limiting**
   - Connection attempts are rate-limited
   - Message frequency is throttled per client
   - Bulk operations have separate limits

## Performance Considerations

1. **Scaling**
   - Use Redis for multi-instance deployments
   - Implement connection pooling
   - Consider WebSocket proxy for load balancing

2. **Resource Management**
   - Inactive connections are terminated
   - Memory usage is monitored per connection
   - Message queues have size limits

3. **Optimization**
   - Messages are batched when possible
   - Binary protocols can be used for large payloads
   - Compression is enabled for text messages

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check CORS configuration
   - Verify WebSocket URL
   - Ensure authentication token is valid

2. **Message Delivery**
   - Monitor connection status
   - Check channel subscriptions
   - Verify message format

3. **Performance Issues**
   - Monitor connection count
   - Check message frequency
   - Review network latency

### Debugging

Enable debug logging:

```typescript
// Frontend
const wsClient = new WebSocketClient({
  url: 'ws://localhost:8000',
  debug: true
});
```

```python
# Backend
import logging
logging.getLogger('app.websocket').setLevel(logging.DEBUG)
```

## Testing

### Unit Tests

```typescript
// Frontend test example
describe('WebSocketClient', () => {
  it('should reconnect on disconnection', async () => {
    const client = new WebSocketClient({ url: 'ws://test' });
    // Test implementation
  });
});
```

### Integration Tests

```python
# Backend test example
async def test_websocket_connection():
    client = TestClient(app)
    with client.websocket_connect("/ws/test-client") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connection"
```

## Future Enhancements

1. **Binary Protocol Support**
   - For large data transfers
   - Reduced message size
   - Better performance

2. **Message Persistence**
   - Offline message queuing
   - Message history
   - Guaranteed delivery

3. **Advanced Features**
   - Room-based messaging
   - Direct messaging
   - File transfers

4. **Monitoring**
   - Connection analytics
   - Message metrics
   - Performance dashboards
