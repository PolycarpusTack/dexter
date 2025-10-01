# backend/app/routers/api/v1/external_apis.py

from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel, Field

from app.models.common import ApiResponse
from app.services.external_api_service import (
    ExternalAPIAuthType,
    ExternalAPIProvider,
    ExternalAPIRegistry,
    get_external_api_registry,
)

router = APIRouter(
    prefix="/external-apis",
    tags=["external-apis"],
    responses={
        404: {"description": "API integration not found"},
        500: {"description": "Internal server error"},
    },
)


class ExternalAPICreate(BaseModel):
    name: str = Field(..., description="Display name for the API integration")
    provider: ExternalAPIProvider = Field(..., description="API provider type")
    base_url: str = Field(..., description="Base URL for the API")
    description: Optional[str] = Field(None, description="Description of the API integration")
    auth_type: ExternalAPIAuthType = Field(..., description="Authentication type")
    api_key: Optional[str] = Field(None, description="API key (for API_KEY auth type)")
    api_key_header: Optional[str] = Field("X-API-Key", description="Header name for API key")
    token: Optional[str] = Field(None, description="Bearer token (for BEARER auth type)")
    username: Optional[str] = Field(None, description="Username (for BASIC auth type)")
    password: Optional[str] = Field(None, description="Password (for BASIC auth type)")
    default_timeout: Optional[float] = Field(30.0, description="Default timeout in seconds")
    default_headers: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="Default headers"
    )
    endpoints: Optional[Dict[str, Dict[str, Any]]] = Field(
        default_factory=dict, description="API endpoints"
    )

    class Config:
        use_enum_values = True


class ExternalAPIUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Display name for the API integration")
    base_url: Optional[str] = Field(None, description="Base URL for the API")
    description: Optional[str] = Field(None, description="Description of the API integration")
    auth_type: Optional[ExternalAPIAuthType] = Field(None, description="Authentication type")
    api_key: Optional[str] = Field(None, description="API key (for API_KEY auth type)")
    api_key_header: Optional[str] = Field(None, description="Header name for API key")
    token: Optional[str] = Field(None, description="Bearer token (for BEARER auth type)")
    username: Optional[str] = Field(None, description="Username (for BASIC auth type)")
    password: Optional[str] = Field(None, description="Password (for BASIC auth type)")
    default_timeout: Optional[float] = Field(None, description="Default timeout in seconds")
    default_headers: Optional[Dict[str, str]] = Field(None, description="Default headers")
    enabled: Optional[bool] = Field(None, description="Whether this integration is enabled")

    class Config:
        use_enum_values = True


class EndpointConfig(BaseModel):
    path: str = Field(..., description="Endpoint path")
    method: str = Field("GET", description="HTTP method")
    description: Optional[str] = Field(None, description="Description of the endpoint")
    requires_auth: Optional[bool] = Field(
        True, description="Whether endpoint requires authentication"
    )
    cache_ttl: Optional[int] = Field(None, description="Cache TTL in seconds, None = no caching")
    test_endpoint: Optional[bool] = Field(False, description="Whether this is a test endpoint")


class EndpointsConfig(BaseModel):
    endpoints: Dict[str, EndpointConfig] = Field(..., description="Endpoint configurations")


class APIRequest(BaseModel):
    endpoint: str = Field(..., description="Endpoint name or path")
    method: str = Field("GET", description="HTTP method")
    params: Optional[Dict[str, Any]] = Field(None, description="Query parameters")
    data: Optional[Dict[str, Any]] = Field(None, description="Request data (for POST/PUT/PATCH)")
    headers: Optional[Dict[str, str]] = Field(None, description="Custom headers")
    timeout: Optional[float] = Field(None, description="Request timeout in seconds")
    use_cache: Optional[bool] = Field(True, description="Whether to use cache for GET requests")


async def get_registry() -> ExternalAPIRegistry:
    """Dependency to get initialized registry."""
    registry = get_external_api_registry()
    if not registry.loaded:
        await registry.initialize()
    return registry


@router.get("/", response_model=ApiResponse)
async def list_api_integrations(registry: ExternalAPIRegistry = Depends(get_registry)):
    """List all available API integrations."""
    return await registry.list_apis()


