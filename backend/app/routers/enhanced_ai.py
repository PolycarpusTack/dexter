# backend/app/routers/enhanced_ai.py

import logging
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, Request, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.dependencies import get_http_client
from app.models.ai import ExplainRequest, ExplainResponse
from app.models.ai_models import FallbackChain, ModelPreferences, ModelRequest, ModelsResponse
from app.models.analysis import (
    AnalysisResponse,
    AnalysisSources,
    ConfidenceFactors,
    ModelInfo,
    QuickPromptRequest,
    QuickPromptType,
    SimilarIssueRef,
    TransparencyInfo,
)
from app.services.confidence_scorer import get_confidence_scorer
from app.services.enhanced_llm_service import EnhancedLLMService
from app.services.explanation_service import get_explanation_service
from app.services.quick_prompts import get_quick_prompt_service

# Phase 8: Rate limiting (optional import)
try:
    from app.middleware.rate_limit import limiter, limit_ai_requests
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    RATE_LIMITING_AVAILABLE = False
    limiter = None
    def limit_ai_requests(func):
        return func

# Phase 8: Custom metrics (optional import)
try:
    METRICS_AVAILABLE = True
except ImportError:
    METRICS_AVAILABLE = False

logger = logging.getLogger(__name__)


# RAG-specific request/response models
class RAGExplainRequest(BaseModel):
    """Request for RAG-enhanced explanation."""

    error_type: str = Field(..., description="Type of error (e.g., ValueError)")
    error_message: str = Field(..., description="Error message text")
    platform: Optional[str] = Field(None, description="Platform (e.g., python, javascript)")
    stack_frames: Optional[list] = Field(None, description="Stack trace frames")
    use_knowledge_base: bool = Field(True, description="Whether to use KB context")
    model_override: Optional[str] = Field(None, description="Override model selection")


class RAGExplainResponse(BaseModel):
    """Response for RAG-enhanced explanation."""

    explanation: str
    model_used: str
    confidence: str  # HIGH, MEDIUM, LOW
    has_kb_context: bool
    similar_issues_count: int
    has_validated_solution: bool
    citations: list[str]
    disclaimer: Optional[str] = None
    processing_time_ms: float

router = APIRouter(prefix="/ai-enhanced", tags=["ai-enhanced"])

# Dependency to get the enhanced LLM service


async def get_enhanced_llm_service(
    client: httpx.AsyncClient = Depends(get_http_client),
) -> EnhancedLLMService:
    return EnhancedLLMService(client)


@router.get(
    "/models",
    response_model=ModelsResponse,
    summary="List available AI models",
    description="Returns a list of all available AI models and their status from various providers.",
)
async def list_models_endpoint(llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)):
    """List all available models from all providers."""
    return await llm_service.list_models()


