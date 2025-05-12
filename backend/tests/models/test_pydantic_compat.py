"""
Tests for Pydantic compatibility utilities.
"""

import pytest
from pydantic import BaseModel, Field, ValidationError
from app.utils.pydantic_compat import (
    get_pydantic_version, pattern_field, config_class_factory, PYDANTIC_V2
)


def test_get_pydantic_version():
    """Test the version detection function."""
    version = get_pydantic_version()
    assert isinstance(version, int)
    assert version in (1, 2)


def test_pattern_field_validation():
    """Test pattern_field works for validation in both v1 and v2."""
    class TestModel(BaseModel):
        # Only allow alphanumeric
        value: str = pattern_field(r"^[a-zA-Z0-9]+$")
    
    # Valid value should pass
    model = TestModel(value="abc123")
    assert model.value == "abc123"
    
    # Invalid value should fail
    with pytest.raises(ValidationError):
        TestModel(value="abc@123")


def test_config_class_factory():
    """Test that config_class_factory works with both Pydantic versions."""
    
    class TestModel(BaseModel):
        name: str
        value: int
        
        # Use the factory to create config class or dict
        model_config = config_class_factory({
            "json_schema_extra": {
                "example": {
                    "name": "example",
                    "value": 42
                }
            }
        })
    
    # Create instance
    model = TestModel(name="test", value=123)
    
    # Get schema
    if PYDANTIC_V2:
        schema = TestModel.model_json_schema()
    else:
        schema = TestModel.schema()
    
    # Verify schema has example
    assert "example" in schema
    assert schema["example"]["name"] == "example"
    assert schema["example"]["value"] == 42


def test_serialization_cross_version():
    """Test that models can be serialized in both Pydantic versions."""
    class TestModel(BaseModel):
        name: str
        value: int
    
    model = TestModel(name="test", value=123)
    
    # Try v2 method first, fall back to v1
    try:
        data = model.model_dump()
    except AttributeError:
        data = model.dict()
    
    assert data["name"] == "test"
    assert data["value"] == 123
