# backend/app/routers/enhanced_ai.py

from fastapi import APIRouter, Depends, HTTPException, status, Body, Query, Path
from typing import Dict, List, Optional, Any, Union
import httpx
import logging
import time

from app.models.ai_models import (
    Model,
    ModelsResponse,
    ModelResponse,
    ModelRequest,
    ModelPreferences,
    FallbackChain
)
from app.models.ai import (
    ExplainRequest,
    ExplainResponse
)
from app.services.enhanced_llm_service import EnhancedLLMService
from app.dependencies import get_http_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai-enhanced",
    tags=["ai-enhanced"]
)

# Dependency to get the enhanced LLM service
async def get_enhanced_llm_service(client: httpx.AsyncClient = Depends(get_http_client)) -> EnhancedLLMService:
    return EnhancedLLMService(client)

@router.get(
    "/models",
    response_model=ModelsResponse,
    summary="List available AI models",
    description="Returns a list of all available AI models and their status from various providers."
)
async def list_models_endpoint(
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """List all available models from all providers."""
    return await llm_service.list_models()

@router.post(
    "/models/pull/{model_id}",
    response_model=Dict[str, Any],
    summary="Pull/download a model",
    description="Initiates download of a model. This is a non-blocking operation."
)
async def pull_model_endpoint(
    model_id: str = Path(..., description="ID of the model to pull"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Pull/download a model from its provider."""
    return await llm_service.pull_model(model_id)

@router.post(
    "/models/select",
    response_model=Dict[str, Any],
    summary="Select active model",
    description="Sets the active model for future requests."
)
async def select_model_endpoint(
    model_request: ModelRequest,
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Set the active model."""
    return await llm_service.set_active_model(model_request.model_id)

@router.post(
    "/user/{user_id}/preferences",
    response_model=Dict[str, Any],
    summary="Set user model preferences",
    description="Sets a user's model preferences including primary and fallback models."
)
async def set_user_preferences_endpoint(
    user_id: str = Path(..., description="User ID"),
    preferences: ModelPreferences = Body(..., description="User model preferences"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Set model preferences for a user."""
    return await llm_service.set_user_preferences(user_id, preferences)

@router.get(
    "/user/{user_id}/preferences",
    response_model=ModelPreferences,
    summary="Get user model preferences",
    description="Gets a user's model preferences including primary and fallback models."
)
async def get_user_preferences_endpoint(
    user_id: str = Path(..., description="User ID"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Get model preferences for a user."""
    return await llm_service.get_user_preferences(user_id)

@router.post(
    "/fallback-chains",
    response_model=Dict[str, Any],
    summary="Create fallback chain",
    description="Creates a new fallback chain configuration."
)
async def create_fallback_chain_endpoint(
    chain: FallbackChain = Body(..., description="Fallback chain to create"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Create a new fallback chain."""
    return await llm_service.create_fallback_chain(chain)

@router.post(
    "/fallback-chains/{chain_id}/set-default",
    response_model=Dict[str, Any],
    summary="Set default fallback chain",
    description="Sets the specified fallback chain as the default."
)
async def set_default_fallback_chain_endpoint(
    chain_id: str = Path(..., description="ID of the fallback chain"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Set the default fallback chain."""
    return await llm_service.set_fallback_chain(chain_id, is_default=True)

@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Get AI Explanation for an Error",
    description="Receives error data and generates an explanation using AI. Supports multi-model fallback."
)
async def explain_error_endpoint(
    request: ExplainRequest,
    debug: bool = Query(False, description="Include debug information like prompts"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Get an AI-powered explanation for an error."""
    start_time = time.time()
    
    # Extract user ID from request if available
    user_id = request.context.get("user_id") if request.context else None
    
    # Get explanation
    result = await llm_service.get_explanation(
        event_data=request.context.get("eventData", {}),
        override_model=request.model,
        user_id=user_id,
        include_prompt=debug
    )
    
    # Format response
    response = ExplainResponse(
        explanation=result.get("explanation", "No explanation generated"),
        model=result.get("model", "unknown"),
        processing_time=result.get("processing_time", 0),
    )
    
    # Include debug info if requested
    if debug:
        response.debug = {
            "prompt": result.get("prompt"),
            "system_prompt": result.get("system_prompt"),
            "fallbacks_tried": result.get("fallbacks_tried", False),
            "error": result.get("error")
        }
    
    return response

# For backward compatibility with existing API
@router.get(
    "/models/legacy",
    summary="List available Ollama models (legacy format)",
    description="Returns a list of all available Ollama models in the old format."
)
async def list_legacy_models_endpoint(
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """List all available Ollama models in the legacy format."""
    return await llm_service.get_legacy_models()

@router.post(
    "/providers/{provider}/config",
    summary="Set provider configuration",
    description="Updates configuration for a specific AI provider."
)
async def set_provider_config_endpoint(
    provider: str = Path(..., description="Provider name (openai, anthropic, etc.)"),
    config: Dict[str, Any] = Body(..., description="Provider configuration settings"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Set configuration for a specific provider."""
    try:
        return await llm_service.set_provider_config(provider, config)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Error setting provider config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set provider config: {str(e)}"
        )

@router.post(
    "/providers/{provider}/test-connection",
    summary="Test provider connection",
    description="Tests connection to a provider API with provided credentials."
)
async def test_provider_connection_endpoint(
    provider: str = Path(..., description="Provider name (openai, anthropic, etc.)"),
    request: Dict[str, Any] = Body(..., description="Connection test parameters including API key"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Test connection to a provider API."""
    try:
        return await llm_service.test_provider_connection(provider, request)
    except Exception as e:
        logger.exception(f"Error testing provider connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test provider connection: {str(e)}"
        )

@router.get(
    "/providers/availability",
    summary="Get provider availability",
    description="Returns availability status of all configured providers."
)
async def get_provider_availability_endpoint(
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Get availability status of all providers."""
    try:
        return await llm_service.get_provider_availability()
    except Exception as e:
        logger.exception(f"Error checking provider availability: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check provider availability: {str(e)}"
        )