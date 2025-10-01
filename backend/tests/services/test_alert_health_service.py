"""Tests for the Alert Health Service."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch

from app.services.alert_health_service import AlertHealthService
from app.models.alerts import (
    AlertHealthMetrics,
    AlertStormEvent,
    ThresholdRecommendation,
    RecommendationImpact,
)


@pytest.fixture
def mock_sentry_client():
    """Mock Sentry API client."""
    client = Mock()
    client.request = AsyncMock()
    return client


@pytest.fixture
def mock_cache_service():
    """Mock cache service."""
    cache = Mock()
    cache.get = AsyncMock(return_value=None)
    cache.set = AsyncMock()
    return cache


@pytest.fixture
def alert_health_service(mock_sentry_client, mock_cache_service):
    """Create alert health service with mocked dependencies."""
    return AlertHealthService(
        sentry_client=mock_sentry_client,
        cache_service=mock_cache_service
    )


class TestAlertHealthService:
    """Test cases for AlertHealthService."""
    
    async def test_calculate_health_metrics(self, alert_health_service, mock_sentry_client):
        """Test health metrics calculation."""
        # Mock Sentry API responses
        mock_sentry_client.request.side_effect = [
            # Alert rules response
            [
                {
                    "id": "rule_1",
                    "name": "Test Rule 1",
                    "status": "active",
                    "conditions": [{"threshold": 10}],
                }
            ],
            # Alert history response
            [
                {"rule": "rule_1", "createdAt": "2024-01-15T12:00:00Z"},
                {"rule": "rule_1", "createdAt": "2024-01-15T12:30:00Z"},
                {"rule": "rule_1", "createdAt": "2024-01-15T13:00:00Z"},
            ],
        ]
        
        # Calculate metrics
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 31)
        metrics = await alert_health_service.calculate_health_metrics(
            start_date=start_date,
            end_date=end_date,
            rule_ids=["rule_1"]
        )
        
        assert len(metrics) == 1
        assert metrics[0].rule_id == "rule_1"
        assert metrics[0].rule_name == "Test Rule 1"
        assert metrics[0].total_triggered_count == 3
    
    async def test_detect_alert_storms(self, alert_health_service, mock_sentry_client):
        """Test alert storm detection."""
        # Mock alert history with a storm pattern
        alert_times = []
        base_time = datetime(2024, 1, 15, 12, 0, 0)
        
        # Create a storm: 100 alerts in 30 minutes
        for i in range(100):
            alert_times.append({
                "rule": "rule_1",
                "createdAt": (base_time + timedelta(minutes=i/3.33)).isoformat() + "Z"
            })
        
        mock_sentry_client.request.return_value = alert_times
        
        # Detect storms
        storms = await alert_health_service.detect_alert_storms(
            start_date=base_time - timedelta(hours=1),
            end_date=base_time + timedelta(hours=1),
            min_alerts_threshold=50
        )
        
        assert len(storms) >= 1
        storm = storms[0]
        assert storm.total_alerts >= 50
        assert storm.duration_minutes <= 60
    
    async def test_generate_threshold_recommendations(self, alert_health_service):
        """Test threshold recommendation generation."""
        # Create metrics with high noise
        metrics = [
            AlertHealthMetrics(
                rule_id="rule_1",
                rule_name="Noisy Rule",
                total_triggered_count=1000,
                false_positive_rate=0.8,
                noise_level="high",
                noise_score=0.85,
                threshold_violations=500,
                current_threshold=10,
                peak_hour=14,
                peak_day_of_week=1,
            )
        ]
        
        # Generate recommendations
        recommendations = await alert_health_service.generate_threshold_recommendations(
            metrics=metrics,
            optimization_goal="noise_reduction"
        )
        
        assert len(recommendations) == 1
        rec = recommendations[0]
        assert rec.rule_id == "rule_1"
        assert rec.recommended_threshold > rec.current_threshold
        assert rec.confidence_score > 0.5
        assert rec.expected_impact.noise_reduction > 0
    
    async def test_get_dashboard_data(self, alert_health_service, mock_sentry_client):
        """Test dashboard data aggregation."""
        # Mock Sentry responses
        mock_sentry_client.request.side_effect = [
            # Alert rules
            [
                {"id": "rule_1", "name": "Rule 1", "status": "active"},
                {"id": "rule_2", "name": "Rule 2", "status": "active"},
            ],
            # Alert history
            [
                {"rule": "rule_1", "createdAt": "2024-01-15T12:00:00Z"},
                {"rule": "rule_2", "createdAt": "2024-01-15T12:30:00Z"},
            ],
        ]
        
        # Get dashboard data
        dashboard = await alert_health_service.get_dashboard_data(
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 31)
        )
        
        assert dashboard["total_rules"] == 2
        assert dashboard["active_rules"] == 2
        assert dashboard["total_alerts"] == 2
        assert dashboard["overall_health_score"] >= 0
        assert dashboard["overall_health_score"] <= 100
    
    def test_cache_key_generation(self, alert_health_service):
        """Test cache key generation for different operations."""
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 31)
        
        # Test metrics cache key
        key1 = alert_health_service._get_cache_key(
            "metrics",
            start_date,
            end_date,
            ["rule_1", "rule_2"]
        )
        assert "metrics" in key1
        assert "2024-01-01" in key1
        
        # Test storms cache key
        key2 = alert_health_service._get_cache_key(
            "storms",
            start_date,
            end_date,
            min_alerts=50
        )
        assert "storms" in key2
        assert "50" in key2
    
    async def test_error_handling(self, alert_health_service, mock_sentry_client):
        """Test error handling in the service."""
        # Mock API error
        mock_sentry_client.request.side_effect = Exception("API Error")
        
        # Should handle error gracefully
        metrics = await alert_health_service.calculate_health_metrics(
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 31)
        )
        
        assert metrics == []  # Should return empty list on error
    
    def test_storm_severity_calculation(self, alert_health_service):
        """Test storm severity calculation."""
        # Low severity storm
        low_storm = AlertStormEvent(
            storm_id="storm_1",
            start_time=datetime(2024, 1, 1, 12, 0),
            end_time=datetime(2024, 1, 1, 12, 30),
            duration_minutes=30,
            total_alerts=60,
            affected_rules={"rule_1"},
            severity="low",
            alerts_per_minute=2,
            peak_alerts_per_minute=5,
        )
        
        # High severity storm
        high_storm = AlertStormEvent(
            storm_id="storm_2",
            start_time=datetime(2024, 1, 1, 12, 0),
            end_time=datetime(2024, 1, 1, 13, 0),
            duration_minutes=60,
            total_alerts=1000,
            affected_rules={"rule_1", "rule_2", "rule_3"},
            severity="high",
            alerts_per_minute=16.67,
            peak_alerts_per_minute=50,
        )
        
        # Check severity calculation
        severity_dist = alert_health_service.get_storm_severity_distribution([low_storm, high_storm])
        
        assert severity_dist["low"] == 1
        assert severity_dist["high"] == 1
        assert severity_dist["medium"] == 0