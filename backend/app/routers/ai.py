# File: backend/app/routers/ai.py

"""
API Router for AI-powered features, like explanations and model management.
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict, Any, Optional
import logging

from ..services.sentry_client import SentryApiClient
from ..services.llm_service import LLMService
from ..models.ai import ExplainRequest, ExplainResponse, ModelsResponse, ModelSelectionRequest
from ..services.config_service import ConfigService, get_config_service
from app.core.settings import settings  # Import settings from config module

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Dependencies ---
async def get_sentry_client() -> SentryApiClient:
    async with httpx.AsyncClient(timeout=30.0) as client:
        yield SentryApiClient(client)

async def get_llm_service() -> LLMService:
    async with httpx.AsyncClient(timeout=float(settings.ollama_timeout)) as client: # Use config timeout
        yield LLMService(client)

# --- Model Management Endpoints ---
@router.get(
    "/models",
    response_model=ModelsResponse,
    summary="List Available Ollama Models",
    description="Scans for available Ollama models and returns their status."
)
async def list_models_endpoint(
    llm_service: LLMService = Depends(get_llm_service)
):
    """List available Ollama models and their status."""
    try:
        result = await llm_service.list_models()
        return ModelsResponse(**result)
    except Exception as e:
        logger.exception(f"Error listing models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(e)}"
        )

@router.post(
    "/models/pull/{model_name}",
    summary="Pull Ollama Model",
    description="Initiates a download for the specified Ollama model."
)
async def pull_model_endpoint(
    model_name: str,
    llm_service: LLMService = Depends(get_llm_service)
):
    """Initiates a model pull from Ollama."""
    try:
        return await llm_service.pull_model(model_name)
    except Exception as e:
        logger.exception(f"Error pulling model {model_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pull model: {str(e)}"
        )

@router.post(
    "/models/select",
    summary="Select Active Model",
    description="Changes the active model used for explanations."
)
async def select_model_endpoint(
    request: ModelSelectionRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """Changes the active model for explanations."""
    try:
        return await llm_service.set_active_model(request.model_name)
    except Exception as e:
        logger.exception(f"Error selecting model {request.model_name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to select model: {str(e)}"
        )

# --- Explanation Endpoint ---
@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Get AI Explanation for an Event",
    description="Receives Sentry event data, sends relevant context to the LLM via Ollama, and returns a plain-language explanation.",
)
async def explain_event_endpoint(
    request: ExplainRequest,
    llm_service: LLMService = Depends(get_llm_service),
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    event_data: Optional[Dict[str, Any]] = request.event_data
    event_id: Optional[str] = request.event_id 
    error_type: Optional[str] = request.error_type
    error_message: Optional[str] = request.error_message
    model_override: Optional[str] = request.model
    
    # Log model override if present
    if model_override:
        logger.info(f"Model override requested: {model_override}")

    # Log retry attempts for debugging
    retry_count = request.retry_count if hasattr(request, 'retry_count') else 0
    if retry_count > 0:
        logger.info(f"Processing retry attempt #{retry_count} for explanation")

    if not event_data:
        if error_type and error_message:
            # We can provide a generic explanation based on error type/message
            logger.info(f"Generating generic explanation for error type: {error_type}")
            try:
                explanation_text = await llm_service.get_fallback_explanation(
                    error_type=error_type,
                    error_message=error_message
                )
                return ExplainResponse(
                    explanation=explanation_text,
                    model_used="fallback",
                    is_generic=True
                )
            except Exception as e:
                logger.exception(f"Error generating fallback explanation: {e}")
                return ExplainResponse(
                    explanation="Unable to generate explanation with the limited information provided.",
                    model_used="none",
                    error="Insufficient error details",
                    is_generic=True
                )
        else:
            logger.warning("Explain request received without event_data or error details.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Request must include either 'event_data' or both 'error_type' and 'error_message'."
            )

    event_id_log = event_data.get('eventID', 'N/A')
    logger.info(f"Generating explanation for event: {event_id_log}" + 
                (f" using model override: {model_override}" if model_override else ""))

    try:
        explanation_text = await llm_service.get_explanation(
            event_data, 
            override_model=model_override
        )
        
        logger.info(f"Successfully generated explanation for event {event_id_log}.")
        return ExplainResponse(
            explanation=explanation_text,
            model_used=model_override if model_override else llm_service.model
        )
    except HTTPException as e:
        # Check if we can provide a fallback explanation
        if error_type and error_message:
            logger.info(f"LLM service error ({e.status_code}), trying fallback explanation for error type: {error_type}")
            try:
                explanation_text = await llm_service.get_fallback_explanation(
                    error_type=error_type,
                    error_message=error_message
                )
                return ExplainResponse(
                    explanation=explanation_text,
                    model_used="fallback",
                    error=f"Using fallback explanation due to: {e.detail}",
                    is_generic=True
                )
            except Exception as fallback_error:
                logger.exception(f"Error generating fallback explanation: {fallback_error}")
                # Return error in the response body for frontend handling
                return ExplainResponse(
                    explanation="", 
                    model_used=model_override if model_override else llm_service.model, 
                    error=f"Failed: {e.detail}"
                )
        else:
            # No fallback possible
            return ExplainResponse(
                explanation="", 
                model_used=model_override if model_override else llm_service.model, 
                error=f"Failed: {e.detail}"
            )
    except Exception as e:
        logger.exception(f"Unexpected error during explanation generation for event {event_id_log}")
        # Try fallback if possible
        if error_type and error_message:
            try:
                explanation_text = await llm_service.get_fallback_explanation(
                    error_type=error_type,
                    error_message=error_message
                )
                return ExplainResponse(
                    explanation=explanation_text,
                    model_used="fallback",
                    error=f"Using fallback explanation due to unexpected error",
                    is_generic=True
                )
            except:
                pass
        
        # Don't expose internal error details directly in response
        return ExplainResponse(
            explanation="", 
            model_used=model_override if model_override else llm_service.model, 
            error="An unexpected internal error occurred."
        )