"""
WebSocket router for real-time updates.
"""
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.services.websocket_manager import WebSocketManager
from app.core.config import settings
from app.core.security import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
manager = WebSocketManager()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    token: str = None
):
    """
    WebSocket endpoint for real-time updates.
    
    Args:
        websocket: WebSocket connection
        client_id: Unique client identifier
        token: JWT token for authentication
    """
    try:
        # Accept the WebSocket connection
        await websocket.accept()
        
        # Authenticate user if token provided
        user_id = None
        if token:
            try:
                # Validate token and get user
                # In production, implement proper JWT validation
                user_id = "authenticated_user"  # Placeholder
            except Exception as e:
                logger.warning(f"WebSocket auth failed: {e}")
        
        # Connect to the manager
        await manager.connect(websocket, client_id, user_id)
        
        # Send initial connection success message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "clientId": client_id,
            "authenticated": bool(user_id)
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "subscribe":
                channel = data.get("channel")
                if channel:
                    await manager.subscribe(client_id, channel)
                    await websocket.send_json({
                        "type": "subscription",
                        "channel": channel,
                        "status": "subscribed"
                    })
            
            elif data.get("type") == "unsubscribe":
                channel = data.get("channel")
                if channel:
                    await manager.unsubscribe(client_id, channel)
                    await websocket.send_json({
                        "type": "subscription",
                        "channel": channel,
                        "status": "unsubscribed"
                    })
            
            elif data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": data.get("timestamp")
                })
            
            elif data.get("type") == "presence":
                # Update user presence
                await manager.update_presence(client_id, data.get("status"))
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")
        manager.disconnect(client_id)


@router.post("/broadcast/{event_type}")
async def broadcast_event(event_type: str, data: dict):
    """
    Broadcast an event to all connected clients.
    
    This endpoint is used internally by the backend to send real-time updates.
    """
    message = {
        "type": event_type,
        "data": data
    }
    await manager.broadcast(message)
    return {"status": "broadcasted"}


@router.post("/notify/{client_id}")
async def notify_client(client_id: str, data: dict):
    """
    Send a notification to a specific client.
    """
    message = {
        "type": "notification",
        "data": data
    }
    await manager.send_to_client(client_id, message)
    return {"status": "sent"}


@router.get("/connections")
async def get_connections():
    """
    Get current WebSocket connections (for monitoring).
    """
    return {
        "total": len(manager.active_connections),
        "authenticated": len([c for c in manager.active_connections.values() if c.get("user_id")]),
        "clients": list(manager.active_connections.keys())
    }
