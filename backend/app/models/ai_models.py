# backend/app/models/ai_models.py

from enum import Enum
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field

class ModelProvider(str, Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"
    HUGGINGFACE = "huggingface"
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"

class ModelStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    DOWNLOADING = "downloading"
    ERROR = "error"

class ModelCapability(str, Enum):
    CODE = "code"
    TEXT = "text"
    VISION = "vision"
    STRUCTURED = "structured"
    MULTILINGUAL = "multilingual"

class ModelSize(str, Enum):
    TINY = "tiny"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    XLARGE = "xlarge"

class ModelParameters(BaseModel):
    temperature: Optional[float] = Field(0.7, description="Controls randomness. Lower values more deterministic.")
    top_p: Optional[float] = Field(0.9, description="Controls diversity. Lower values more focused.")
    max_tokens: Optional[int] = Field(2048, description="Maximum number of tokens to generate.")
    frequency_penalty: Optional[float] = Field(0, description="Reduces repetition of token sequences.")
    presence_penalty: Optional[float] = Field(0, description="Reduces repetition of topics.")
    stop_sequences: Optional[List[str]] = Field(None, description="Sequences that stop generation.")

class ModelPreferences(BaseModel):
    primary_model: str = Field(..., description="User's preferred primary model")
    fallback_models: List[str] = Field(default_factory=list, description="Ordered list of fallback models")
    parameters: Optional[Dict[str, ModelParameters]] = Field(default_factory=dict, description="Model-specific parameters")
    default_parameters: Optional[ModelParameters] = Field(
        default=ModelParameters(),
        description="Default parameters for all models"
    )

class ModelMetrics(BaseModel):
    avg_response_time: Optional[float] = None
    success_rate: Optional[float] = None
    usage_count: Optional[int] = 0
    last_used: Optional[str] = None
    error_count: Optional[int] = 0

class Model(BaseModel):
    id: str = Field(..., description="Unique identifier for the model")
    name: str = Field(..., description="Display name of the model")
    provider: ModelProvider = Field(..., description="The provider of this model")
    status: ModelStatus = Field(ModelStatus.UNAVAILABLE, description="Current status of the model")
    capabilities: List[ModelCapability] = Field(default_factory=list, description="Model capabilities")
    size: ModelSize = Field(ModelSize.MEDIUM, description="Size category of the model")
    size_mb: Optional[int] = None
    description: Optional[str] = None
    version: Optional[str] = None
    parameters: ModelParameters = Field(default_factory=ModelParameters, description="Default parameters for this model")
    metrics: Optional[ModelMetrics] = Field(default_factory=ModelMetrics, description="Usage metrics for this model")
    error: Optional[str] = None
    tags: List[str] = Field(default_factory=list, description="Tags for categorizing models")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional provider-specific metadata")

class ModelGroup(BaseModel):
    name: str
    models: List[Model]
    description: Optional[str] = None

class FallbackChain(BaseModel):
    name: str = Field(..., description="Name of this fallback chain")
    models: List[str] = Field(..., description="Ordered list of model IDs to try")
    description: Optional[str] = None
    is_default: bool = False

class ProviderSettings(BaseModel):
    provider: ModelProvider
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    timeout: int = 60
    headers: Optional[Dict[str, str]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional provider-specific settings")

class ModelsResponse(BaseModel):
    models: List[Model] = Field(default_factory=list, description="List of all available models")
    groups: Optional[List[ModelGroup]] = Field(default_factory=list, description="Grouped models by category")
    fallback_chains: Optional[List[FallbackChain]] = Field(default_factory=list, description="Available fallback chains")
    current_model: Optional[str] = None
    current_fallback_chain: Optional[str] = None
    providers: List[ModelProvider] = Field(default_factory=list, description="Available providers")
    status: Dict[str, Any] = Field(default_factory=dict, description="Status information")
    
class ModelRequest(BaseModel):
    model_id: str = Field(..., description="ID of the model to use")
    fallback_chain_id: Optional[str] = Field(None, description="ID of fallback chain to use if specified")
    parameters: Optional[ModelParameters] = None
    
    model_config = {
        "protected_namespaces": ()
    }

class ModelResponse(BaseModel):
    model: Model
    status: str
    message: str