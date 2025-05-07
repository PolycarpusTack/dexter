# File: backend/app/routers/config.py

"""
API Router for managing Dexter's configuration and status.
"""
from fastapi import APIRouter, Depends, HTTPException, status
import logging

from ..services.config_service import ConfigService, get_config_service
from ..models.config import DexterConfigResponse, DexterConfigUpdate, DexterStatusResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/config", response_model=DexterConfigResponse,)
async def get_current_config(config_service: ConfigService = Depends(get_config_service)):
    # ... (same as before) ...
    return config_service.get_config()

@router.put("/config", response_model=DexterConfigResponse,)
async def update_dexter_config(config_update: DexterConfigUpdate, config_service: ConfigService = Depends(get_config_service)):
    # ... (same as before) ...
     return config_service.update_config(config_update)

@router.get("/status", response_model=DexterStatusResponse,)
async def get_backend_status(config_service: ConfigService = Depends(get_config_service)):
    # ... (same as before) ...
     return await config_service.check_status()