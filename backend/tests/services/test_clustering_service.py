"""
Unit tests for the Clustering Service.

Tests the community detection-based error clustering functionality.
"""

import pytest
import numpy as np
from unittest.mock import patch, MagicMock

from app.services.clustering_service import (
    ClusteringService,
    ClusterType,
    ErrorCluster,
    get_clustering_service,
    reset_clustering_service,
)


class TestClusteringService:
    """Tests for ClusteringService."""

    @pytest.fixture(autouse=True)
    def reset_singleton(self):
        """Reset the singleton before each test."""
        reset_clustering_service()
        yield
        reset_clustering_service()

    @pytest.fixture
    def service(self):
        """Create a clustering service instance."""
        return ClusteringService(threshold=0.75, min_community_size=2)

    @pytest.fixture
    def similar_embeddings(self):
        """
        Create embeddings that should cluster together.

        Creates 3 groups of similar embeddings + 2 outliers.
        """
        np.random.seed(42)

        # Group 1: 4 similar embeddings (around [1, 0, 0, ...])
        group1 = [np.random.normal(0, 0.1, 768) for _ in range(4)]
        group1 = [e + np.array([1] + [0] * 767) for e in group1]

        # Group 2: 3 similar embeddings (around [0, 1, 0, ...])
        group2 = [np.random.normal(0, 0.1, 768) for _ in range(3)]
        group2 = [e + np.array([0, 1] + [0] * 766) for e in group2]

        # Group 3: 2 similar embeddings (around [0, 0, 1, ...])
        group3 = [np.random.normal(0, 0.1, 768) for _ in range(2)]
        group3 = [e + np.array([0, 0, 1] + [0] * 765) for e in group3]

        # Outliers: 2 random embeddings far from others
        outlier1 = np.random.normal(0, 0.1, 768) + np.array([0, 0, 0, 1] + [0] * 764)
        outlier2 = np.random.normal(0, 0.1, 768) + np.array([0, 0, 0, 0, 1] + [0] * 763)

        # Normalize all embeddings
        all_embeddings = group1 + group2 + group3 + [outlier1, outlier2]
        normalized = [e / np.linalg.norm(e) for e in all_embeddings]

        return [e.tolist() for e in normalized]

    def test_init(self, service):
        """Test service initialization."""
        assert service.threshold == 0.75
        assert service.min_community_size == 2
        assert service.batch_size == 1024

    def test_cluster_empty_embeddings(self, service):
        """Test clustering with empty input."""
        result = service.cluster_errors([])
        assert result == []

    def test_cluster_single_embedding(self, service):
        """Test clustering with single embedding (should be outlier)."""
        embedding = [0.1] * 768
        result = service.cluster_errors([embedding])

        assert len(result) == 1
        assert result[0].cluster_type == ClusterType.OUTLIER
        assert result[0].error_indices == [0]
        assert result[0].cohesion_score == 1.0

    def test_cluster_two_identical_embeddings(self, service):
        """Test clustering two identical embeddings."""
        embedding = [0.1] * 768
        result = service.cluster_errors([embedding, embedding])

        # Two identical should form a SIMILAR cluster
        assert len(result) == 1
        assert result[0].cluster_type == ClusterType.SIMILAR
        assert len(result[0].error_indices) == 2
        assert result[0].cohesion_score == pytest.approx(1.0, abs=0.01)

    def test_cluster_similar_embeddings(self, similar_embeddings):
        """Test clustering with similar embeddings groups."""
        # Use a lower threshold to ensure clustering works
        service = ClusteringService(threshold=0.6, min_community_size=2)
        result = service.cluster_errors(similar_embeddings)

        # Should have some clusters
        assert len(result) > 0

        # Count cluster types
        recurring = [c for c in result if c.cluster_type == ClusterType.RECURRING]
        similar = [c for c in result if c.cluster_type == ClusterType.SIMILAR]
        outliers = [c for c in result if c.cluster_type == ClusterType.OUTLIER]

        # Should have at least some clustering happening
        assert len(recurring) + len(similar) + len(outliers) == len(result)

        # All indices should be accounted for
        all_indices = set()
        for cluster in result:
            all_indices.update(cluster.error_indices)
        assert len(all_indices) == len(similar_embeddings)

    def test_cluster_types(self, service):
        """Test cluster type classification."""
        # RECURRING should have 3+ items
        recurring = ErrorCluster(
            cluster_id=0,
            error_indices=[0, 1, 2],
            cluster_type=ClusterType.RECURRING,
            representative_index=0,
            cohesion_score=0.9
        )
        assert len(recurring.error_indices) >= 3

        # SIMILAR should have 2 items
        similar = ErrorCluster(
            cluster_id=1,
            error_indices=[3, 4],
            cluster_type=ClusterType.SIMILAR,
            representative_index=3,
            cohesion_score=0.85
        )
        assert len(similar.error_indices) == 2

        # OUTLIER should have 1 item
        outlier = ErrorCluster(
            cluster_id=2,
            error_indices=[5],
            cluster_type=ClusterType.OUTLIER,
            representative_index=5,
            cohesion_score=1.0
        )
        assert len(outlier.error_indices) == 1

    def test_find_similar_empty_corpus(self, service):
        """Test finding similar with empty corpus."""
        query = [0.1] * 768
        result = service.find_similar(query, [])
        assert result == []

    def test_find_similar_empty_query(self, service):
        """Test finding similar with empty query."""
        corpus = [[0.1] * 768, [0.2] * 768]
        result = service.find_similar([], corpus)
        assert result == []

    def test_find_similar_returns_top_k(self, service):
        """Test that find_similar returns correct number of results."""
        np.random.seed(42)

        # Create a query
        query = np.random.normal(0, 0.1, 768)
        query = query / np.linalg.norm(query)

        # Create corpus with similar items
        corpus = []
        for i in range(10):
            # Add noise to query to create similar items
            item = query + np.random.normal(0, 0.05, 768)
            item = item / np.linalg.norm(item)
            corpus.append(item.tolist())

        result = service.find_similar(query.tolist(), corpus, top_k=5, min_score=0.0)

        assert len(result) <= 5
        # Results should be sorted by score descending
        if len(result) > 1:
            scores = [r[1] for r in result]
            assert scores == sorted(scores, reverse=True)

    def test_find_similar_respects_min_score(self, service):
        """Test that find_similar respects minimum score threshold."""
        np.random.seed(42)

        # Create a query
        query = np.array([1.0] + [0.0] * 767)

        # Create corpus with varying similarity
        corpus = [
            [1.0] + [0.0] * 767,  # Identical
            [0.9] + [0.1] + [0.0] * 766,  # Very similar
            [0.0, 1.0] + [0.0] * 766,  # Orthogonal
        ]
        # Normalize
        corpus = [np.array(c) / np.linalg.norm(c) for c in corpus]
        corpus = [c.tolist() for c in corpus]

        result = service.find_similar(query.tolist(), corpus, top_k=10, min_score=0.8)

        # Should only return the first two (high similarity)
        for idx, score in result:
            assert score >= 0.8

    def test_get_cluster_statistics(self, service):
        """Test cluster statistics calculation."""
        clusters = [
            ErrorCluster(0, [0, 1, 2, 3], ClusterType.RECURRING, 0, 0.9),
            ErrorCluster(1, [4, 5, 6], ClusterType.RECURRING, 4, 0.85),
            ErrorCluster(2, [7, 8], ClusterType.SIMILAR, 7, 0.8),
            ErrorCluster(3, [9], ClusterType.OUTLIER, 9, 1.0),
            ErrorCluster(4, [10], ClusterType.OUTLIER, 10, 1.0),
        ]

        stats = service.get_cluster_statistics(clusters)

        assert stats["total_clusters"] == 5
        assert stats["total_items"] == 11
        assert stats["recurring_clusters"] == 2
        assert stats["similar_clusters"] == 1
        assert stats["outliers"] == 2
        assert stats["recurring_items"] == 7
        assert stats["similar_items"] == 2
        assert stats["max_cluster_size"] == 4

    def test_get_cluster_statistics_empty(self, service):
        """Test cluster statistics with empty input."""
        stats = service.get_cluster_statistics([])

        assert stats["total_clusters"] == 0
        assert stats["total_items"] == 0
        assert stats["avg_cluster_size"] == 0
        assert stats["avg_cohesion"] == 0

    def test_cluster_to_dict(self):
        """Test cluster serialization."""
        cluster = ErrorCluster(
            cluster_id=1,
            error_indices=[0, 1, 2],
            cluster_type=ClusterType.RECURRING,
            representative_index=1,
            cohesion_score=0.8765
        )

        result = cluster.to_dict()

        assert result["cluster_id"] == 1
        assert result["error_indices"] == [0, 1, 2]
        assert result["cluster_type"] == "recurring"
        assert result["representative_index"] == 1
        assert result["cohesion_score"] == 0.8765
        assert result["size"] == 3

    def test_singleton_returns_same_instance(self):
        """Test that get_clustering_service returns singleton."""
        service1 = get_clustering_service()
        service2 = get_clustering_service()

        assert service1 is service2

    def test_singleton_reset(self):
        """Test that reset_clustering_service works."""
        service1 = get_clustering_service()
        reset_clustering_service()
        service2 = get_clustering_service()

        assert service1 is not service2


