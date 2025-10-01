"""
Tests for backend metrics endpoints.

These tests verify that the backend is correctly exposing Prometheus metrics
and that the metrics contain the expected data.
"""
import asyncio
import pytest
import httpx
import re
from unittest.mock import patch, MagicMock

# Import the app and testing utilities
from app.main import app
from fastapi.testclient import TestClient

# Create a test client
client = TestClient(app)

def test_metrics_endpoint_exists():
    """Test that the /metrics endpoint exists and returns 200 OK."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")

def test_metrics_endpoint_content():
    """Test that the /metrics endpoint returns Prometheus metrics format."""
    response = client.get("/metrics")
    metrics_text = response.text
    
    # Check for common Prometheus metric types
    assert "# HELP" in metrics_text, "Metrics should contain help text"
    assert "# TYPE" in metrics_text, "Metrics should contain type definitions"
    
    # Check for our custom metrics
    custom_metrics = [
        "http_requests_total",
        "http_request_duration_seconds",
        "http_requests_active",
        "system_cpu_usage_percent",
        "system_memory_usage_bytes",
        "system_disk_usage_bytes",
        "system_network_in_bytes_total",
        "system_network_out_bytes_total"
    ]
    
    for metric in custom_metrics:
        assert metric in metrics_text, f"Metrics should contain {metric}"

def test_system_metrics_available():
    """Test that system metrics are being exposed at the /metrics endpoint."""
    response = client.get("/metrics")
    metrics_text = response.text
    
    # System metrics should be available
    system_metrics = [
        "system_cpu_usage_percent",
        "system_memory_usage_bytes",
        "system_disk_usage_bytes"
    ]
    
    for metric in system_metrics:
        pattern = fr'{metric}\{{.*?\}} [0-9.]+'
        match = re.search(pattern, metrics_text)
        assert match is not None, f"System metric {metric} should be present with a value"

def test_http_request_metrics_incremented():
    """Test that HTTP request metrics are incremented when requests are made."""
    # First, get the current metrics
    initial_response = client.get("/metrics")
    initial_metrics = initial_response.text
    
    # Make a test request to an endpoint
    client.get("/health")
    
    # Get the metrics again
    final_response = client.get("/metrics")
    final_metrics = final_response.text
    
    # Extract the request counts
    initial_count_match = re.search(r'http_requests_total{.*?status="200".*?} ([0-9]+)', initial_metrics)
    final_count_match = re.search(r'http_requests_total{.*?status="200".*?} ([0-9]+)', final_metrics)
    
    if initial_count_match and final_count_match:
        initial_count = int(initial_count_match.group(1))
        final_count = int(final_count_match.group(1))
        assert final_count > initial_count, "HTTP request count should increment after making a request"
    else:
        assert False, "Could not find http_requests_total metric with status 200"

@pytest.mark.asyncio
async def test_system_health_endpoint_metrics():
    """Test that the system health endpoint includes all required metrics."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/system/health")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check structure and content
        assert "status" in data, "Health response should include overall status"
        assert "metrics" in data, "Health response should include metrics"
        assert "services" in data, "Health response should include services status"
        assert "timestamp" in data, "Health response should include timestamp"
        
        # Check metrics
        metrics = data["metrics"]
        assert len(metrics) >= 3, "Should have at least CPU, memory, and disk metrics"
        
        # Verify metric structure
        required_metric_fields = ["name", "value", "max", "unit", "status"]
        for metric in metrics:
            for field in required_metric_fields:
                assert field in metric, f"Metric should have {field} field"
            
            # Verify status values
            assert metric["status"] in ["healthy", "warning", "critical"], "Metric status should be valid"

@pytest.mark.asyncio
async def test_resource_usage_endpoint():
    """Test that resource usage endpoint returns correct data structure."""
    async with httpx.AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/system/resources")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check structure
        assert "cpu" in data, "Resource usage should include CPU data"
        assert "memory" in data, "Resource usage should include memory data"
        assert "memory_total" in data, "Resource usage should include total memory"
        assert "disk" in data, "Resource usage should include disk data"
        assert "disk_total" in data, "Resource usage should include total disk space"
        assert "network" in data, "Resource usage should include network data"
        
        # Check network data
        assert "in" in data["network"], "Network data should include incoming rate"
        assert "out" in data["network"], "Network data should include outgoing rate"
        
        # Check data types
        assert isinstance(data["cpu"], (int, float)), "CPU usage should be a number"
        assert isinstance(data["memory"], int), "Memory usage should be an integer"
        assert isinstance(data["disk"], int), "Disk usage should be an integer"
        assert isinstance(data["network"]["in"], (int, float)), "Network in rate should be a number"
        assert isinstance(data["network"]["out"], (int, float)), "Network out rate should be a number"

if __name__ == "__main__":
    # This allows running the tests directly with Python for debugging
    test_metrics_endpoint_exists()
    test_metrics_endpoint_content()
    test_system_metrics_available()
    test_http_request_metrics_incremented()
    print("Basic metrics tests passed!")
    
    # Async tests need to be run with pytest
    print("Run 'pytest tests/monitoring/test_metrics_endpoints.py' for async tests")