# File: backend/app/routers/config.py

"""
API Router for managing Dexter's configuration and status.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
import logging

from ..services.config_service import ConfigService, get_config_service
from ..models.config import DexterConfigResponse, DexterConfigUpdate, DexterStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter()

def add_cors_headers(response: JSONResponse) -> JSONResponse:
    """Add CORS headers to a response."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@router.options("/config")
async def options_config():
    """Handle CORS preflight requests for config endpoint"""
    response = JSONResponse(content={"detail": "CORS preflight request handled"})
    return add_cors_headers(response)

@router.get("/config", response_model=DexterConfigResponse)
async def get_current_config(request: Request, config_service: ConfigService = Depends(get_config_service)):
    """Get current Dexter configuration"""
    result = config_service.get_config()
    return result

@router.put("/config", response_model=DexterConfigResponse)
async def update_dexter_config(
    request: Request,
    config_update: DexterConfigUpdate, 
    config_service: ConfigService = Depends(get_config_service)
):
    """Update Dexter configuration"""
    result = config_service.update_config(config_update)
    return result

@router.options("/status")
async def options_status():
    """Handle CORS preflight requests for status endpoint"""
    response = JSONResponse(content={"detail": "CORS preflight request handled"})
    return add_cors_headers(response)

@router.get("/status", response_model=DexterStatusResponse)
async def get_backend_status(request: Request, config_service: ConfigService = Depends(get_config_service)):
    """Get Dexter backend status"""
    result = await config_service.check_status()
    return result