@router.post("/", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def create_api_integration(
    api_config: ExternalAPICreate,
    background_tasks: BackgroundTasks,
    registry: ExternalAPIRegistry = Depends(get_registry),
):
    """Create a new API integration."""
    # Convert to dict and prepare auth config
    config_data = api_config.model_dump()

    # Move auth fields to auth sub-object
    auth_data = {
        "type": config_data.pop("auth_type"),
    }

    # Add appropriate auth fields based on type
    if auth_data["type"] == ExternalAPIAuthType.API_KEY:
        auth_data["api_key"] = config_data.pop("api_key", None)
        auth_data["api_key_header"] = config_data.pop("api_key_header", "X-API-Key")
    elif auth_data["type"] == ExternalAPIAuthType.BEARER:
        auth_data["token"] = config_data.pop("token", None)
    elif auth_data["type"] == ExternalAPIAuthType.BASIC:
        auth_data["username"] = config_data.pop("username", None)
        auth_data["password"] = config_data.pop("password", None)

    # Remove other auth fields
    config_data.pop("api_key", None)
    config_data.pop("api_key_header", None)
    config_data.pop("token", None)
    config_data.pop("username", None)
    config_data.pop("password", None)

    # Add auth to config
    config_data["auth"] = auth_data

    # Create API
    result = await registry.create_api(config_data)

    # Test connection in background
    if result.success and "id" in result.data:
        background_tasks.add_task(registry.test_connection, result.data["id"])

    return result


@router.get("/{api_id}", response_model=ApiResponse)
async def get_api_details(api_id: str, registry: ExternalAPIRegistry = Depends(get_registry)):
    """Get details for a specific API integration."""
    return await registry.get_api_details(api_id)


@router.put("/{api_id}", response_model=ApiResponse)
async def update_api_integration(
    api_id: str,
    api_update: ExternalAPIUpdate,
    background_tasks: BackgroundTasks,
    registry: ExternalAPIRegistry = Depends(get_registry),
):
    """Update an API integration."""
    # Convert to dict and prepare config update
    update_data = {k: v for k, v in api_update.model_dump().items() if v is not None}

    # Prepare auth update if needed
    auth_fields = [
        "auth_type",
        "api_key",
        "api_key_header",
        "token",
        "username",
        "password",
    ]
    if any(field in update_data for field in auth_fields):
        # Get current config
        current_api = await registry.get_api_details(api_id)
        if not current_api.success:
            return current_api

        # Start with current auth config
        auth_data = current_api.data.get("auth", {})

        # Update auth type if provided
        if "auth_type" in update_data:
            auth_data["type"] = update_data.pop("auth_type")

        # Update auth fields based on type
        if auth_data["type"] == ExternalAPIAuthType.API_KEY:
            if "api_key" in update_data:
                auth_data["api_key"] = update_data.pop("api_key")
            if "api_key_header" in update_data:
                auth_data["api_key_header"] = update_data.pop("api_key_header")
        elif auth_data["type"] == ExternalAPIAuthType.BEARER:
            if "token" in update_data:
                auth_data["token"] = update_data.pop("token")
        elif auth_data["type"] == ExternalAPIAuthType.BASIC:
            if "username" in update_data:
                auth_data["username"] = update_data.pop("username")
            if "password" in update_data:
                auth_data["password"] = update_data.pop("password")

        # Remove remaining auth fields
        for field in auth_fields:
            update_data.pop(field, None)

        # Add updated auth config
        update_data["auth"] = auth_data

    # Update API
    result = await registry.update_api(api_id, update_data)

    # Test connection in background
    if result.success:
        background_tasks.add_task(registry.test_connection, api_id)

    return result


@router.delete("/{api_id}", response_model=ApiResponse)
async def delete_api_integration(
    api_id: str, registry: ExternalAPIRegistry = Depends(get_registry)
):
    """Delete an API integration."""
    return await registry.delete_api(api_id)


@router.get("/{api_id}/status", response_model=ApiResponse)
async def get_api_status(api_id: str, registry: ExternalAPIRegistry = Depends(get_registry)):
    """Get status and metrics for an API integration."""
    return await registry.get_api_status(api_id)


@router.post("/{api_id}/test", response_model=ApiResponse)
async def test_api_connection(api_id: str, registry: ExternalAPIRegistry = Depends(get_registry)):
    """Test connection to an API integration."""
    return await registry.test_connection(api_id)


@router.post("/{api_id}/endpoints", response_model=ApiResponse)
async def configure_endpoints(
    api_id: str,
    config: EndpointsConfig,
    registry: ExternalAPIRegistry = Depends(get_registry),
):
    """Configure endpoints for an API integration."""
    # Convert endpoint configs to dict
    endpoints = {}
    for name, endpoint in config.endpoints.items():
        endpoints[name] = endpoint.model_dump()

    return registry.configure_endpoints(api_id, endpoints)


@router.post("/{api_id}/request", response_model=ApiResponse)
async def make_api_request(
    api_id: str,
    request: APIRequest,
    registry: ExternalAPIRegistry = Depends(get_registry),
):
    """Make a request to an external API."""
    return await registry.request(
        api_id=api_id,
        endpoint=request.endpoint,
        method=request.method,
        params=request.params,
        json_data=request.data,
        headers=request.headers,
        timeout=request.timeout,
        use_cache=request.use_cache,
    )


@router.get("/providers", response_model=ApiResponse)
async def list_providers():
    """List all supported external API providers."""
    providers = [provider.value for provider in ExternalAPIProvider]
    return ApiResponse(success=True, data={"providers": providers}, status_code=200)


@router.get("/auth-types", response_model=ApiResponse)
async def list_auth_types():
    """List all supported authentication types."""
    auth_types = [auth_type.value for auth_type in ExternalAPIAuthType]
    return ApiResponse(success=True, data={"auth_types": auth_types}, status_code=200)
