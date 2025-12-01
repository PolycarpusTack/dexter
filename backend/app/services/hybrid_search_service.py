"""
Hybrid Search Service combining vector and text search.

Based on: external/ntt_rag_project/sql/schema.sql
Uses Reciprocal Rank Fusion (RRF) to combine results.

This module provides hybrid search that:
- Combines semantic similarity (vector search)
- With keyword matching (full-text search)
- Using Reciprocal Rank Fusion for result merging
- Falls back gracefully when one method fails
"""

import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@dataclass
class HybridSearchResult:
    """Result from hybrid search."""
    issue_id: int
    error_type: str
    error_message: str
    vector_score: float
    text_score: float
    combined_score: float
    ai_explanation: Optional[str] = None
    human_solution: Optional[str] = None
    is_validated: bool = False
    sentry_issue_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "issue_id": self.issue_id,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "vector_score": round(self.vector_score, 4),
            "text_score": round(self.text_score, 4),
            "combined_score": round(self.combined_score, 4),
            "ai_explanation": self.ai_explanation,
            "human_solution": self.human_solution,
            "is_validated": self.is_validated,
            "sentry_issue_id": self.sentry_issue_id
        }


class HybridSearchService:
    """
    Combines vector similarity with full-text search.

    Uses Reciprocal Rank Fusion (RRF) to combine rankings:
    RRF(d) = Σ 1 / (k + rank(d))

    where k is a constant (default 60) that dampens the impact of rank.

    This approach:
    - Captures semantic similarity (what the error means)
    - Captures keyword matches (exact error codes, function names)
    - Handles cases where one method fails gracefully
    - Doesn't require tuning weights manually
    """

    def __init__(
        self,
        db_session: AsyncSession,
        k: int = 60,
        embedding_dimension: int = 768
    ):
        """
        Initialize hybrid search.

        Args:
            db_session: Database session
            k: RRF constant (default 60, standard value from literature)
            embedding_dimension: Dimension of embeddings (default 768 for Jina)
        """
        self.db = db_session
        self.k = k
        self.embedding_dimension = embedding_dimension

    async def search(
        self,
        query: str,
        query_embedding: Optional[List[float]] = None,
        limit: int = 10,
        vector_weight: float = 0.6,
        text_weight: float = 0.4,
        min_score: float = 0.0,
        error_type_filter: Optional[str] = None,
        platform_filter: Optional[str] = None,
        validated_only: bool = False
    ) -> List[HybridSearchResult]:
        """
        Perform hybrid search combining vector and text.

        Args:
            query: Search query text (error message, keywords, etc.)
            query_embedding: Pre-computed query embedding (optional)
            limit: Maximum results to return
            vector_weight: Weight for vector similarity in RRF (0-1)
            text_weight: Weight for text search in RRF (0-1)
            min_score: Minimum combined score threshold
            error_type_filter: Optional filter by error type
            platform_filter: Optional filter by platform
            validated_only: Only return validated issues

        Returns:
            List of HybridSearchResult, sorted by combined score
        """
        if query_embedding:
            return await self._hybrid_search(
                query=query,
                query_embedding=query_embedding,
                limit=limit,
                vector_weight=vector_weight,
                text_weight=text_weight,
                min_score=min_score,
                error_type_filter=error_type_filter,
                platform_filter=platform_filter,
                validated_only=validated_only
            )
        else:
            # Fall back to text-only search
            logger.info("No embedding provided, using text-only search")
            return await self._text_only_search(
                query=query,
                limit=limit,
                error_type_filter=error_type_filter,
                platform_filter=platform_filter,
                validated_only=validated_only
            )

    async def _hybrid_search(
        self,
        query: str,
        query_embedding: List[float],
        limit: int,
        vector_weight: float,
        text_weight: float,
        min_score: float,
        error_type_filter: Optional[str],
        platform_filter: Optional[str],
        validated_only: bool
    ) -> List[HybridSearchResult]:
        """Internal hybrid search implementation."""

        # Build WHERE clauses
        where_clauses = ["embedding IS NOT NULL"]
        params: Dict[str, Any] = {
            "query_embedding": str(query_embedding),
            "query_text": query,
            "limit": limit * 2,  # Get more than needed for RRF merging
            "vector_weight": vector_weight,
            "text_weight": text_weight,
            "k": self.k
        }

        if error_type_filter:
            where_clauses.append("error_type = :error_type")
            params["error_type"] = error_type_filter

        if platform_filter:
            where_clauses.append("platform = :platform")
            params["platform"] = platform_filter

        if validated_only:
            where_clauses.append("is_useful = TRUE")

        where_sql = " AND ".join(where_clauses)

        # Hybrid search query using RRF
        # The query structure:
        # 1. Get top vector results with ranks
        # 2. Get top text results with ranks
        # 3. Combine using weighted RRF formula
        sql = text(f"""
            WITH vector_results AS (
                SELECT
                    id,
                    1 - (embedding <=> :query_embedding::vector) as vector_score,
                    ROW_NUMBER() OVER (ORDER BY embedding <=> :query_embedding::vector) as vector_rank
                FROM sentry_issues
                WHERE {where_sql}
                ORDER BY embedding <=> :query_embedding::vector
                LIMIT :limit
            ),
            text_results AS (
                SELECT
                    id,
                    ts_rank(
                        to_tsvector('english', COALESCE(error_type, '') || ' ' || COALESCE(error_message, '')),
                        plainto_tsquery('english', :query_text)
                    ) as text_score,
                    ROW_NUMBER() OVER (
                        ORDER BY ts_rank(
                            to_tsvector('english', COALESCE(error_type, '') || ' ' || COALESCE(error_message, '')),
                            plainto_tsquery('english', :query_text)
                        ) DESC
                    ) as text_rank
                FROM sentry_issues
                WHERE {where_sql}
                    AND to_tsvector('english', COALESCE(error_type, '') || ' ' || COALESCE(error_message, ''))
                        @@ plainto_tsquery('english', :query_text)
                ORDER BY text_score DESC
                LIMIT :limit
            ),
            combined AS (
                SELECT
                    COALESCE(v.id, t.id) as id,
                    COALESCE(v.vector_score, 0) as vector_score,
                    COALESCE(t.text_score, 0) as text_score,
                    -- Weighted RRF formula: w1/(k + rank1) + w2/(k + rank2)
                    (
                        :vector_weight * COALESCE(1.0 / (:k + v.vector_rank), 0) +
                        :text_weight * COALESCE(1.0 / (:k + t.text_rank), 0)
                    ) as rrf_score
                FROM vector_results v
                FULL OUTER JOIN text_results t ON v.id = t.id
            )
            SELECT
                c.id,
                c.vector_score,
                c.text_score,
                c.rrf_score,
                s.sentry_issue_id,
                s.error_type,
                s.error_message,
                s.ai_explanation,
                s.human_solution,
                s.is_useful
            FROM combined c
            JOIN sentry_issues s ON c.id = s.id
            WHERE c.rrf_score > 0
            ORDER BY c.rrf_score DESC
            LIMIT :limit
        """)

        try:
            result = await self.db.execute(sql, params)
            rows = result.fetchall()

            results = [
                HybridSearchResult(
                    issue_id=row.id,
                    error_type=row.error_type or "",
                    error_message=row.error_message or "",
                    vector_score=float(row.vector_score) if row.vector_score else 0.0,
                    text_score=float(row.text_score) if row.text_score else 0.0,
                    combined_score=float(row.rrf_score) if row.rrf_score else 0.0,
                    ai_explanation=row.ai_explanation,
                    human_solution=row.human_solution,
                    is_validated=bool(row.is_useful),
                    sentry_issue_id=row.sentry_issue_id
                )
                for row in rows
                if (row.rrf_score or 0) >= min_score
            ]

            logger.info(
                f"Hybrid search returned {len(results)} results "
                f"(query_len={len(query)}, limit={limit})"
            )

            return results[:limit]

        except Exception as e:
            logger.error(f"Hybrid search failed: {e}", exc_info=True)
            # Fall back to text-only search on error
            logger.info("Falling back to text-only search")
            return await self._text_only_search(
                query=query,
                limit=limit,
                error_type_filter=error_type_filter,
                platform_filter=platform_filter,
                validated_only=validated_only
            )

    async def _text_only_search(
        self,
        query: str,
        limit: int,
        error_type_filter: Optional[str],
        platform_filter: Optional[str],
        validated_only: bool
    ) -> List[HybridSearchResult]:
        """Fallback to text-only search if vector search fails."""

        where_clauses = [
            "to_tsvector('english', COALESCE(error_type, '') || ' ' || COALESCE(error_message, '')) @@ plainto_tsquery('english', :query)"
        ]
        params: Dict[str, Any] = {"query": query, "limit": limit}

        if error_type_filter:
            where_clauses.append("error_type = :error_type")
            params["error_type"] = error_type_filter

        if platform_filter:
            where_clauses.append("platform = :platform")
            params["platform"] = platform_filter

        if validated_only:
            where_clauses.append("is_useful = TRUE")

        sql = text(f"""
            SELECT
                id,
                sentry_issue_id,
                error_type,
                error_message,
                ai_explanation,
                human_solution,
                is_useful,
                ts_rank(
                    to_tsvector('english', COALESCE(error_type, '') || ' ' || COALESCE(error_message, '')),
                    plainto_tsquery('english', :query)
                ) as text_score
            FROM sentry_issues
            WHERE {" AND ".join(where_clauses)}
            ORDER BY text_score DESC
            LIMIT :limit
        """)

        try:
            result = await self.db.execute(sql, params)
            rows = result.fetchall()

            results = [
                HybridSearchResult(
                    issue_id=row.id,
                    error_type=row.error_type or "",
                    error_message=row.error_message or "",
                    vector_score=0.0,
                    text_score=float(row.text_score) if row.text_score else 0.0,
                    combined_score=float(row.text_score) if row.text_score else 0.0,
                    ai_explanation=row.ai_explanation,
                    human_solution=row.human_solution,
                    is_validated=bool(row.is_useful),
                    sentry_issue_id=row.sentry_issue_id
                )
                for row in rows
            ]

            logger.info(f"Text-only search returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Text search failed: {e}", exc_info=True)
            return []

    async def vector_only_search(
        self,
        query_embedding: List[float],
        limit: int = 10,
        similarity_threshold: float = 0.7,
        error_type_filter: Optional[str] = None,
        platform_filter: Optional[str] = None,
        validated_only: bool = False
    ) -> List[HybridSearchResult]:
        """
        Perform vector-only search.

        Useful when you have pre-computed embeddings and want pure
        semantic similarity search.

        Args:
            query_embedding: Query embedding vector
            limit: Maximum results to return
            similarity_threshold: Minimum similarity score (0-1)
            error_type_filter: Optional filter by error type
            platform_filter: Optional filter by platform
            validated_only: Only return validated issues

        Returns:
            List of HybridSearchResult
        """
        where_clauses = [
            "embedding IS NOT NULL",
            "1 - (embedding <=> :query_embedding::vector) >= :threshold"
        ]
        params: Dict[str, Any] = {
            "query_embedding": str(query_embedding),
            "threshold": similarity_threshold,
            "limit": limit
        }

        if error_type_filter:
            where_clauses.append("error_type = :error_type")
            params["error_type"] = error_type_filter

        if platform_filter:
            where_clauses.append("platform = :platform")
            params["platform"] = platform_filter

        if validated_only:
            where_clauses.append("is_useful = TRUE")

        sql = text(f"""
            SELECT
                id,
                sentry_issue_id,
                error_type,
                error_message,
                ai_explanation,
                human_solution,
                is_useful,
                1 - (embedding <=> :query_embedding::vector) as similarity
            FROM sentry_issues
            WHERE {" AND ".join(where_clauses)}
            ORDER BY similarity DESC
            LIMIT :limit
        """)

        try:
            result = await self.db.execute(sql, params)
            rows = result.fetchall()

            return [
                HybridSearchResult(
                    issue_id=row.id,
                    error_type=row.error_type or "",
                    error_message=row.error_message or "",
                    vector_score=float(row.similarity) if row.similarity else 0.0,
                    text_score=0.0,
                    combined_score=float(row.similarity) if row.similarity else 0.0,
                    ai_explanation=row.ai_explanation,
                    human_solution=row.human_solution,
                    is_validated=bool(row.is_useful),
                    sentry_issue_id=row.sentry_issue_id
                )
                for row in rows
            ]

        except Exception as e:
            logger.error(f"Vector search failed: {e}", exc_info=True)
            return []


# Singleton instance
_hybrid_search_service: Optional[HybridSearchService] = None


def get_hybrid_search_service(db: AsyncSession) -> HybridSearchService:
    """
    Get hybrid search service instance.

    Note: This creates a new instance per call since it needs a db session.
    For request-scoped usage, inject directly.

    Args:
        db: Database session

    Returns:
        HybridSearchService instance
    """
    return HybridSearchService(db)
