"""
Error Clustering Service using Community Detection.

Based on: sentence-transformers/util.py community_detection()
Key advantage: No need to specify k (number of clusters) upfront.

This module provides automatic error grouping using semantic similarity,
discovering natural clusters without requiring pre-specification of
the number of clusters.
"""

import torch
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from sentence_transformers import util
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ClusterType(str, Enum):
    """Classification of error clusters."""
    RECURRING = "recurring"      # Multiple instances of same error (>=3)
    SIMILAR = "similar"          # Related errors, different root causes (2)
    OUTLIER = "outlier"          # Unique, unclustered errors (1)


@dataclass
class ErrorCluster:
    """Represents a cluster of similar errors."""
    cluster_id: int
    error_indices: List[int]
    cluster_type: ClusterType
    representative_index: int  # Most central error in cluster
    cohesion_score: float      # How tight the cluster is (0-1)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "cluster_id": self.cluster_id,
            "error_indices": self.error_indices,
            "cluster_type": self.cluster_type.value,
            "representative_index": self.representative_index,
            "cohesion_score": round(self.cohesion_score, 4),
            "size": len(self.error_indices)
        }


@dataclass
class ClusterSummary:
    """Summary information about a cluster for API responses."""
    cluster_id: int
    size: int
    cluster_type: str
    cohesion: float
    representative_error: str
    representative_message: str
    issue_ids: List[int]


