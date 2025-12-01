"""
RAG-Enhanced Explanation Service for Dexter.

Integrates knowledge base retrieval with LLM to provide
context-aware explanations for errors.
"""

import logging
import time
from typing import Any, Dict, Optional

import httpx
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.rag_prompt_builder import RAGPrompt, get_rag_prompt_builder
from app.services.retrieval_service import RetrievalResult, get_retrieval_service

# Phase 8: Custom metrics (optional import)
try:
    from app.metrics.custom_metrics import (
        AI_REQUESTS_TOTAL,
        AI_REQUEST_DURATION,
        ACTIVE_REQUESTS,
        record_cache_hit,
        record_cache_miss,
    )
    METRICS_AVAILABLE = True
except ImportError:
    METRICS_AVAILABLE = False

logger = logging.getLogger(__name__)


class ExplanationResult(BaseModel):
    """Result of an explanation request."""

    explanation: str
    model_used: str
    confidence: str  # HIGH, MEDIUM, LOW
    has_kb_context: bool = False
    similar_issues_count: int = 0
    has_validated_solution: bool = False
    citations: list[str] = Field(default_factory=list)
    disclaimer: Optional[str] = None
    processing_time_ms: float = 0
    tokens_used: Optional[Dict[str, int]] = None


class ExplanationService:
    """
    Service for generating RAG-enhanced explanations.

    Combines:
    1. Knowledge base retrieval (similar issues)
    2. RAG prompt building (context injection)
    3. LLM generation (explanation)
    4. Post-processing (citations, disclaimers)
    """

    def __init__(self, http_client: Optional[httpx.AsyncClient] = None):
        self._http_client = http_client
        self._settings = None
        self._retrieval = None
        self._prompt_builder = None

    @property
    def settings(self):
        """Lazy load settings."""
        if self._settings is None:
            self._settings = get_settings()
        return self._settings

    @property
    def retrieval_service(self):
        """Lazy load retrieval service."""
        if self._retrieval is None:
            self._retrieval = get_retrieval_service()
        return self._retrieval

    @property
    def prompt_builder(self):
        """Lazy load prompt builder."""
        if self._prompt_builder is None:
            self._prompt_builder = get_rag_prompt_builder()
        return self._prompt_builder

    async def explain_error(
        self,
        error_data: Dict[str, Any],
        use_knowledge_base: bool = True,
        model_override: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> ExplanationResult:
        """
        Generate an explanation for an error using RAG.

        Args:
            error_data: Error details (Sentry event format or simple dict)
            use_knowledge_base: Whether to use KB context
            model_override: Optional model to use
            user_id: Optional user ID for preferences

        Returns:
            ExplanationResult with explanation and metadata
        """
        start_time = time.time()
        retrieval_result: Optional[RetrievalResult] = None
        error_type = error_data.get("type", "unknown")
        status = "success"

        # Phase 8: Track active requests
        if METRICS_AVAILABLE:
            ACTIVE_REQUESTS.labels(endpoint_type="rag_explanation").inc()

        try:
            # Step 1: Retrieve similar issues from knowledge base
            if use_knowledge_base and self._is_kb_enabled():
                try:
                    retrieval_result = await self.retrieval_service.find_similar(
                        error_data=error_data,
                        limit=self.settings.MAX_SIMILAR_ISSUES,
                    )
                    logger.info(
                        f"KB retrieval: {len(retrieval_result.similar_issues)} similar issues, "
                        f"confidence={retrieval_result.confidence}"
                    )
                    # Phase 8: Track cache metrics
                    if METRICS_AVAILABLE:
                        if retrieval_result.similar_issues:
                            record_cache_hit("retrieval")
                        else:
                            record_cache_miss("retrieval")
                except Exception as e:
                    logger.warning(f"Knowledge base retrieval failed: {e}")
                    retrieval_result = None
                    if METRICS_AVAILABLE:
                        record_cache_miss("retrieval")

            # Step 2: Build RAG-enhanced prompt
            rag_prompt = self.prompt_builder.build_prompt(
                error_data=error_data,
                retrieval_result=retrieval_result,
            )

            # Step 3: Generate explanation via LLM
            explanation, model_used, tokens = await self._generate_explanation(
                rag_prompt=rag_prompt,
                model_override=model_override,
                user_id=user_id,
            )

            # Step 4: Post-process (add citations, disclaimers)
            explanation = self._post_process_explanation(
                explanation=explanation,
                rag_prompt=rag_prompt,
                retrieval_result=retrieval_result,
            )

            # Build citations list
            citations = self._extract_citations(retrieval_result)

            processing_time = (time.time() - start_time) * 1000

            return ExplanationResult(
                explanation=explanation,
                model_used=model_used,
                confidence=rag_prompt.confidence_level,
                has_kb_context=retrieval_result is not None and len(retrieval_result.similar_issues) > 0,
                similar_issues_count=rag_prompt.similar_issues_count,
                has_validated_solution=rag_prompt.has_validated_solution,
                citations=citations,
                disclaimer=rag_prompt.citation_requirement.disclaimer_text,
                processing_time_ms=processing_time,
                tokens_used=tokens,
            )

        except Exception as e:
            status = "error"
            logger.error(f"Explanation generation failed: {e}")
            raise

        finally:
            # Phase 8: Record metrics
            if METRICS_AVAILABLE:
                duration = time.time() - start_time
                ACTIVE_REQUESTS.labels(endpoint_type="rag_explanation").dec()
                AI_REQUESTS_TOTAL.labels(
                    model=model_override or "default",
                    status=status,
                    error_type=error_type
                ).inc()
                AI_REQUEST_DURATION.labels(
                    model=model_override or "default",
                    complexity="rag"
                ).observe(duration)

    async def explain_simple(
        self,
        error_type: str,
        error_message: str,
        platform: Optional[str] = None,
        use_knowledge_base: bool = True,
    ) -> ExplanationResult:
        """
        Generate explanation from simple error info.

        Convenience method for basic error data.
        """
        error_data = {
            "type": error_type,
            "value": error_message,
            "platform": platform or "unknown",
        }
        return await self.explain_error(
            error_data=error_data,
            use_knowledge_base=use_knowledge_base,
        )

    async def _generate_explanation(
        self,
        rag_prompt: RAGPrompt,
        model_override: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> tuple[str, str, Optional[Dict[str, int]]]:
        """
        Generate explanation using LLM service.

        Returns:
            Tuple of (explanation, model_used, tokens_dict)
        """
        # Try to use enhanced LLM service if available
        try:
            from app.services.enhanced_llm_service import EnhancedLLMService

            # Get or create HTTP client
            if self._http_client is None:
                self._http_client = httpx.AsyncClient()

            llm_service = EnhancedLLMService(self._http_client)

            # Build event data format for LLM service
            event_data = self._build_event_data_for_llm(rag_prompt)

            result = await llm_service.get_explanation(
                event_data=event_data,
                override_model=model_override,
                user_id=user_id,
            )

            return (
                result.get("explanation", ""),
                result.get("model", "unknown"),
                result.get("tokens"),
            )

        except ImportError:
            logger.warning("Enhanced LLM service not available, using basic service")
        except Exception as e:
            logger.warning(f"Enhanced LLM service failed: {e}, trying basic service")

        # Fallback to basic LLM service
        try:
            from app.services.llm_service import LLMService

            if self._http_client is None:
                self._http_client = httpx.AsyncClient()

            llm_service = LLMService(self._http_client)

            # Build event data for basic service
            event_data = self._build_event_data_for_llm(rag_prompt)

            explanation = await llm_service.get_explanation(
                event_data=event_data,
                override_model=model_override,
            )

            return explanation, llm_service.model, None

        except Exception as e:
            logger.error(f"LLM explanation generation failed: {e}")
            # Return a basic fallback explanation
            return self._get_fallback_explanation(rag_prompt), "fallback", None

    def _build_event_data_for_llm(self, rag_prompt: RAGPrompt) -> Dict[str, Any]:
        """
        Build event data structure for LLM service.

        The LLM service expects a Sentry-like event format.
        We inject our RAG context into the prompt.
        """
        # We'll pass a custom structure that the LLM service can handle
        # The key is to include our RAG-enhanced prompt
        return {
            "title": "Error Analysis Request",
            "level": "error",
            "platform": "rag-enhanced",
            "message": "",
            # Pass the full prompt as a special field
            "_rag_system_prompt": rag_prompt.system_prompt,
            "_rag_user_prompt": rag_prompt.user_prompt,
            "_rag_context_summary": rag_prompt.context_summary,
        }

    def _post_process_explanation(
        self,
        explanation: str,
        rag_prompt: RAGPrompt,
        retrieval_result: Optional[RetrievalResult],
    ) -> str:
        """
        Post-process the explanation.

        - Add citation references if required
        - Append disclaimer if needed
        """
        result = explanation

        # Add disclaimer if required and not already present
        if rag_prompt.citation_requirement.disclaimer_required:
            disclaimer = rag_prompt.citation_requirement.disclaimer_text
            if disclaimer and disclaimer not in result:
                result = f"{result}\n\n---\n{disclaimer}"

        return result

    def _extract_citations(
        self,
        retrieval_result: Optional[RetrievalResult],
    ) -> list[str]:
        """Extract citations from similar issues."""
        if not retrieval_result or not retrieval_result.similar_issues:
            return []

        citations = []
        for issue in retrieval_result.similar_issues[:3]:
            if issue.is_validated:
                citations.append(
                    f"Issue #{issue.id} ({issue.similarity_score:.0%} match, validated)"
                )
            elif issue.similarity_score > 0.7:
                citations.append(
                    f"Issue #{issue.id} ({issue.similarity_score:.0%} match)"
                )

        return citations

    def _get_fallback_explanation(self, rag_prompt: RAGPrompt) -> str:
        """Generate a basic fallback explanation when LLM fails."""
        # Extract error info from the prompt
        confidence = rag_prompt.confidence_level

        if confidence == "HIGH":
            return (
                "Based on similar past issues in our knowledge base, this error has been "
                "seen before. Please review the similar issues cited for validated solutions."
            )
        elif confidence == "MEDIUM":
            return (
                "This error has some similarity to past issues in our knowledge base. "
                "The suggested solutions from similar issues may be applicable."
            )
        else:
            return (
                "This is a new or unique error that doesn't closely match our knowledge base. "
                "Please analyze the error details and stack trace for diagnosis."
            )

    def _is_kb_enabled(self) -> bool:
        """Check if knowledge base is enabled."""
        return getattr(self.settings, "ENABLE_KNOWLEDGE_BASE", False)


# Singleton instance
_explanation_service: Optional[ExplanationService] = None


def get_explanation_service(
    http_client: Optional[httpx.AsyncClient] = None,
) -> ExplanationService:
    """Get singleton explanation service."""
    global _explanation_service
    if _explanation_service is None:
        _explanation_service = ExplanationService(http_client)
    return _explanation_service
