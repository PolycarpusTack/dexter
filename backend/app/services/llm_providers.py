# backend/app/services/llm_providers.py

import httpx
import logging
import json
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from fastapi import HTTPException, status
import time
from datetime import datetime

from app.core.config import get_settings
from app.config.providers.openai import get_openai_config, OpenAIConfig
from app.config.providers.anthropic import get_anthropic_config, AnthropicConfig
from app.models.ai_models import (
    Model,
    ModelProvider,
    ModelStatus,
    ModelCapability,
    ModelParameters,
    ProviderSettings,
    ModelSize
)
from app.services.model_registry_service import ModelRegistry, get_model_registry

logger = logging.getLogger(__name__)

class LLMProviderInterface(ABC):
    """Abstract interface for LLM providers"""
    
    @abstractmethod
    async def list_models(self) -> List[Model]:
        """List all available models from this provider"""
        pass
        
    @abstractmethod
    async def get_model(self, model_id: str) -> Optional[Model]:
        """Get a specific model by ID"""
        pass
        
    @abstractmethod
    async def pull_model(self, model_id: str) -> Dict[str, Any]:
        """Pull/download a model (if supported)"""
        pass
        
    @abstractmethod
    async def generate_response(self, 
                               model_id: str, 
                               prompt: str, 
                               parameters: Optional[ModelParameters] = None) -> str:
        """Generate a response using the specified model"""
        pass
        
    @abstractmethod
    async def check_availability(self) -> bool:
        """Check if the provider is available"""
        pass

