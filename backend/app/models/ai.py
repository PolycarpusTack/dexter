# File: backend/app/models/ai.py

"""
Pydantic models for AI-related endpoints.
"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from enum import Enum
from app.utils.pydantic_compat import config_class_factory

class ModelStatus(str, Enum):
    """Status of an Ollama model."""
    AVAILABLE = "available"  # Model is available and ready to use
    UNAVAILABLE = "unavailable"  # Model is not installed
    ERROR = "error"  # Error checking model status
    DOWNLOADING = "downloading"  # Model is currently being downloaded

class OllamaModel(BaseModel):
    """Model information from Ollama."""
    name: str
    status: ModelStatus
    size: Optional[int] = None  # Size in bytes
    modified_at: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ModelsResponse(BaseModel):
    """Response for the models endpoint."""
    models: List[OllamaModel]
    current_model: str
    ollama_status: ModelStatus
    error: Optional[str] = None

class ExplainRequest(BaseModel):
    """Request model for the explanation endpoint."""
    event_data: Optional[Dict[str, Any]] = None
    event_id: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = 0
    model: Optional[str] = None  # Optional model override
    
    model_config = config_class_factory({
        "json_schema_extra": {
            "example": {
                "event_data": {
                    "eventID": "12345abcde",
                    "title": "TypeError: Cannot read property 'foo' of undefined",
                    "platform": "javascript",
                    "level": "error",
                    "exception": {
                        "values": [
                            {
                                "type": "TypeError",
                                "value": "Cannot read property 'foo' of undefined"
                            }
                        ]
                    }
                }
            }
        }
    })

class ExplainResponse(BaseModel):
    """Response model from the explanation endpoint."""
    explanation: str = ""
    model_used: str
    error: Optional[str] = None
    is_generic: Optional[bool] = False
    
    model_config = config_class_factory({
        "json_schema_extra": {
            "example": {
                "explanation": "This error occurs when your code tries to access a property (in this case 'foo') of an object that is undefined. Check that the object exists before attempting to access its properties.",
                "model_used": "mistral:latest"
            }
        }
    })

class ModelSelectionRequest(BaseModel):
    """Request to change the active model."""
    model_name: str