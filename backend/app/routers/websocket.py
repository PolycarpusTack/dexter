"""
Websocket router for real-time communication.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
import json
from typing import Dict, List

logger = logging.getLogger(__name__)

router = APIRouter()

# Keep track of active connections
active_connections: Dict[str, List[WebSocket]] = {}


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Websocket endpoint for real-time communication.
    
    Args:
        websocket: WebSocket connection
        client_id: Client identifier
    """
    await websocket.accept()
    
    # Add connection to active connections
    if client_id not in active_connections:
        active_connections[client_id] = []
    active_connections[client_id].append(websocket)
    
    logger.info(f"Client {client_id} connected via WebSocket")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                # Parse JSON data
                message = json.loads(data)
                logger.debug(f"Received message from client {client_id}: {message}")
                
                # Echo message back to client
                await websocket.send_json({
                    "type": "echo",
                    "data": message,
                    "client_id": client_id
                })
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON from client {client_id}: {e}")
                await websocket.send_json({
                    "type": "error",
                    "error": "Invalid JSON",
                    "message": str(e)
                })
                
    except WebSocketDisconnect:
        # Remove connection from active connections
        active_connections[client_id].remove(websocket)
        if not active_connections[client_id]:
            del active_connections[client_id]
        logger.info(f"Client {client_id} disconnected")
        
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {e}")


async def broadcast_message(message: Dict, client_id: str = None):
    """
    Broadcast a message to clients.
    
    Args:
        message: Message to broadcast
        client_id: Client ID to send to (None for all clients)
    """
    if client_id:
        # Send to specific client
        if client_id in active_connections:
            for connection in active_connections[client_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to client {client_id}: {e}")
    else:
        # Send to all clients
        for client_id, connections in active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting message to client {client_id}: {e}")