class OllamaProvider(LLMProviderInterface):
    """Implementation of LLMProviderInterface for Ollama"""
    
    def __init__(self, client: httpx.AsyncClient, settings: ProviderSettings):
        self.client = client
        self.settings = settings
        self.base_url = settings.base_url.rstrip('/')
        self.timeout = settings.timeout
        self.model_registry = get_model_registry()
        
        # Map of Ollama model names to standardized capabilities
        # This could be enhanced with more accurate mapping based on model families
        self.capability_mapping = {
            "codellama": [ModelCapability.CODE, ModelCapability.TEXT],
            "llama-code": [ModelCapability.CODE, ModelCapability.TEXT],
            "starcoder": [ModelCapability.CODE],
            "mistral": [ModelCapability.TEXT],
            "llama3": [ModelCapability.TEXT, ModelCapability.STRUCTURED],
            "llama2": [ModelCapability.TEXT],
            "phi3": [ModelCapability.TEXT, ModelCapability.CODE],
            "phi2": [ModelCapability.TEXT],
            "gemma": [ModelCapability.TEXT],
            "orca-mini": [ModelCapability.TEXT],
            "vicuna": [ModelCapability.TEXT],
            "mixtral": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL],
        }
        
        # Map of model families to size categories
        self.size_mapping = {
            "llama3:8b": ModelSize.SMALL,
            "llama3:70b": ModelSize.XLARGE,
            "llama2:7b": ModelSize.SMALL,
            "llama2:13b": ModelSize.MEDIUM,
            "llama2:70b": ModelSize.XLARGE,
            "mistral:7b": ModelSize.SMALL,
            "mistral:instruct": ModelSize.SMALL,
            "mistral:latest": ModelSize.SMALL,
            "mixtral:8x7b": ModelSize.LARGE,
            "mixtral:8x22b": ModelSize.XLARGE,
            "codellama:7b": ModelSize.SMALL,
            "codellama:13b": ModelSize.MEDIUM,
            "codellama:34b": ModelSize.LARGE,
            "phi3:mini": ModelSize.SMALL,
            "phi3:small": ModelSize.SMALL,
            "phi3:medium": ModelSize.MEDIUM,
            "phi2": ModelSize.SMALL,
            "gemma:2b": ModelSize.TINY,
            "gemma:7b": ModelSize.SMALL,
            "orca-mini:3b": ModelSize.TINY,
            "orca-mini:7b": ModelSize.SMALL,
            "vicuna:7b": ModelSize.SMALL,
            "vicuna:13b": ModelSize.MEDIUM,
        }
        
        logger.info(f"Initialized Ollama provider with base URL: {self.base_url}")
        
    def _infer_model_capabilities(self, model_name: str) -> List[ModelCapability]:
        """Infer model capabilities based on name"""
        capabilities = []
        
        # Check for exact matches in our mapping
        for prefix, caps in self.capability_mapping.items():
            if model_name.startswith(prefix):
                capabilities.extend(caps)
                
        # Default capability if nothing else matched
        if not capabilities:
            capabilities = [ModelCapability.TEXT]
            
        # Remove duplicates
        return list(set(capabilities))
        
    def _infer_model_size(self, model_name: str, size_bytes: Optional[int] = None) -> ModelSize:
        """Infer model size category based on name and/or size"""
        # Check for exact matches in our mapping
        for pattern, size in self.size_mapping.items():
            if model_name == pattern or (
                ":" in pattern and 
                model_name.startswith(pattern.split(":")[0]) and
                pattern.split(":")[1] in model_name
            ):
                return size
                
        # If we have size in bytes, use that as fallback
        if size_bytes:
            if size_bytes < 5 * 1024 * 1024 * 1024:  # < 5GB
                return ModelSize.TINY
            elif size_bytes < 10 * 1024 * 1024 * 1024:  # < 10GB
                return ModelSize.SMALL
            elif size_bytes < 25 * 1024 * 1024 * 1024:  # < 25GB
                return ModelSize.MEDIUM
            elif size_bytes < 50 * 1024 * 1024 * 1024:  # < 50GB
                return ModelSize.LARGE
            else:
                return ModelSize.XLARGE
                
        # Default size if we couldn't determine it
        return ModelSize.MEDIUM
        
    def _create_model_from_ollama(self, ollama_model: Dict[str, Any]) -> Model:
        """Convert Ollama API model format to our Model format"""
        model_name = ollama_model.get("name", "unknown")
        
        # Calculate size in MB if available
        size_mb = None
        if "size" in ollama_model and isinstance(ollama_model["size"], int):
            size_mb = ollama_model["size"] // (1024 * 1024)  # Convert bytes to MB
            
        # Create standardized model object
        model = Model(
            id=model_name,  # Use name as ID for Ollama models
            name=model_name,
            provider=ModelProvider.OLLAMA,
            status=ModelStatus.AVAILABLE,
            capabilities=self._infer_model_capabilities(model_name),
            size=self._infer_model_size(model_name, ollama_model.get("size")),
            size_mb=size_mb,
            version=ollama_model.get("modified_at", None),
            description=None,  # Ollama doesn't provide descriptions
            metadata=ollama_model
        )
        
        return model
        
    async def list_models(self) -> List[Model]:
        """List all available models from Ollama"""
        models = []
        
        try:
            # Check Ollama server connectivity
            logger.info(f"Checking Ollama server status at {self.base_url}")
            response = await self.client.get(f"{self.base_url}/api/version", timeout=5.0)
            response.raise_for_status()
            
            # Get list of available models
            models_response = await self.client.get(f"{self.base_url}/api/tags", timeout=10.0)
            models_response.raise_for_status()
            
            # Process model list
            models_data = models_response.json()
            if "models" in models_data and isinstance(models_data["models"], list):
                for ollama_model in models_data["models"]:
                    model = self._create_model_from_ollama(ollama_model)
                    models.append(model)
                    
            # Add recommended models that aren't installed
            # Common Ollama models to suggest if none are found
            RECOMMENDED_MODELS = [
                "mistral", 
                "mistral:latest", 
                "llama3", 
                "llama3:latest", 
                "codellama", 
                "gemma:latest",
                "phi3:latest",
                "mixtral:latest"
            ]
            
            installed_model_names = [model.id for model in models]
            for recommended_model in RECOMMENDED_MODELS:
                if recommended_model not in installed_model_names:
                    models.append(
                        Model(
                            id=recommended_model,
                            name=recommended_model,
                            provider=ModelProvider.OLLAMA,
                            status=ModelStatus.UNAVAILABLE,
                            capabilities=self._infer_model_capabilities(recommended_model),
                            size=self._infer_model_size(recommended_model)
                        )
                    )
            
        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to Ollama at {self.base_url}")
            
            # Add recommended models in offline mode
            for model_name in RECOMMENDED_MODELS:
                models.append(
                    Model(
                        id=model_name,
                        name=model_name,
                        provider=ModelProvider.OLLAMA,
                        status=ModelStatus.UNAVAILABLE,
                        capabilities=self._infer_model_capabilities(model_name),
                        size=self._infer_model_size(model_name),
                        error="Ollama server unavailable."
                    )
                )
                
        except httpx.RequestError as e:
            logger.error(f"Error connecting to Ollama at {self.base_url}: {e}")
            
            # Add recommended models in offline mode
            for model_name in RECOMMENDED_MODELS:
                models.append(
                    Model(
                        id=model_name,
                        name=model_name,
                        provider=ModelProvider.OLLAMA,
                        status=ModelStatus.UNAVAILABLE,
                        capabilities=self._infer_model_capabilities(model_name),
                        size=self._infer_model_size(model_name),
                        error=f"Ollama server error: {str(e)}"
                    )
                )
                
        except Exception as e:
            logger.exception(f"Unexpected error checking Ollama models: {e}")
            
            # Add recommended models in offline mode
            for model_name in RECOMMENDED_MODELS:
                models.append(
                    Model(
                        id=model_name,
                        name=model_name,
                        provider=ModelProvider.OLLAMA,
                        status=ModelStatus.UNAVAILABLE,
                        capabilities=self._infer_model_capabilities(model_name),
                        size=self._infer_model_size(model_name),
                        error=f"Unexpected error: {str(e)}"
                    )
                )
                
        return models
        
    async def get_model(self, model_id: str) -> Optional[Model]:
        """Get a specific model by ID from Ollama"""
        models = await self.list_models()
        for model in models:
            if model.id == model_id:
                return model
        return None
        
    async def pull_model(self, model_id: str) -> Dict[str, Any]:
        """Pull/download a model from Ollama"""
        try:
            logger.info(f"Initiating pull for model {model_id}")
            # This is a non-blocking call, as model pulling can take a long time
            response = await self.client.post(
                f"{self.base_url}/api/pull", 
                json={"name": model_id},
                timeout=10.0  # Just for initial request, not the full download
            )
            response.raise_for_status()
            
            # Update model status in registry
            self.model_registry.update_model_status(
                model_id, 
                ModelStatus.DOWNLOADING
            )
            
            # Return a status indication
            return {
                "status": "downloading",
                "message": f"Started downloading model: {model_id}. Check status later.",
                "name": model_id,
                "estimated_time": self._estimate_download_time(model_id)
            }
            
        except Exception as e:
            logger.exception(f"Error initiating model pull: {e}")
            
            # Update model status in registry
            self.model_registry.update_model_status(
                model_id, 
                ModelStatus.ERROR,
                str(e)
            )
            
            return {
                "status": "error",
                "message": f"Failed to start model download: {str(e)}",
                "name": model_id
            }
            
    def _estimate_download_time(self, model_name: str) -> str:
        """Provide a rough estimate of download time based on model name."""
        # These are very rough estimates and will vary greatly by connection speed
        if "mixtral" in model_name:
            return "30-60 minutes"
        elif "llama3" in model_name:
            return "15-30 minutes"
        elif "codellama" in model_name:
            return "20-40 minutes"
        elif "phi3" in model_name or "mistral" in model_name or "gemma" in model_name:
            return "10-20 minutes"
        else:
            return "10-60 minutes"
            
    async def generate_response(self, 
                               model_id: str, 
                               prompt: str, 
                               parameters: Optional[ModelParameters] = None) -> str:
        """Generate a response using the specified Ollama model"""
        
        # Use default parameters if none provided
        if parameters is None:
            parameters = ModelParameters()
            
        # Prepare Ollama API payload
        ollama_api_url = f"{self.base_url}/api/generate"
        payload = {
            "model": model_id,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": parameters.temperature,
                "top_p": parameters.top_p,
                "num_predict": parameters.max_tokens,
                # Ollama doesn't have direct equivalents for these parameters
                # but we could approximate them in the future
            }
        }
        
        # Add stop sequences if specified
        if parameters.stop_sequences:
            payload["options"]["stop"] = parameters.stop_sequences
            
        start_time = time.time()
        
        try:
            logger.info(f"Sending request to Ollama ({ollama_api_url}) using model: {model_id}")
            response = await self.client.post(
                ollama_api_url, 
                json=payload, 
                timeout=float(self.timeout)
            )
            response.raise_for_status()  # Check for 4xx/5xx errors
            
            end_time = time.time()
            response_time = end_time - start_time
            
            # Update model metrics
            self.model_registry.update_model_metrics(
                model_id,
                response_time=response_time,
                success=True
            )
            
            # Safely parse JSON
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                logger.error(f"Ollama returned non-JSON response ({response.status_code}). Response text: {response.text[:500]}")
                
                # Update error metrics
                self.model_registry.update_model_metrics(
                    model_id,
                    success=False
                )
                
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY, 
                    detail="LLM service returned invalid response."
                )
                
            explanation = response_data.get("response", "").strip()
            
            if response_data.get("error"):
                # Ollama might return 200 OK but include an error in the JSON body
                ollama_error = response_data["error"]
                logger.error(f"Ollama returned error in successful response body: {ollama_error}")
                
                # Update error metrics
                self.model_registry.update_model_metrics(
                    model_id,
                    success=False
                )
                
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY, 
                    detail=f"LLM service error: {ollama_error}"
                )
                
            if not explanation:
                logger.warning(f"Ollama returned an empty response.")
                
                # Update error metrics
                self.model_registry.update_model_metrics(
                    model_id,
                    success=False
                )
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                    detail="LLM returned an empty response."
                )
                
            return explanation
            
        except httpx.TimeoutException as e:
            logger.error(f"Ollama API request timed out after {self.timeout}s: {e}")
            
            # Update error metrics
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT, 
                detail=f"Request to LLM service timed out after {self.timeout} seconds. Try a smaller model or increase the timeout."
            )
            
        except httpx.RequestError as e:
            # Connection errors - likely Ollama is not running
            logger.error(f"Ollama API connection error: {e}")
            
            # Update error metrics
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            
            # Special handling for common connection issues
            if isinstance(e, httpx.ConnectError):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                    detail=f"Could not connect to LLM service (Ollama). Make sure Ollama is running at {self.base_url}."
                )
                
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
                detail=f"Could not connect to LLM service (Ollama): {type(e).__name__}"
            )
            
        except Exception as e:
            logger.exception(f"Unexpected error interacting with LLM service: {e}")
            
            # Update error metrics
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail=f"Unexpected error generating response: {str(e)}"
            )
            
    async def check_availability(self) -> bool:
        """Check if Ollama is available"""
        try:
            response = await self.client.get(f"{self.base_url}/api/version", timeout=5.0)
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Ollama availability check failed: {e}")
            return False

