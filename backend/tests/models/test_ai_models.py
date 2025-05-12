"""
Tests for AI-related Pydantic models.
Tests both validation and serialization behavior.
"""

import pytest
from pydantic import ValidationError
from app.models.ai import (
    ExplainRequest, ExplainResponse, 
    ModelStatus, OllamaModel, ModelsResponse
)


def test_model_status_enum():
    """Test the ModelStatus enum values."""
    assert ModelStatus.AVAILABLE == "available"
    assert ModelStatus.UNAVAILABLE == "unavailable"
    assert ModelStatus.ERROR == "error"  
    assert ModelStatus.DOWNLOADING == "downloading"


def test_ollama_model():
    """Test OllamaModel creation and validation."""
    # Valid model
    model = OllamaModel(
        name="mistral:latest",
        status=ModelStatus.AVAILABLE,
        size=1234567890
    )
    assert model.name == "mistral:latest"
    assert model.status == ModelStatus.AVAILABLE
    assert model.size == 1234567890
    assert model.error is None
    
    # Test invalid status
    with pytest.raises(ValidationError):
        OllamaModel(
            name="mistral:latest",
            status="invalid_status"
        )


def test_models_response():
    """Test ModelsResponse model."""
    response = ModelsResponse(
        models=[
            OllamaModel(name="mistral:latest", status=ModelStatus.AVAILABLE),
            OllamaModel(name="llama2:latest", status=ModelStatus.UNAVAILABLE)
        ],
        current_model="mistral:latest",
        ollama_status=ModelStatus.AVAILABLE
    )
    
    assert len(response.models) == 2
    assert response.current_model == "mistral:latest"
    assert response.ollama_status == ModelStatus.AVAILABLE
    assert response.error is None


def test_explain_request():
    """Test ExplainRequest model with various inputs."""
    # Test with event_data
    request = ExplainRequest(
        event_data={
            "eventID": "12345",
            "title": "Error: Something went wrong"
        }
    )
    assert request.event_data["eventID"] == "12345"
    assert request.event_id is None
    assert request.retry_count == 0
    
    # Test with event_id
    request = ExplainRequest(
        event_id="12345"
    )
    assert request.event_id == "12345"
    assert request.event_data is None
    
    # Test with error type and message
    request = ExplainRequest(
        error_type="TypeError",
        error_message="Cannot read property 'foo' of undefined"
    )
    assert request.error_type == "TypeError"
    assert request.error_message == "Cannot read property 'foo' of undefined"


def test_explain_response():
    """Test ExplainResponse serialization."""
    response = ExplainResponse(
        explanation="This error occurs when accessing a property of undefined",
        model_used="mistral:latest"
    )
    
    assert response.explanation == "This error occurs when accessing a property of undefined"
    assert response.model_used == "mistral:latest"
    assert response.is_generic is False
    assert response.error is None
    
    # Test serialization method based on Pydantic version
    try:
        # Try the v2 method first
        data = response.model_dump()
    except AttributeError:
        # Fall back to v1 method
        data = response.dict()
    
    assert "explanation" in data
    assert "model_used" in data
    assert data["explanation"] == "This error occurs when accessing a property of undefined"
