"""Debug router for development"""

from typing import Any, Dict, List

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/routes")
async def list_routes(request: Request) -> Dict[str, List[Dict[str, Any]]]:
    """List all registered routes"""
    routes: List[Dict[str, Any]] = []
    for route in request.app.routes:
        if hasattr(route, "path") and hasattr(route, "methods"):
            routes.append(
                {
                    "path": route.path,
                    "methods": list(route.methods),
                    "name": route.name,
                    "endpoint": str(route.endpoint) if hasattr(route, "endpoint") else None,
                }
            )
    return {"routes": sorted(routes, key=lambda x: x["path"])}