class OpenAIProvider(LLMProviderInterface):
    """Implementation of LLMProviderInterface for OpenAI"""
    
    def __init__(self, client: httpx.AsyncClient, settings: ProviderSettings):
        self.client = client
        self.settings = settings
        
        # Get OpenAI specific configuration
        app_settings = get_settings()
        self.config = get_openai_config(app_settings)
        
        self.base_url = self.config.api_base
        self.timeout = self.config.timeout
        self.model_registry = get_model_registry()
        
        # API key validation
        if not self.config.api_key:
            logger.warning("OpenAI API key not set. Provider will be in limited functionality mode.")
            
        # Set headers with API key if available
        self.headers = {}
        if self.config.api_key:
            self.headers["Authorization"] = f"Bearer {self.config.api_key.get_secret_value()}"
            
        if self.config.organization_id:
            self.headers["OpenAI-Organization"] = self.config.organization_id
        
        # Model capability mapping
        self.capability_mapping = {
            "gpt-4o": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL, ModelCapability.VISION],
            "gpt-4-turbo": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL],
            "gpt-4": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL],
            "gpt-3.5-turbo": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL],
            "text-embedding": [ModelCapability.EMBEDDINGS],
        }
        
        # Model size mapping
        self.size_mapping = {
            "gpt-4o": ModelSize.XLARGE,
            "gpt-4-turbo": ModelSize.XLARGE,
            "gpt-4": ModelSize.XLARGE,
            "gpt-3.5-turbo": ModelSize.LARGE,
            "text-embedding-ada-002": ModelSize.SMALL,
        }
        
        logger.info(f"Initialized OpenAI provider with base URL: {self.base_url}")
        
    async def list_models(self) -> List[Model]:
        """List all available models from OpenAI"""
        models = []
        
        try:
            # Check for API key
            if not self.config.api_key:
                # Return predefined list of models with UNAVAILABLE status
                for model_id in self.config.available_models:
                    models.append(
                        Model(
                            id=model_id,
                            name=model_id,
                            provider=ModelProvider.OPENAI,
                            status=ModelStatus.UNAVAILABLE,
                            capabilities=self.capability_mapping.get(
                                model_id, [ModelCapability.TEXT]
                            ),
                            size=self.size_mapping.get(model_id, ModelSize.LARGE),
                            error="OpenAI API key not configured."
                        )
                    )
                return models
                
            # Call the OpenAI API to get models
            response = await self.client.get(
                f"{self.base_url}/models",
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            # Process the response
            data = response.json()
            if "data" in data and isinstance(data["data"], list):
                openai_models = data["data"]
                
                # Filter to the models we care about
                relevant_models = []
                for model in openai_models:
                    model_id = model.get("id", "")
                    if any(model_id.startswith(prefix) for prefix in [
                        "gpt-4", "gpt-3.5-turbo", "text-embedding"
                    ]):
                        relevant_models.append(model)
                
                # Convert to our model format
                for openai_model in relevant_models:
                    model_id = openai_model.get("id", "unknown")
                    model = Model(
                        id=model_id,
                        name=model_id,
                        provider=ModelProvider.OPENAI,
                        status=ModelStatus.AVAILABLE,
                        capabilities=self.capability_mapping.get(
                            model_id.split(':')[0], [ModelCapability.TEXT]
                        ),
                        size=self.size_mapping.get(model_id.split(':')[0], ModelSize.LARGE),
                        description=openai_model.get("description", None),
                        version=openai_model.get("created"),
                        metadata=openai_model
                    )
                    models.append(model)
            
        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to OpenAI API at {self.base_url}")
            for model_id in self.config.available_models:
                models.append(
                    Model(
                        id=model_id,
                        name=model_id,
                        provider=ModelProvider.OPENAI,
                        status=ModelStatus.UNAVAILABLE,
                        capabilities=self.capability_mapping.get(
                            model_id, [ModelCapability.TEXT]
                        ),
                        size=self.size_mapping.get(model_id, ModelSize.LARGE),
                        error="OpenAI API connection timeout."
                    )
                )
                
        except httpx.RequestError as e:
            logger.error(f"Error connecting to OpenAI API: {e}")
            for model_id in self.config.available_models:
                models.append(
                    Model(
                        id=model_id,
                        name=model_id,
                        provider=ModelProvider.OPENAI,
                        status=ModelStatus.UNAVAILABLE,
                        capabilities=self.capability_mapping.get(
                            model_id, [ModelCapability.TEXT]
                        ),
                        size=self.size_mapping.get(model_id, ModelSize.LARGE),
                        error=f"OpenAI API connection error: {str(e)}"
                    )
                )
                
        except Exception as e:
            logger.exception(f"Unexpected error listing OpenAI models: {e}")
            for model_id in self.config.available_models:
                models.append(
                    Model(
                        id=model_id,
                        name=model_id,
                        provider=ModelProvider.OPENAI,
                        status=ModelStatus.UNAVAILABLE,
                        capabilities=self.capability_mapping.get(
                            model_id, [ModelCapability.TEXT]
                        ),
                        size=self.size_mapping.get(model_id, ModelSize.LARGE),
                        error=f"Error: {str(e)}"
                    )
                )
                
        return models
        
    async def get_model(self, model_id: str) -> Optional[Model]:
        """Get a specific model by ID from OpenAI"""
        models = await self.list_models()
        for model in models:
            if model.id == model_id:
                return model
        return None
        
    async def pull_model(self, model_id: str) -> Dict[str, Any]:
        """Pull/download a model - not supported for OpenAI"""
        return {
            "status": "error",
            "message": "Model pulling not supported for OpenAI. Models are available via API.",
            "name": model_id
        }
        
    async def generate_response(self, 
                              model_id: str, 
                              prompt: str, 
                              parameters: Optional[ModelParameters] = None) -> str:
        """Generate a response using the specified OpenAI model"""
        
        # Use default parameters if none provided
        if parameters is None:
            parameters = ModelParameters()
            
        try:
            # Prepare request
            api_url = f"{self.base_url}/chat/completions"
            
            # Prepare the payload
            payload = {
                "model": model_id,
                "messages": [
                    {"role": "system", "content": "You are a helpful AI assistant focusing on explaining errors and providing technical assistance."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": parameters.temperature,
                "max_tokens": parameters.max_tokens,
                "top_p": parameters.top_p,
                "stream": False
            }
            
            # Add stop sequences if specified
            if parameters.stop_sequences:
                payload["stop"] = parameters.stop_sequences
                
            start_time = time.time()
            
            # Send request
            response = await self.client.post(
                api_url,
                headers=self.headers,
                json=payload,
                timeout=float(self.timeout)
            )
            response.raise_for_status()
            
            end_time = time.time()
            response_time = end_time - start_time
            
            # Update model metrics
            self.model_registry.update_model_metrics(
                model_id,
                response_time=response_time,
                success=True
            )
            
            # Parse response
            response_data = response.json()
            
            # Extract the completion
            if "choices" in response_data and len(response_data["choices"]) > 0:
                choice = response_data["choices"][0]
                message = choice.get("message", {})
                content = message.get("content", "").strip()
                
                if not content:
                    logger.warning("OpenAI returned an empty response.")
                    self.model_registry.update_model_metrics(
                        model_id,
                        success=False
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="LLM returned an empty response."
                    )
                    
                return content
            else:
                logger.error(f"Unexpected response structure from OpenAI: {response_data}")
                self.model_registry.update_model_metrics(
                    model_id,
                    success=False
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unexpected response structure from OpenAI."
                )
                
        except httpx.TimeoutException as e:
            logger.error(f"OpenAI API request timed out after {self.timeout}s: {e}")
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Request to OpenAI timed out after {self.timeout} seconds."
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenAI API HTTP error: {e.response.status_code} - {e.response.text}")
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            
            # Extract error message from OpenAI response if possible
            error_message = "Unknown error"
            try:
                error_data = e.response.json()
                if "error" in error_data:
                    error_message = error_data["error"].get("message", str(e))
            except:
                error_message = str(e)
                
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error: {error_message}"
            )
            
        except Exception as e:
            logger.exception(f"Unexpected error with OpenAI: {e}")
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
            
    async def check_availability(self) -> bool:
        """Check if OpenAI API is available"""
        try:
            # Simple check for API key
            if not self.config.api_key:
                return False
                
            # Make a lightweight request to the models endpoint
            response = await self.client.get(
                f"{self.base_url}/models",
                headers=self.headers,
                timeout=5.0
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"OpenAI availability check failed: {e}")
            return False


class AnthropicProvider(LLMProviderInterface):
    """Implementation of LLMProviderInterface for Anthropic"""
    
    def __init__(self, client: httpx.AsyncClient, settings: ProviderSettings):
        self.client = client
        self.settings = settings
        
        # Get Anthropic specific configuration
        app_settings = get_settings()
        self.config = get_anthropic_config(app_settings)
        
        self.base_url = self.config.api_base
        self.timeout = self.config.timeout
        self.api_version = self.config.api_version
        self.model_registry = get_model_registry()
        
        # API key validation
        if not self.config.api_key:
            logger.warning("Anthropic API key not set. Provider will be in limited functionality mode.")
            
        # Set headers with API key if available
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "anthropic-version": self.api_version
        }
        
        if self.config.api_key:
            self.headers["x-api-key"] = self.config.api_key.get_secret_value()
            # Anthropic's preferred auth header
            self.headers["Authorization"] = f"Bearer {self.config.api_key.get_secret_value()}"
        
        # Model capability mapping
        self.capability_mapping = {
            "claude-3-opus": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL, ModelCapability.VISION],
            "claude-3-sonnet": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL, ModelCapability.VISION],
            "claude-3-haiku": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL, ModelCapability.VISION],
            "claude-2": [ModelCapability.TEXT, ModelCapability.CODE, ModelCapability.MULTILINGUAL],
            "claude-instant": [ModelCapability.TEXT, ModelCapability.MULTILINGUAL],
        }
        
        # Model size mapping
        self.size_mapping = {
            "claude-3-opus": ModelSize.XLARGE,
            "claude-3-sonnet": ModelSize.LARGE,
            "claude-3-haiku": ModelSize.MEDIUM,
            "claude-2": ModelSize.LARGE,
            "claude-instant": ModelSize.SMALL,
        }
        
        logger.info(f"Initialized Anthropic provider with base URL: {self.base_url}")
        
    async def list_models(self) -> List[Model]:
        """List all available models from Anthropic"""
        models = []
        
        try:
            # If API key not set, return predefined list of models
            if not self.config.api_key:
                for model_id in self.config.available_models:
                    # Extract base model name
                    base_model = model_id.split('-20')[0] if '-20' in model_id else model_id
                    if ':' in base_model:
                        base_model = base_model.split(':')[0]
                        
                    models.append(
                        Model(
                            id=model_id,
                            name=model_id,
                            provider=ModelProvider.ANTHROPIC,
                            status=ModelStatus.UNAVAILABLE,
                            capabilities=self.capability_mapping.get(
                                base_model, [ModelCapability.TEXT]
                            ),
                            size=self.size_mapping.get(base_model, ModelSize.LARGE),
                            error="Anthropic API key not configured."
                        )
                    )
                return models
                
            # For Anthropic, we'll use the predefined model list since they don't 
            # have a standard models listing endpoint in their API
            for model_id in self.config.available_models:
                # Extract base model name
                base_model = model_id.split('-20')[0] if '-20' in model_id else model_id
                if ':' in base_model:
                    base_model = base_model.split(':')[0]
                    
                models.append(
                    Model(
                        id=model_id,
                        name=model_id,
                        provider=ModelProvider.ANTHROPIC,
                        status=ModelStatus.AVAILABLE,
                        capabilities=self.capability_mapping.get(
                            base_model, [ModelCapability.TEXT]
                        ),
                        size=self.size_mapping.get(base_model, ModelSize.LARGE)
                    )
                )
                
        except Exception as e:
            logger.exception(f"Unexpected error listing Anthropic models: {e}")
            for model_id in self.config.available_models:
                # Extract base model name
                base_model = model_id.split('-20')[0] if '-20' in model_id else model_id
                if ':' in base_model:
                    base_model = base_model.split(':')[0]
                    
                models.append(
                    Model(
                        id=model_id,
                        name=model_id,
                        provider=ModelProvider.ANTHROPIC,
                        status=ModelStatus.UNAVAILABLE,
                        capabilities=self.capability_mapping.get(
                            base_model, [ModelCapability.TEXT]
                        ),
                        size=self.size_mapping.get(base_model, ModelSize.LARGE),
                        error=f"Error: {str(e)}"
                    )
                )
                
        return models
        
    async def get_model(self, model_id: str) -> Optional[Model]:
        """Get a specific model by ID from Anthropic"""
        models = await self.list_models()
        for model in models:
            if model.id == model_id:
                return model
        return None
        
    async def pull_model(self, model_id: str) -> Dict[str, Any]:
        """Pull/download a model - not supported for Anthropic"""
        return {
            "status": "error",
            "message": "Model pulling not supported for Anthropic. Models are available via API.",
            "name": model_id
        }
        
    async def generate_response(self, 
                              model_id: str, 
                              prompt: str, 
                              parameters: Optional[ModelParameters] = None) -> str:
        """Generate a response using the specified Anthropic model"""
        
        # Use default parameters if none provided
        if parameters is None:
            parameters = ModelParameters()
            
        try:
            # Prepare request
            api_url = f"{self.base_url}/v1/messages"
            
            # Prepare the payload
            payload = {
                "model": model_id,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "system": "You are a helpful AI assistant focusing on explaining errors and providing technical assistance.",
                "temperature": parameters.temperature,
                "max_tokens": parameters.max_tokens,
                "top_p": parameters.top_p,
                "stream": False
            }
            
            # Add stop sequences if specified
            if parameters.stop_sequences:
                payload["stop_sequences"] = parameters.stop_sequences
                
            start_time = time.time()
            
            # Send request
            response = await self.client.post(
                api_url,
                headers=self.headers,
                json=payload,
                timeout=float(self.timeout)
            )
            response.raise_for_status()
            
            end_time = time.time()
            response_time = end_time - start_time
            
            # Update model metrics
            self.model_registry.update_model_metrics(
                model_id,
                response_time=response_time,
                success=True
            )
            
            # Parse response
            response_data = response.json()
            
            # Extract the completion
            if "content" in response_data:
                content_list = response_data["content"]
                text_contents = []
                
                for content_item in content_list:
                    if content_item.get("type") == "text":
                        text_contents.append(content_item.get("text", ""))
                        
                complete_text = "".join(text_contents).strip()
                
                if not complete_text:
                    logger.warning("Anthropic returned an empty response.")
                    self.model_registry.update_model_metrics(
                        model_id,
                        success=False
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="LLM returned an empty response."
                    )
                    
                return complete_text
            else:
                logger.error(f"Unexpected response structure from Anthropic: {response_data}")
                self.model_registry.update_model_metrics(
                    model_id,
                    success=False
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Unexpected response structure from Anthropic."
                )
                
        except httpx.TimeoutException as e:
            logger.error(f"Anthropic API request timed out after {self.timeout}s: {e}")
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Request to Anthropic timed out after {self.timeout} seconds."
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(f"Anthropic API HTTP error: {e.response.status_code} - {e.response.text}")
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            
            # Extract error message from Anthropic response if possible
            error_message = "Unknown error"
            try:
                error_data = e.response.json()
                if "error" in error_data:
                    error_message = error_data["error"].get("message", str(e))
            except:
                error_message = str(e)
                
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Anthropic API error: {error_message}"
            )
            
        except Exception as e:
            logger.exception(f"Unexpected error with Anthropic: {e}")
            self.model_registry.update_model_metrics(
                model_id,
                success=False
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )
            
    async def check_availability(self) -> bool:
        """Check if Anthropic API is available"""
        try:
            # Simple check for API key
            if not self.config.api_key:
                return False
                
            # Since Anthropic doesn't have a simple health check endpoint,
            # we'll just verify API key validity by making a simple request
            # to test the authentication
            api_url = f"{self.base_url}/v1/models"
            
            response = await self.client.get(
                api_url,
                headers=self.headers,
                timeout=5.0
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Anthropic availability check failed: {e}")
            return False


# Factory function to create provider instances
def create_provider(
    provider_type: ModelProvider,
    client: httpx.AsyncClient,
    provider_settings: ProviderSettings
) -> LLMProviderInterface:
    """Create a provider instance based on type"""
    if provider_type == ModelProvider.OLLAMA:
        return OllamaProvider(client, provider_settings)
    elif provider_type == ModelProvider.OPENAI:
        return OpenAIProvider(client, provider_settings)
    elif provider_type == ModelProvider.ANTHROPIC:
        return AnthropicProvider(client, provider_settings)
    # Add other provider implementations here
    raise ValueError(f"Unsupported provider type: {provider_type}")