@router.post(
    "/models/pull/{model_id}",
    response_model=Dict[str, Any],
    summary="Pull/download a model",
    description="Initiates download of a model. This is a non-blocking operation.",
)
async def pull_model_endpoint(
    model_id: str = Path(..., description="ID of the model to pull"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Pull/download a model from its provider."""
    return await llm_service.pull_model(model_id)


@router.post(
    "/models/select",
    response_model=Dict[str, Any],
    summary="Select active model",
    description="Sets the active model for future requests.",
)
async def select_model_endpoint(
    model_request: ModelRequest, llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service)
):
    """Set the active model."""
    return await llm_service.set_active_model(model_request.model_id)


@router.post(
    "/user/{user_id}/preferences",
    response_model=Dict[str, Any],
    summary="Set user model preferences",
    description="Sets a user's model preferences including primary and fallback models.",
)
async def set_user_preferences_endpoint(
    user_id: str = Path(..., description="User ID"),
    preferences: ModelPreferences = Body(..., description="User model preferences"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Set model preferences for a user."""
    return await llm_service.set_user_preferences(user_id, preferences)


@router.get(
    "/user/{user_id}/preferences",
    response_model=ModelPreferences,
    summary="Get user model preferences",
    description="Gets a user's model preferences including primary and fallback models.",
)
async def get_user_preferences_endpoint(
    user_id: str = Path(..., description="User ID"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Get model preferences for a user."""
    return await llm_service.get_user_preferences(user_id)


@router.post(
    "/fallback-chains",
    response_model=Dict[str, Any],
    summary="Create fallback chain",
    description="Creates a new fallback chain configuration.",
)
async def create_fallback_chain_endpoint(
    chain: FallbackChain = Body(..., description="Fallback chain to create"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Create a new fallback chain."""
    return await llm_service.create_fallback_chain(chain)


@router.post(
    "/fallback-chains/{chain_id}/set-default",
    response_model=Dict[str, Any],
    summary="Set default fallback chain",
    description="Sets the specified fallback chain as the default.",
)
async def set_default_fallback_chain_endpoint(
    chain_id: str = Path(..., description="ID of the fallback chain"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Set the default fallback chain."""
    return await llm_service.set_fallback_chain(chain_id, is_default=True)


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="Get AI Explanation for an Error",
    description="Receives error data and generates an explanation using AI. Supports multi-model fallback.",
)
@limit_ai_requests
async def explain_error_endpoint(
    request: Request,
    explain_request: ExplainRequest = Body(...),
    debug: bool = Query(False, description="Include debug information like prompts"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Get an AI-powered explanation for an error."""
    time.time()

    # Extract user ID from request if available
    user_id = explain_request.context.get("user_id") if explain_request.context else None

    # Get explanation
    result = await llm_service.get_explanation(
        event_data=explain_request.context.get("eventData", {}),
        override_model=explain_request.model,
        user_id=user_id,
        include_prompt=debug,
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
            "error": result.get("error"),
        }

    return response


# For backward compatibility with existing API
@router.get(
    "/models/legacy",
    summary="List available Ollama models (legacy format)",
    description="Returns a list of all available Ollama models in the old format.",
)
async def list_legacy_models_endpoint(
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """List all available Ollama models in the legacy format."""
    return await llm_service.get_legacy_models()


@router.post(
    "/providers/{provider}/config",
    summary="Set provider configuration",
    description="Updates configuration for a specific AI provider.",
)
async def set_provider_config_endpoint(
    provider: str = Path(..., description="Provider name (openai, anthropic, etc.)"),
    config: Dict[str, Any] = Body(..., description="Provider configuration settings"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Set configuration for a specific provider."""
    try:
        return await llm_service.set_provider_config(provider, config)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception(f"Error setting provider config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set provider config: {str(e)}",
        )


@router.post(
    "/providers/{provider}/test-connection",
    summary="Test provider connection",
    description="Tests connection to a provider API with provided credentials.",
)
async def test_provider_connection_endpoint(
    provider: str = Path(..., description="Provider name (openai, anthropic, etc.)"),
    request: Dict[str, Any] = Body(..., description="Connection test parameters including API key"),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Test connection to a provider API."""
    try:
        return await llm_service.test_provider_connection(provider, request)
    except Exception as e:
        logger.exception(f"Error testing provider connection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test provider connection: {str(e)}",
        )


@router.get(
    "/providers/availability",
    summary="Get provider availability",
    description="Returns availability status of all configured providers.",
)
async def get_provider_availability_endpoint(
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """Get availability status of all providers."""
    try:
        return await llm_service.get_provider_availability()
    except Exception as e:
        logger.exception(f"Error checking provider availability: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check provider availability: {str(e)}",
        )


# =============================================================================
# RAG-Enhanced Explanation Endpoints
# =============================================================================


async def check_knowledge_base_enabled():
    """Check if knowledge base is enabled."""
    settings = get_settings()
    if not getattr(settings, "ENABLE_KNOWLEDGE_BASE", False):
        raise HTTPException(
            status_code=503,
            detail="Knowledge base is disabled. Enable ENABLE_KNOWLEDGE_BASE in settings.",
        )


@router.post(
    "/explain/rag",
    response_model=RAGExplainResponse,
    summary="Get RAG-enhanced AI explanation",
    description="Generates an explanation using RAG (Retrieval-Augmented Generation) "
    "with context from the knowledge base.",
)
@limit_ai_requests
async def explain_with_rag_endpoint(
    request: Request,
    rag_request: RAGExplainRequest = Body(...),
    client: httpx.AsyncClient = Depends(get_http_client),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get a RAG-enhanced explanation for an error.

    This endpoint:
    1. Searches the knowledge base for similar past issues
    2. Builds a context-aware prompt with validated solutions
    3. Generates an explanation using the LLM
    4. Returns explanation with confidence level and citations
    """
    # Build error data dict
    error_data = {
        "type": rag_request.error_type,
        "value": rag_request.error_message,
        "platform": rag_request.platform or "unknown",
    }

    if rag_request.stack_frames:
        error_data["stack_frames"] = rag_request.stack_frames

    # Get explanation service
    explanation_service = get_explanation_service(client)

    try:
        result = await explanation_service.explain_error(
            error_data=error_data,
            use_knowledge_base=rag_request.use_knowledge_base,
            model_override=rag_request.model_override,
        )

        return RAGExplainResponse(
            explanation=result.explanation,
            model_used=result.model_used,
            confidence=result.confidence,
            has_kb_context=result.has_kb_context,
            similar_issues_count=result.similar_issues_count,
            has_validated_solution=result.has_validated_solution,
            citations=result.citations,
            disclaimer=result.disclaimer,
            processing_time_ms=result.processing_time_ms,
        )

    except Exception as e:
        logger.exception(f"Error generating RAG explanation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate explanation: {str(e)}",
        )


@router.post(
    "/explain/rag/simple",
    response_model=RAGExplainResponse,
    summary="Get RAG explanation (simple format)",
    description="Simplified endpoint for RAG explanation using just error type and message.",
)
@limit_ai_requests
async def explain_simple_with_rag_endpoint(
    request: Request,
    error_type: str = Query(..., description="Error type (e.g., ValueError)"),
    error_message: str = Query(..., description="Error message"),
    platform: Optional[str] = Query(None, description="Platform"),
    use_kb: bool = Query(True, description="Use knowledge base context"),
    client: httpx.AsyncClient = Depends(get_http_client),
    _: None = Depends(check_knowledge_base_enabled),
):
    """
    Get a RAG-enhanced explanation using simple query parameters.

    Convenience endpoint for quick error analysis.
    """
    explanation_service = get_explanation_service(client)

    try:
        result = await explanation_service.explain_simple(
            error_type=error_type,
            error_message=error_message,
            platform=platform,
            use_knowledge_base=use_kb,
        )

        return RAGExplainResponse(
            explanation=result.explanation,
            model_used=result.model_used,
            confidence=result.confidence,
            has_kb_context=result.has_kb_context,
            similar_issues_count=result.similar_issues_count,
            has_validated_solution=result.has_validated_solution,
            citations=result.citations,
            disclaimer=result.disclaimer,
            processing_time_ms=result.processing_time_ms,
        )

    except Exception as e:
        logger.exception(f"Error generating simple RAG explanation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate explanation: {str(e)}",
        )


@router.get(
    "/explain/rag/status",
    summary="Get RAG system status",
    description="Returns status of the RAG system including knowledge base stats.",
)
async def get_rag_status_endpoint(
    client: httpx.AsyncClient = Depends(get_http_client),
):
    """
    Get status of the RAG explanation system.

    Returns:
    - Knowledge base enabled status
    - Number of issues in KB
    - Number of validated solutions
    - Embeddings service status
    """
    settings = get_settings()
    kb_enabled = getattr(settings, "ENABLE_KNOWLEDGE_BASE", False)

    status_info = {
        "knowledge_base_enabled": kb_enabled,
        "rag_available": kb_enabled,
    }

    if kb_enabled:
        try:
            from app.services.retrieval_service import get_retrieval_service

            retrieval = get_retrieval_service()
            kb_stats = await retrieval.get_knowledge_base_stats()
            status_info["knowledge_base_stats"] = kb_stats
        except Exception as e:
            logger.warning(f"Could not get KB stats: {e}")
            status_info["knowledge_base_stats_error"] = str(e)

        try:
            from app.services.embeddings_service import get_embeddings_service

            embeddings = get_embeddings_service()
            status_info["embeddings_model"] = embeddings.model_name
            status_info["embeddings_dimension"] = embeddings.dimension
        except Exception as e:
            logger.warning(f"Could not get embeddings info: {e}")
            status_info["embeddings_error"] = str(e)

    return status_info


# =============================================================================
# AI Transparency & Quick Prompt Endpoints (EPIC Q)
# =============================================================================


@router.get(
    "/quick-prompts",
    response_model=List[QuickPromptType],
    summary="Get available quick prompt templates",
    description="Returns all available quick prompt templates for focused analysis.",
)
async def list_quick_prompts_endpoint():
    """
    Get all available quick prompt templates.

    Quick prompts allow users to re-analyze issues with specific focuses like:
    - Root cause analysis
    - Performance impact
    - Customer-facing explanation
    - Steps to reproduce
    - Similar patterns
    """
    quick_prompt_service = get_quick_prompt_service()
    return quick_prompt_service.get_all_prompts()


@router.post(
    "/analyze/quick-prompt",
    response_model=AnalysisResponse,
    summary="Analyze with quick prompt",
    description="Re-analyze an issue using a specific quick prompt template for focused analysis.",
)
@limit_ai_requests
async def analyze_with_quick_prompt_endpoint(
    request: Request,
    quick_prompt_req: QuickPromptRequest = Body(...),
    llm_service: EnhancedLLMService = Depends(get_enhanced_llm_service),
):
    """
    Analyze an issue with a specific quick prompt focus.

    This endpoint:
    1. Applies a pre-configured prompt template (root cause, performance, etc)
    2. Adjusts enrichment data prioritization based on the prompt type
    3. Returns analysis with full transparency information

    Args:
        quick_prompt_req: Quick prompt request with issue_id and prompt_type

    Returns:
        AnalysisResponse with full transparency and confidence information
    """
    start_time = time.time()

    # Get quick prompt service
    quick_prompt_service = get_quick_prompt_service()

    # Validate prompt type
    if not quick_prompt_service.validate_prompt_type(quick_prompt_req.prompt_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid prompt type: {quick_prompt_req.prompt_type}. "
            f"Available: {quick_prompt_service.get_prompt_types()}",
        )

    # Get the prompt template
    prompt_template = quick_prompt_service.get_prompt(quick_prompt_req.prompt_type)

    try:
        # TODO: In real implementation, fetch issue data and enrichment
        # For now, return a mock response with proper structure

        # Mock similar issues
        similar_issues = [
            SimilarIssueRef(
                id=12345,
                title="Similar error in production",
                similarity=0.89,
                project="web-app",
                status="unresolved",
            )
        ]

        # Mock model info
        model_info = ModelInfo(
            name="gpt-4",
            provider="openai",
            version="gpt-4-turbo-preview",
            context_window=128000,
        )

        # Compute confidence
        confidence_scorer = get_confidence_scorer()
        confidence_factors = confidence_scorer.compute_confidence_factors(
            similar_issues=similar_issues,
            enrichment_used=prompt_template.enrichment_priority[:3],
            enrichment_status={
                source: {"fetched_at": "2025-11-30T12:00:00Z"}
                for source in prompt_template.enrichment_priority[:3]
            },
        )

        overall_confidence = confidence_scorer.compute_overall_confidence(
            confidence_factors, len(similar_issues)
        )

        # Build transparency info
        transparency = TransparencyInfo(
            similar_issues_count=len(similar_issues),
            similar_issues=similar_issues,
            enrichment_sources_used=prompt_template.enrichment_priority[:3],
            enrichment_sources_stale=[],
            ranking_variant="multi-signal",
            model_info=model_info,
            confidence_factors=confidence_factors,
        )

        # Build sources
        sources = AnalysisSources(
            similar_issues=similar_issues,
            enrichment_data={},
            citations=[f"Issue #{issue.id}" for issue in similar_issues],
        )

        processing_time_ms = (time.time() - start_time) * 1000

        return AnalysisResponse(
            analysis=f"Analysis using {prompt_template.label} focus:\n\n"
            f"[This would contain the actual AI-generated analysis using the '{prompt_template.prompt_type}' prompt template]",
            confidence=overall_confidence,
            sources=sources,
            transparency=transparency,
            processing_time_ms=processing_time_ms,
        )

    except Exception as e:
        logger.exception(f"Error in quick prompt analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}",
        )


@router.get(
    "/analysis/{issue_id}/transparency",
    response_model=TransparencyInfo,
    summary="Get transparency info for analysis",
    description="Get detailed transparency information about how an analysis was performed.",
)
async def get_analysis_transparency_endpoint(
    issue_id: int = Path(..., description="Issue ID"),
):
    """
    Get transparency information for a specific analysis.

    This endpoint provides insight into:
    - Which similar issues were used
    - What enrichment data was included
    - How confidence was calculated
    - Which data sources were stale

    Useful for debugging and understanding AI decisions.
    """
    # TODO: In real implementation, fetch from analysis cache/database
    # For now, return mock data

    confidence_scorer = get_confidence_scorer()

    similar_issues = [
        SimilarIssueRef(
            id=issue_id - 1,
            title="Related error",
            similarity=0.85,
            project="backend",
            status="resolved",
        )
    ]

    confidence_factors = confidence_scorer.compute_confidence_factors(
        similar_issues=similar_issues,
        enrichment_used=["release_context", "performance_spans"],
        enrichment_status={
            "release_context": {"fetched_at": "2025-11-30T10:00:00Z"},
            "performance_spans": {"fetched_at": "2025-11-29T08:00:00Z"},
        },
    )

    return TransparencyInfo(
        similar_issues_count=len(similar_issues),
        similar_issues=similar_issues,
        enrichment_sources_used=["release_context", "performance_spans"],
        enrichment_sources_stale=["performance_spans"],
        ranking_variant="multi-signal",
        model_info=ModelInfo(
            name="gpt-4",
            provider="openai",
            version="gpt-4-turbo-preview",
        ),
        confidence_factors=confidence_factors,
    )
