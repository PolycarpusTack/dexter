# File: backend/app/models/config.py

"""
Pydantic models related to Dexter configuration management.
"""
from typing import Optional

from pydantic import BaseModel, Field


class DexterConfigBase(BaseModel):
    organization_slug: Optional[str] = Field(None, description="Slug of the Sentry organization.")
    project_slug: Optional[str] = Field(None, description="Slug of the Sentry project.")


class DexterConfigUpdate(DexterConfigBase):
    pass


class DexterConfigResponse(DexterConfigBase):
    pass


class DexterStatusResponse(BaseModel):
    sentry_api_token_configured: bool
    ollama_connection_status: str
    ollama_model_configured: Optional[str] = None