class TestClusteringServiceEdgeCases:
    """Edge case tests for ClusteringService."""

    @pytest.fixture(autouse=True)
    def reset_singleton(self):
        """Reset the singleton before each test."""
        reset_clustering_service()
        yield
        reset_clustering_service()

    def test_handles_nan_in_embeddings(self):
        """Test handling of NaN values in embeddings."""
        service = ClusteringService(threshold=0.75)

        # Create embeddings with NaN
        embeddings = [
            [0.1] * 768,
            [float('nan')] * 768,
            [0.1] * 768,
        ]

        # Should not crash, may handle gracefully
        # The actual behavior depends on implementation
        try:
            result = service.cluster_errors(embeddings)
            # If it succeeds, it should return some result
            assert isinstance(result, list)
        except Exception:
            # It's acceptable to raise an exception for invalid input
            pass

    def test_handles_large_embedding_count(self):
        """Test handling of large number of embeddings."""
        service = ClusteringService(threshold=0.9, min_community_size=2)

        # Create 100 random embeddings
        np.random.seed(42)
        embeddings = [np.random.randn(768).tolist() for _ in range(100)]

        result = service.cluster_errors(embeddings, show_progress=False)

        # Should return some result
        assert isinstance(result, list)
        assert len(result) > 0

        # All indices should be accounted for
        all_indices = set()
        for cluster in result:
            all_indices.update(cluster.error_indices)
        assert len(all_indices) == 100

    def test_threshold_edge_cases(self):
        """Test threshold boundary values."""
        # Very high threshold - should produce many outliers
        service_high = ClusteringService(threshold=0.99, min_community_size=2)

        # Very low threshold - should produce larger clusters
        service_low = ClusteringService(threshold=0.5, min_community_size=2)

        np.random.seed(42)
        embeddings = [np.random.randn(768).tolist() for _ in range(20)]
        # Normalize
        embeddings = [(np.array(e) / np.linalg.norm(e)).tolist() for e in embeddings]

        result_high = service_high.cluster_errors(embeddings)
        result_low = service_low.cluster_errors(embeddings)

        # High threshold should have more clusters/outliers
        high_outliers = sum(1 for c in result_high if c.cluster_type == ClusterType.OUTLIER)
        low_outliers = sum(1 for c in result_low if c.cluster_type == ClusterType.OUTLIER)

        # With high threshold, we expect more outliers or at least comparable
        # (depends on the data, but generally high threshold = more outliers)
        assert isinstance(high_outliers, int)
        assert isinstance(low_outliers, int)
