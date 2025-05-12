# File: backend/app/services/config_service.py

"""
Service for managing Dexter's runtime configuration like selected org/project.
Holds state in memory for MVP. Checks status of dependencies.
"""
import logging
from typing import Optional, Dict, Any
import httpx

from ..models.config import DexterConfigUpdate # Import needed model
from app.core.settings import settings

logger = logging.getLogger(__name__)

class ConfigService:
    def __init__(self):
        self._organization_slug: Optional[str] = None
        self._project_slug: Optional[str] = None
        logger.info("In-memory ConfigService initialized.")

    def get_config(self) -> Dict[str, Optional[str]]:
        return {"organization_slug": self._organization_slug, "project_slug": self._project_slug}

    def update_config(self, config_update: DexterConfigUpdate) -> Dict[str, Optional[str]]:
        if config_update.organization_slug is not None:
            self._organization_slug = config_update.organization_slug.strip() or None
            logger.info(f"Config updated: organization_slug='{self._organization_slug}'")
        if config_update.project_slug is not None:
            self._project_slug = config_update.project_slug.strip() or None
            logger.info(f"Config updated: project_slug='{self._project_slug}'")
        return self.get_config()

    async def check_status(self) -> Dict[str, Any]:
        sentry_ok = bool(settings.sentry_api_token and settings.sentry_api_token != "YOUR_SENTRY_API_TOKEN")
        ollama_status = "Not Configured"
        ollama_model = None
        if settings.ollama_base_url:
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    # Check Ollama root or /api/tags to verify model presence later?
                    response = await client.get(settings.ollama_base_url)
                    if response.status_code < 400:
                        ollama_status = "OK"
                        ollama_model = settings.ollama_model
                    else:
                        ollama_status = f"Configured (HTTP {response.status_code})"
                    logger.debug(f"Ollama connection check status: {ollama_status}")
            except httpx.RequestError as e:
                ollama_status = "Configured (Offline)"
                logger.warning(f"Ollama connection check failed: {e}")
            except Exception as e:
                 ollama_status = f"Error ({type(e).__name__})"
                 logger.error(f"Unexpected error during Ollama status check: {e}", exc_info=False) # Don't log full trace usually

        return {
            "sentry_api_token_configured": sentry_ok,
            "ollama_connection_status": ollama_status,
            "ollama_model_configured": ollama_model,
        }

config_service_instance = ConfigService()
def get_config_service() -> ConfigService:
    return config_service_instance