class ClusteringService:
    """
    Clusters errors using community detection algorithm.

    This approach:
    1. Doesn't require specifying k (number of clusters)
    2. Naturally handles outliers (unclustered items)
    3. Uses similarity threshold instead of distance

    Usage:
        service = ClusteringService(threshold=0.75)
        clusters = service.cluster_errors(embeddings)
        similar = service.find_similar(query_embedding, corpus_embeddings)
    """

    def __init__(
        self,
        threshold: float = 0.75,
        min_community_size: int = 2,
        batch_size: int = 1024
    ):
        """
        Initialize clustering service.

        Args:
            threshold: Minimum cosine similarity to be in same cluster (0.0-1.0)
                      Higher = tighter clusters, fewer members
                      Lower = looser clusters, more members
            min_community_size: Minimum errors needed to form a cluster
            batch_size: Batch size for similarity computation
        """
        self.threshold = threshold
        self.min_community_size = min_community_size
        self.batch_size = batch_size
        logger.info(
            f"ClusteringService initialized: threshold={threshold}, "
            f"min_size={min_community_size}"
        )

    def cluster_errors(
        self,
        embeddings: List[List[float]],
        show_progress: bool = False
    ) -> List[ErrorCluster]:
        """
        Cluster errors using community detection.

        Args:
            embeddings: List of error embeddings (768-dim vectors for Jina)
            show_progress: Whether to show progress bar

        Returns:
            List of ErrorCluster objects, sorted by size (largest first)
        """
        if not embeddings:
            logger.debug("No embeddings provided for clustering")
            return []

        num_embeddings = len(embeddings)
        logger.info(f"Clustering {num_embeddings} embeddings")

        if num_embeddings < self.min_community_size:
            # Not enough errors to cluster - return all as outliers
            logger.debug(f"Too few embeddings ({num_embeddings}) for clustering")
            return [
                ErrorCluster(
                    cluster_id=i,
                    error_indices=[i],
                    cluster_type=ClusterType.OUTLIER,
                    representative_index=i,
                    cohesion_score=1.0
                )
                for i in range(num_embeddings)
            ]

        try:
            tensor = torch.tensor(embeddings, dtype=torch.float32)

            # Use sentence-transformers community detection
            communities = util.community_detection(
                tensor,
                threshold=self.threshold,
                min_community_size=self.min_community_size,
                batch_size=self.batch_size,
                show_progress_bar=show_progress
            )

            clusters = []
            clustered_indices = set()

            for idx, community in enumerate(communities):
                indices = list(community)
                clustered_indices.update(indices)

                # Find most central error (highest avg similarity to others)
                representative = self._find_representative(tensor, indices)

                # Calculate cluster cohesion
                cohesion = self._calculate_cohesion(tensor, indices)

                # Classify cluster type based on size
                if len(indices) >= 3:
                    cluster_type = ClusterType.RECURRING
                else:
                    cluster_type = ClusterType.SIMILAR

                clusters.append(ErrorCluster(
                    cluster_id=idx,
                    error_indices=indices,
                    cluster_type=cluster_type,
                    representative_index=representative,
                    cohesion_score=cohesion
                ))

            # Handle outliers (unclustered errors)
            all_indices = set(range(num_embeddings))
            outlier_indices = list(all_indices - clustered_indices)

            # Add each outlier as its own cluster
            for outlier_idx in outlier_indices:
                clusters.append(ErrorCluster(
                    cluster_id=len(clusters),
                    error_indices=[outlier_idx],
                    cluster_type=ClusterType.OUTLIER,
                    representative_index=outlier_idx,
                    cohesion_score=1.0  # Single item is perfectly cohesive
                ))

            # Sort by cluster size (largest first)
            clusters.sort(key=lambda c: len(c.error_indices), reverse=True)

            # Reassign cluster IDs after sorting
            for new_id, cluster in enumerate(clusters):
                cluster.cluster_id = new_id

            logger.info(
                f"Clustered {num_embeddings} errors into "
                f"{len(communities)} communities + {len(outlier_indices)} outliers"
            )

            return clusters

        except Exception as e:
            logger.error(f"Clustering failed: {e}", exc_info=True)
            # Return all as individual outlier clusters on failure
            return [
                ErrorCluster(
                    cluster_id=i,
                    error_indices=[i],
                    cluster_type=ClusterType.OUTLIER,
                    representative_index=i,
                    cohesion_score=0.0
                )
                for i in range(num_embeddings)
            ]

    def find_similar(
        self,
        query_embedding: List[float],
        corpus_embeddings: List[List[float]],
        top_k: int = 5,
        min_score: float = 0.5
    ) -> List[Tuple[int, float]]:
        """
        Find most similar errors to a query.

        Uses optimized semantic search from sentence-transformers.

        Args:
            query_embedding: Query error embedding
            corpus_embeddings: Corpus of error embeddings to search
            top_k: Number of results to return
            min_score: Minimum similarity score threshold

        Returns:
            List of (corpus_index, similarity_score) tuples, sorted by score desc
        """
        if not corpus_embeddings:
            return []

        if not query_embedding:
            logger.warning("Empty query embedding provided")
            return []

        try:
            query = torch.tensor([query_embedding], dtype=torch.float32)
            corpus = torch.tensor(corpus_embeddings, dtype=torch.float32)

            # Use sentence-transformers optimized search
            results = util.semantic_search(
                query,
                corpus,
                top_k=top_k,
                score_function=util.cos_sim
            )[0]  # First query's results

            # Filter by minimum score and convert to tuples
            filtered = [
                (int(r['corpus_id']), float(r['score']))
                for r in results
                if r['score'] >= min_score
            ]

            logger.debug(
                f"Found {len(filtered)} similar items "
                f"(top_k={top_k}, min_score={min_score})"
            )

            return filtered

        except Exception as e:
            logger.error(f"Similarity search failed: {e}", exc_info=True)
            return []

    def find_cluster_for_error(
        self,
        error_embedding: List[float],
        clusters: List[ErrorCluster],
        all_embeddings: List[List[float]],
        threshold: Optional[float] = None
    ) -> Optional[int]:
        """
        Find which existing cluster a new error belongs to.

        Args:
            error_embedding: Embedding of the new error
            clusters: Existing clusters
            all_embeddings: All embeddings that were clustered
            threshold: Similarity threshold (uses instance default if None)

        Returns:
            Cluster ID if found, None if should be new outlier
        """
        threshold = threshold or self.threshold

        if not clusters or not all_embeddings:
            return None

        try:
            query = torch.tensor([error_embedding], dtype=torch.float32)

            best_cluster = None
            best_score = threshold

            for cluster in clusters:
                if cluster.cluster_type == ClusterType.OUTLIER:
                    continue

                # Get representative embedding
                rep_embedding = all_embeddings[cluster.representative_index]
                rep_tensor = torch.tensor([rep_embedding], dtype=torch.float32)

                # Calculate similarity to representative
                similarity = util.cos_sim(query, rep_tensor)[0][0].item()

                if similarity > best_score:
                    best_score = similarity
                    best_cluster = cluster.cluster_id

            return best_cluster

        except Exception as e:
            logger.error(f"Cluster assignment failed: {e}", exc_info=True)
            return None

    def get_cluster_statistics(
        self,
        clusters: List[ErrorCluster]
    ) -> Dict[str, Any]:
        """
        Calculate statistics about the clustering result.

        Args:
            clusters: List of clusters

        Returns:
            Dictionary with clustering statistics
        """
        if not clusters:
            return {
                "total_clusters": 0,
                "total_items": 0,
                "recurring_clusters": 0,
                "similar_clusters": 0,
                "outliers": 0,
                "avg_cluster_size": 0,
                "max_cluster_size": 0,
                "avg_cohesion": 0
            }

        recurring = [c for c in clusters if c.cluster_type == ClusterType.RECURRING]
        similar = [c for c in clusters if c.cluster_type == ClusterType.SIMILAR]
        outliers = [c for c in clusters if c.cluster_type == ClusterType.OUTLIER]

        all_sizes = [len(c.error_indices) for c in clusters]
        non_outlier_cohesions = [
            c.cohesion_score for c in clusters
            if c.cluster_type != ClusterType.OUTLIER
        ]

        return {
            "total_clusters": len(clusters),
            "total_items": sum(all_sizes),
            "recurring_clusters": len(recurring),
            "similar_clusters": len(similar),
            "outliers": len(outliers),
            "avg_cluster_size": round(np.mean(all_sizes), 2) if all_sizes else 0,
            "max_cluster_size": max(all_sizes) if all_sizes else 0,
            "avg_cohesion": round(np.mean(non_outlier_cohesions), 4) if non_outlier_cohesions else 0,
            "recurring_items": sum(len(c.error_indices) for c in recurring),
            "similar_items": sum(len(c.error_indices) for c in similar)
        }

    def _find_representative(
        self,
        embeddings: torch.Tensor,
        indices: List[int]
    ) -> int:
        """Find the most central error in a cluster (medoid)."""
        if len(indices) == 1:
            return indices[0]

        cluster_embeddings = embeddings[indices]

        # Compute pairwise similarities
        similarities = util.cos_sim(cluster_embeddings, cluster_embeddings)

        # Average similarity for each item (excluding self)
        avg_sims = []
        for i in range(len(indices)):
            mask = torch.ones(len(indices), dtype=torch.bool)
            mask[i] = False
            avg_sim = similarities[i][mask].mean().item()
            avg_sims.append(avg_sim)

        # Return index of most central item (highest avg similarity)
        most_central_local = avg_sims.index(max(avg_sims))
        return indices[most_central_local]

    def _calculate_cohesion(
        self,
        embeddings: torch.Tensor,
        indices: List[int]
    ) -> float:
        """Calculate cluster cohesion (average pairwise similarity)."""
        if len(indices) <= 1:
            return 1.0

        cluster_embeddings = embeddings[indices]
        similarities = util.cos_sim(cluster_embeddings, cluster_embeddings)

        # Average of upper triangle (excluding diagonal)
        n = len(indices)
        upper_tri = similarities.triu(diagonal=1)
        num_pairs = n * (n - 1) / 2
        cohesion = upper_tri.sum().item() / num_pairs

        return float(cohesion)


# Singleton instance
_clustering_service: Optional[ClusteringService] = None


def get_clustering_service(
    threshold: float = 0.75,
    min_size: int = 2
) -> ClusteringService:
    """
    Get singleton clustering service.

    Args:
        threshold: Similarity threshold for clustering
        min_size: Minimum cluster size

    Returns:
        ClusteringService instance
    """
    global _clustering_service
    if _clustering_service is None:
        _clustering_service = ClusteringService(
            threshold=threshold,
            min_community_size=min_size
        )
    return _clustering_service


def reset_clustering_service() -> None:
    """Reset the singleton (useful for testing)."""
    global _clustering_service
    _clustering_service = None
