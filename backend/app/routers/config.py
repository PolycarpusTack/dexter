# File: backend/app/routers/config.py

"""
API Router for managing Dexter's configuration and status.
"""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from ..core.config import reload_settings
from ..models.config import DexterConfigResponse, DexterConfigUpdate, DexterStatusResponse
from ..services.config_service import ConfigService, get_config_service

logger = logging.getLogger(__name__)
router = APIRouter()


def add_cors_headers(response: JSONResponse) -> JSONResponse:
    """Add CORS headers to a response."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response


@router.options("/config")
async def options_config() -> JSONResponse:
    """Handle CORS preflight requests for config endpoint"""
    response = JSONResponse(content={"detail": "CORS preflight request handled"})
    return add_cors_headers(response)


@router.get("/config", response_model=DexterConfigResponse)
async def get_current_config(
    request: Request, config_service: ConfigService = Depends(get_config_service)
) -> DexterConfigResponse:
    """Get current Dexter configuration"""
    result = config_service.get_config()
    return result


@router.put("/config", response_model=DexterConfigResponse)
async def update_dexter_config(
    request: Request,
    config_update: DexterConfigUpdate,
    config_service: ConfigService = Depends(get_config_service),
) -> DexterConfigResponse:
    """Update Dexter configuration"""
    result = config_service.update_config(config_update)
    return result


@router.options("/status")
async def options_status() -> JSONResponse:
    """Handle CORS preflight requests for status endpoint"""
    response = JSONResponse(content={"detail": "CORS preflight request handled"})
    return add_cors_headers(response)


@router.get("/status", response_model=DexterStatusResponse)
async def get_backend_status(
    request: Request, config_service: ConfigService = Depends(get_config_service)
) -> DexterStatusResponse:
    """Get Dexter backend status"""
    result = await config_service.check_status()
    return result


@router.options("/reload-config")
async def options_reload_config() -> JSONResponse:
    """Handle CORS preflight requests for reload-config endpoint"""
    response = JSONResponse(content={"detail": "CORS preflight request handled"})
    return add_cors_headers(response)


@router.post("/reload-config")
async def reload_configuration(
    request: Request,
    # TODO: Add admin authentication dependency when auth is implemented
    # current_user: dict = Depends(require_admin),
):
    """
    Reload application configuration from environment.

    Useful for toggling feature flags without restart.

    This endpoint reloads all configuration from environment variables,
    allowing operators to change feature flags, enrichment settings,
    and other configuration options without restarting the application.

    Returns:
        Configuration reload status and current enrichment flag states

    Raises:
        HTTPException: 500 if configuration reload fails
    """
    try:
        # Reload settings from environment
        new_settings = reload_settings()

        # Update app state with new settings
        request.app.state.settings = new_settings

        # Build enrichment status dictionary
        enrichments = {
            "releases": new_settings.ENABLE_RELEASES,
            "performance_spans": new_settings.ENABLE_PERFORMANCE_SPANS,
            "profiling": new_settings.ENABLE_PROFILING,
            "sessions_replays": new_settings.ENABLE_SESSIONS_REPLAYS,
            "breadcrumbs": new_settings.ENABLE_BREADCRUMBS,
            "alerts": new_settings.ENABLE_ALERTS,
            "attachments": new_settings.ENABLE_ATTACHMENTS,
            "tag_distributions": new_settings.ENABLE_TAG_DISTRIBUTIONS,
            "ownership": new_settings.ENABLE_OWNERSHIP,
            "measurements": new_settings.ENABLE_MEASUREMENTS,
            "grouping_insights": new_settings.ENABLE_GROUPING_INSIGHTS,
            "all_enrichments_override": new_settings.ENABLE_ALL_ENRICHMENTS,
        }

        # Count enabled enrichments
        enabled_count = sum(
            1 for key, value in enrichments.items()
            if key != "all_enrichments_override" and value
        )

        # Log changes
        logger.info("Configuration reloaded", extra={
            "enabled_enrichments": enrichments,
            "enabled_count": enabled_count,
            "total_count": 11,
        })

        return {
            "status": "success",
            "message": "Configuration reloaded successfully",
            "timestamp": datetime.utcnow().isoformat(),
            "enrichments": enrichments,
            "enabled_count": enabled_count,
            "total_count": 11,
            "enrichment_settings": {
                "batch_size": new_settings.ENRICHMENT_BATCH_SIZE,
                "interval_seconds": new_settings.ENRICHMENT_INTERVAL_SECONDS,
                "max_retries": new_settings.ENRICHMENT_MAX_RETRIES,
            },
        }

    except Exception as e:
        logger.error(f"Failed to reload configuration: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Configuration reload failed: {str(e)}"
        )
