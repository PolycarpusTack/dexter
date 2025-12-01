"""
Tests for the Discover API endpoints
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_execute_discover_query():
    """Test executing a basic Discover query"""
    query = {
        "fields": [
            {"field": "count()"},
            {"field": "transaction"},
            {"field": "p95(transaction.duration)", "alias": "p95_duration"}
        ],
        "query": "transaction.duration:>1s",
        "orderby": "-count()",
        "statsPeriod": "24h",
        "limit": 50
    }
    
    response = client.post("/api/v1/discover/query", json=query)
    assert response.status_code == 200
    
    data = response.json()
    assert "data" in data
    assert "meta" in data
    assert "query" in data
    assert "executedAt" in data


def test_convert_natural_language_query():
    """Test converting natural language to Discover query"""
    nl_query = {
        "query": "Show me the slowest transactions in the last 24 hours"
    }
    
    response = client.post("/api/v1/discover/natural-language", json=nl_query)
    assert response.status_code == 200
    
    data = response.json()
    assert "fields" in data
    assert "query" in data
    assert len(data["fields"]) > 0


def test_get_available_fields():
    """Test getting available fields for queries"""
    response = client.get("/api/v1/discover/fields")
    assert response.status_code == 200
    
    fields = response.json()
    assert isinstance(fields, list)
    assert len(fields) > 0
    assert all("name" in field and "type" in field for field in fields)


def test_get_field_suggestions_with_partial():
    """Test field suggestions with partial matching"""
    response = client.get("/api/v1/discover/fields?partial=trans")
    assert response.status_code == 200
    
    fields = response.json()
    assert isinstance(fields, list)
    # Should return fields containing "trans" (like transaction)
    assert any("transaction" in field["name"] for field in fields)


def test_get_query_examples():
    """Test getting query examples"""
    response = client.get("/api/v1/discover/examples")
    assert response.status_code == 200
    
    examples = response.json()
    assert isinstance(examples, list)
    assert len(examples) > 0
    assert all("name" in ex and "description" in ex and "query" in ex for ex in examples)


def test_save_query():
    """Test saving a Discover query"""
    saved_query = {
        "name": "Test Query",
        "description": "A test Discover query",
        "query": {
            "fields": [{"field": "count()"}],
            "query": "level:error",
            "statsPeriod": "24h"
        },
        "isPublic": True,
        "tags": ["test", "example"]
    }
    
    response = client.post("/api/v1/discover/saved-queries", json=saved_query)
    assert response.status_code == 200
    
    data = response.json()
    assert data["name"] == saved_query["name"]
    assert data["description"] == saved_query["description"]
    assert "id" in data
    assert "createdAt" in data


def test_get_saved_queries():
    """Test retrieving saved queries"""
    response = client.get("/api/v1/discover/saved-queries")
    assert response.status_code == 200
    
    queries = response.json()
    assert isinstance(queries, list)


def test_get_saved_queries_with_filters():
    """Test retrieving saved queries with filters"""
    response = client.get("/api/v1/discover/saved-queries?isPublic=true&tags=performance")
    assert response.status_code == 200
    
    queries = response.json()
    assert isinstance(queries, list)
    # Results should be filtered appropriately
    for query in queries:
        if "isPublic" in query:
            assert query["isPublic"] == True
        if "tags" in query:
            assert "performance" in query["tags"]


def test_get_syntax_help():
    """Test getting query syntax help"""
    response = client.get("/api/v1/discover/syntax-help")
    assert response.status_code == 200
    
    help_data = response.json()
    assert "operators" in help_data
    assert "examples" in help_data
    assert "functions" in help_data
    assert "timeRanges" in help_data


def test_invalid_query():
    """Test handling of invalid query"""
    invalid_query = {
        "fields": [],  # Empty fields should be invalid
        "query": "invalid query syntax"
    }
    
    response = client.post("/api/v1/discover/query", json=invalid_query)
    assert response.status_code == 422  # Validation error


def test_query_with_time_range():
    """Test query with absolute time range"""
    query = {
        "fields": [{"field": "count()"}],
        "start": "2024-01-01T00:00:00",
        "end": "2024-01-31T23:59:59",
        "limit": 10
    }
    
    response = client.post("/api/v1/discover/query", json=query)
    assert response.status_code == 200


def test_query_with_pagination():
    """Test query with pagination cursor"""
    query = {
        "fields": [{"field": "count()"}],
        "statsPeriod": "7d",
        "limit": 10
    }
    
    response = client.post("/api/v1/discover/query", json=query)
    assert response.status_code == 200
    
    data = response.json()
    # Check if pagination info is present
    if "_pagination" in data:
        assert isinstance(data["_pagination"], dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
