"""Debug router for development"""

from fastapi import APIRouter, Request
from typing import List, Dict

router = APIRouter()

@router.get("/routes")
async def list_routes(request: Request):
    """List all registered routes"""
    routes = []
    for route in request.app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": route.name,
                "endpoint": str(route.endpoint) if hasattr(route, 'endpoint') else None
            })
    return {"routes": sorted(routes, key=lambda x: x['path'])}