# backend/app/services/enhanced_llm_service.py

import httpx
import logging
import time
import json
from typing import Dict, List, Optional, Any, Union, Tuple
from fastapi import HTTPException, status
import asyncio
from datetime import datetime
import re
from pydantic import SecretStr

from app.core.settings import settings
from app.core.config import get_settings
from app.models.ai_models import (
    Model,
    ModelProvider,
    ModelStatus,
    ModelCapability,
    ModelParameters,
    ModelPreferences,
    FallbackChain
)
from app.models.ai import (
    ModelStatus as OldModelStatus, 
    OllamaModel
)
from app.services.model_registry_service import ModelRegistry, get_model_registry
from app.services.llm_providers import LLMProviderInterface, create_provider
from app.services.metrics_service import MetricsService, get_metrics_service

logger = logging.getLogger(__name__)

class EnhancedLLMService:
    """
    Enhanced LLM service with support for multiple models and providers.
    Utilizes the model registry and provider adapters for improved flexibility.
    """
    
    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self.model_registry = get_model_registry()
        self.metrics_service = get_metrics_service()
        self.providers: Dict[ModelProvider, LLMProviderInterface] = {}
        self.default_timeout = settings.ollama_timeout
        self.initialize_providers()
        
        # Legacy compatibility
        self.model = settings.ollama_model
        
    def initialize_providers(self) -> None:
        """Initialize all configured providers"""
        # Get provider settings from registry
        for provider_type, provider_settings in self.model_registry.provider_settings.items():
            try:
                provider = create_provider(provider_type, self.client, provider_settings)
                self.providers[provider_type] = provider
                logger.info(f"Initialized provider: {provider_type}")
            except Exception as e:
                logger.error(f"Failed to initialize provider {provider_type}: {e}")
                
    async def refresh_models(self) -> None:
        """Refresh model list from all providers"""
        for provider_type, provider in self.providers.items():
            try:
                models = await provider.list_models()
                for model in models:
                    self.model_registry.register_model(model)
                logger.info(f"Refreshed models from provider: {provider_type}")
            except Exception as e:
                logger.error(f"Failed to refresh models from provider {provider_type}: {e}")
                
    async def list_models(self) -> Dict[str, Any]:
        """List all available models with their status"""
        # Refresh models from providers
        await self.refresh_models()
        
        # Get models from registry
        models = self.model_registry.list_models()
        groups = self.model_registry.list_groups()
        fallback_chains = self.model_registry.list_fallback_chains()
        default_model = self.model_registry.get_default_model()
        default_fallback_chain = self.model_registry.get_default_fallback_chain()
        
        # Build response
        return {
            "models": models,
            "groups": groups,
            "fallback_chains": fallback_chains,
            "current_model": default_model.id if default_model else None,
            "current_fallback_chain": default_fallback_chain.name if default_fallback_chain else None,
            "providers": list(self.providers.keys()),
            "status": {
                provider_name: {"available": self.is_provider_available(provider_name)}
                for provider_name in self.providers
            }
        }
        
    async def get_legacy_models(self) -> Dict[str, Any]:
        """For backwards compatibility with old API"""
        # Ollama provider for legacy
        ollama_provider = self.providers.get(ModelProvider.OLLAMA)
        if not ollama_provider:
            return {
                "models": [],
                "current_model": self.model,
                "ollama_status": OldModelStatus.ERROR,
                "error": "Ollama provider not available"
            }
            
        try:
            # Get models from Ollama provider
            models = await ollama_provider.list_models()
            
            # Convert to legacy format
            legacy_models = []
            for model in models:
                legacy_models.append(
                    OllamaModel(
                        name=model.id,
                        status=OldModelStatus(model.status.value),
                        size=model.size_mb,
                        modified_at=model.version,
                        error=model.error,
                        details=model.metadata
                    )
                )
                
            # Get Ollama availability
            ollama_status = OldModelStatus.AVAILABLE if await self.is_provider_available(ModelProvider.OLLAMA) else OldModelStatus.ERROR
            
            return {
                "models": legacy_models,
                "current_model": self.model,
                "ollama_status": ollama_status,
                "error": None
            }
            
        except Exception as e:
            logger.exception(f"Error in legacy model list: {e}")
            return {
                "models": [],
                "current_model": self.model,
                "ollama_status": OldModelStatus.ERROR,
                "error": str(e)
            }
            
    async def pull_model(self, model_id: str) -> Dict[str, Any]:
        """Pull/download a model"""
        # Determine provider for this model
        provider_type = self._get_provider_for_model(model_id)
        if not provider_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown model provider for model: {model_id}"
            )
            
        provider = self.providers.get(provider_type)
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Provider {provider_type} not available"
            )
            
        # Pull model from provider
        result = await provider.pull_model(model_id)
        return result
        
    async def set_active_model(self, model_id: str) -> Dict[str, Any]:
        """Set the active model"""
        # Check if model exists
        model = self.model_registry.get_model(model_id)
        if not model:
            # Try to refresh models to see if it's available
            await self.refresh_models()
            model = self.model_registry.get_model(model_id)
            
            if not model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Model not found: {model_id}"
                )
                
        # Set as default in registry
        self.model_registry.set_default_model(model_id)
        
        # For legacy compatibility
        self.model = model_id
        
        return {
            "status": "success",
            "model": model_id,
            "message": f"Active model changed to {model_id}"
        }
        
    async def set_user_preferences(self, 
                                  user_id: str, 
                                  preferences: ModelPreferences) -> Dict[str, Any]:
        """Set model preferences for a specific user"""
        # Validate models in preferences
        primary_model = self.model_registry.get_model(preferences.primary_model)
        if not primary_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Primary model not found: {preferences.primary_model}"
            )
            
        for fallback_id in preferences.fallback_models:
            fallback_model = self.model_registry.get_model(fallback_id)
            if not fallback_model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Fallback model not found: {fallback_id}"
                )
                
        # Set preferences in registry
        self.model_registry.set_user_preferences(user_id, preferences)
        
        return {
            "status": "success",
            "message": f"Model preferences updated for user {user_id}"
        }
        
    async def get_user_preferences(self, user_id: str) -> ModelPreferences:
        """Get model preferences for a specific user"""
        preferences = self.model_registry.get_user_preferences(user_id)
        if not preferences:
            # Create default preferences
            default_model = self.model_registry.get_default_model()
            default_chain = self.model_registry.get_default_fallback_chain()
            
            preferences = ModelPreferences(
                primary_model=default_model.id if default_model else settings.ollama_model,
                fallback_models=default_chain.models if default_chain else []
            )
            
        return preferences
        
    async def set_fallback_chain(self, 
                               chain_id: str, 
                               is_default: bool = False) -> Dict[str, Any]:
        """Set the active fallback chain"""
        # Check if chain exists
        chain = self.model_registry.get_fallback_chain(chain_id)
        if not chain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Fallback chain not found: {chain_id}"
            )
            
        # Set as default if requested
        if is_default:
            self.model_registry.set_default_fallback_chain(chain_id)
            
        return {
            "status": "success",
            "chain": chain_id,
            "message": f"Fallback chain set to {chain_id}"
        }
        
    async def create_fallback_chain(self, chain: FallbackChain) -> Dict[str, Any]:
        """Create a new fallback chain"""
        # Validate models in chain
        for model_id in chain.models:
            model = self.model_registry.get_model(model_id)
            if not model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Model in fallback chain not found: {model_id}"
                )
                
        # Check if chain with this name already exists
        existing_chain = self.model_registry.get_fallback_chain(chain.name)
        if existing_chain:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Fallback chain with name '{chain.name}' already exists"
            )
            
        # Register chain
        self.model_registry.register_fallback_chain(chain)
        
        # Set as default if requested
        if chain.is_default:
            self.model_registry.set_default_fallback_chain(chain.name)
            
        return {
            "status": "success",
            "chain": chain,
            "message": f"Fallback chain '{chain.name}' created"
        }
        
    async def is_provider_available(self, provider_type: ModelProvider) -> bool:
        """Check if a provider is available"""
        provider = self.providers.get(provider_type)
        if not provider:
            return False
            
        return await provider.check_availability()
        
    def _get_provider_for_model(self, model_id: str) -> Optional[ModelProvider]:
        """Determine which provider should handle a model ID"""
        # First check if model exists in registry
        model = self.model_registry.get_model(model_id)
        if model:
            return model.provider
            
        # If not found, use heuristics based on model ID format
        if ":" in model_id or model_id in ["llama", "llama2", "llama3", "mistral", "codellama", 
                                         "phi", "phi2", "phi3", "gemma", "mixtral"]:
            return ModelProvider.OLLAMA
            
        elif re.match(r"^gpt-\d+", model_id) or model_id in ["gpt-4", "gpt-3.5-turbo", "text-davinci-003"]:
            return ModelProvider.OPENAI
            
        elif model_id in ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku", "claude-2"]:
            return ModelProvider.ANTHROPIC
            
        # Default to Ollama
        return ModelProvider.OLLAMA
        
    def _select_model_for_error(self, 
                              error_type: Optional[str], 
                              error_message: Optional[str], 
                              user_id: Optional[str] = None) -> str:
        """Select the best model for an error type"""
        # Get user preferences if available
        primary_model_id = self.model
        fallback_models = []
        
        if user_id:
            preferences = self.model_registry.get_user_preferences(user_id)
            if preferences:
                primary_model_id = preferences.primary_model
                fallback_models = preferences.fallback_models
                
        # For code-related errors, prefer code-specialized models
        if error_type and any(code_term in error_type.lower() for code_term in 
                            ["syntax", "reference", "type", "null", "undefined", "import"]):
            # Find available code models
            code_model = self.model_registry.get_model_for_task(
                "code",
                required_capabilities=[ModelCapability.CODE]
            )
            if code_model:
                return code_model.id
                
        # Return primary model
        return primary_model_id
        
    async def _execute_with_fallbacks(self, 
                                    action_fn, 
                                    models: List[str], 
                                    *args, **kwargs) -> Tuple[str, str, float]:
        """Execute action with fallback models if primary fails"""
        errors = []
        start_time = time.time()
        
        for model_id in models:
            try:
                model = self.model_registry.get_model(model_id)
                if not model or model.status != ModelStatus.AVAILABLE:
                    errors.append(f"Model {model_id} not available")
                    continue
                    
                logger.info(f"Attempting action with model: {model_id}")
                result = await action_fn(model_id, *args, **kwargs)
                
                end_time = time.time()
                processing_time = end_time - start_time
                
                return result, model_id, processing_time
                
            except Exception as e:
                error_msg = f"Error with model {model_id}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                
        # If we get here, all models failed
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"All models failed. Errors: {'; '.join(errors)}"
        )
        
    async def get_explanation(self, 
                            event_data: Dict[str, Any], 
                            override_model: Optional[str] = None,
                            user_id: Optional[str] = None,
                            include_prompt: bool = False) -> Dict[str, Any]:
        """Get an explanation for an error with fallback support"""
        # Extract error information for model selection
        error_type = self._extract_error_type(event_data)
        error_message = self._extract_error_message(event_data)
        
        # Determine which models to use
        models_to_try = []
        
        if override_model:
            # If model explicitly specified, use only that
            models_to_try.append(override_model)
        elif user_id:
            # If user_id provided, get their preferences
            preferences = await self.get_user_preferences(user_id)
            models_to_try.append(preferences.primary_model)
            models_to_try.extend(preferences.fallback_models)
        else:
            # Otherwise, select based on error type and use default fallbacks
            primary_model = self._select_model_for_error(error_type, error_message)
            models_to_try.append(primary_model)
            
            # Add fallbacks from default chain
            default_chain = self.model_registry.get_default_fallback_chain()
            if default_chain:
                # Add models from chain that aren't already in the list
                for model_id in default_chain.models:
                    if model_id not in models_to_try:
                        models_to_try.append(model_id)
                        
        # Create prompts for the models (can be model-specific in the future)
        prompt, system_prompt = self._create_prompt(event_data)
        
        # Define action function for the fallback chain
        async def get_explanation_from_model(model_id: str) -> str:
            provider_type = self._get_provider_for_model(model_id)
            if not provider_type:
                raise ValueError(f"Unknown provider for model: {model_id}")
                
            provider = self.providers.get(provider_type)
            if not provider:
                raise ValueError(f"Provider {provider_type} not available")
                
            # For now, we just use the same prompt for all models
            # In the future, we could have model-specific prompting
            return await provider.generate_response(model_id, prompt)
            
        # Execute with fallbacks
        try:
            explanation, used_model, processing_time = await self._execute_with_fallbacks(
                get_explanation_from_model,
                models_to_try
            )
            
            # Calculate token estimates
            prompt_tokens = len(prompt.split())
            completion_tokens = len(explanation.split())
            
            # Record metrics with token usage
            self.metrics_service.record_usage(
                model_id=used_model,
                response_time=processing_time,
                success=True,
                input_tokens=prompt_tokens,
                output_tokens=completion_tokens
            )
            
            response = {
                "explanation": explanation,
                "model": used_model,
                "processing_time": processing_time * 1000,  # convert to ms
                "fallbacks_tried": len(models_to_try) > 1,
                "tokens": {
                    "prompt": prompt_tokens,
                    "completion": completion_tokens,
                    "total": prompt_tokens + completion_tokens
                }
            }
            
            # Include prompt details if requested (for debugging)
            if include_prompt:
                response["prompt"] = prompt
                response["system_prompt"] = system_prompt
                
            return response
            
        except Exception as e:
            logger.exception(f"Error generating explanation with all models: {e}")
            
            end_time = time.time()
            error_time = end_time - start_time
            
            # Record metrics for failed attempt
            for model_id in models_to_try:
                # Only record metrics for the first model or the override model
                if model_id == models_to_try[0] or model_id == override_model:
                    self.metrics_service.record_usage(
                        model_id=model_id,
                        response_time=error_time,
                        success=False,
                        input_tokens=len(prompt.split()),
                        output_tokens=0
                    )
            
            # Fallback to very basic explanation if everything else fails
            return {
                "explanation": await self.get_fallback_explanation(error_type, error_message),
                "model": "fallback",
                "processing_time": error_time * 1000,  # convert to ms
                "fallbacks_tried": True,
                "error": str(e)
            }
            
    def _extract_error_context(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant error context from the event data"""
        context = {
            "title": event_data.get("title", "Unknown Error"),
            "level": event_data.get("level", "error"),
            "platform": event_data.get("platform", "unknown"),
            "message": event_data.get("message", ""),
            "exception_type": None,
            "exception_value": None,
            "stack_frames": [],
            "tags": [],
            "browser": None,
            "os": None,
            "device": None,
            "user_count": event_data.get("userCount", 0)
        }
        
        # Extract exception details
        exception_found = False
        # Method 1: Direct exception field
        if "exception" in event_data:
            exception_data = event_data["exception"]
            if isinstance(exception_data, dict) and "values" in exception_data:
                exception_values = exception_data["values"]
                if len(exception_values) > 0:
                    exception_found = True
                    first_exception = exception_values[0]
                    context["exception_type"] = first_exception.get("type")
                    context["exception_value"] = first_exception.get("value")
                    
                    # Extract stack frames for context
                    if "stacktrace" in first_exception and "frames" in first_exception["stacktrace"]:
                        frames = first_exception["stacktrace"]["frames"]
                        # Focus on app frames (more relevant than library frames)
                        app_frames = [f for f in frames if f.get("inApp", False)]
                        # If no app frames, use some library frames
                        relevant_frames = app_frames if app_frames else frames[-3:] if len(frames) >= 3 else frames
                        
                        for frame in relevant_frames:
                            frame_info = {
                                "filename": frame.get("filename", "unknown"),
                                "function": frame.get("function", "unknown"),
                                "line": frame.get("lineno", "?"),
                                "column": frame.get("colno", "?"),
                                "code_context": None
                            }
                            
                            # Extract code context if available
                            if "context" in frame and isinstance(frame["context"], dict):
                                code_lines = []
                                for line_num, code in frame["context"].items():
                                    code_lines.append(f"{line_num}: {code}")
                                frame_info["code_context"] = "\n".join(code_lines)
                            
                            context["stack_frames"].append(frame_info)
        
        # Method 2: Look in entries
        if not exception_found and "entries" in event_data and isinstance(event_data["entries"], list):
            for entry in event_data["entries"]:
                if entry.get("type") == "exception" and "data" in entry:
                    exception_data = entry["data"]
                    if "values" in exception_data and len(exception_data["values"]) > 0:
                        exception_found = True
                        first_exception = exception_data["values"][0]
                        context["exception_type"] = first_exception.get("type")
                        context["exception_value"] = first_exception.get("value")
                        
                        # Extract stack frames
                        if "stacktrace" in first_exception and "frames" in first_exception["stacktrace"]:
                            frames = first_exception["stacktrace"]["frames"]
                            # Focus on app frames (more relevant than library frames)
                            app_frames = [f for f in frames if f.get("inApp", False)]
                            # If no app frames, use some library frames
                            relevant_frames = app_frames if app_frames else frames[-3:] if len(frames) >= 3 else frames
                            
                            for frame in relevant_frames:
                                frame_info = {
                                    "filename": frame.get("filename", "unknown"),
                                    "function": frame.get("function", "unknown"),
                                    "line": frame.get("lineno", "?"),
                                    "column": frame.get("colno", "?"),
                                    "code_context": None
                                }
                                
                                # Extract code context if available
                                if "context" in frame and isinstance(frame["context"], dict):
                                    code_lines = []
                                    for line_num, code in frame["context"].items():
                                        code_lines.append(f"{line_num}: {code}")
                                    frame_info["code_context"] = "\n".join(code_lines)
                                
                                context["stack_frames"].append(frame_info)
        
        # Extract tags
        if "tags" in event_data and isinstance(event_data["tags"], list):
            context["tags"] = [{"key": tag.get("key", ""), "value": tag.get("value", "")} for tag in event_data["tags"]]
        
        # Extract browser/OS/device info
        if "contexts" in event_data and isinstance(event_data["contexts"], dict):
            contexts = event_data["contexts"]
            if "browser" in contexts:
                context["browser"] = {
                    "name": contexts["browser"].get("name", "unknown"),
                    "version": contexts["browser"].get("version", "unknown")
                }
            if "os" in contexts:
                context["os"] = {
                    "name": contexts["os"].get("name", "unknown"),
                    "version": contexts["os"].get("version", "unknown")
                }
            if "device" in contexts:
                context["device"] = {
                    "name": contexts["device"].get("name", "unknown"),
                    "family": contexts["device"].get("family", "unknown"),
                    "model": contexts["device"].get("model", "unknown")
                }
                
        # Extract any request information
        request_info = None
        if "request" in event_data and isinstance(event_data["request"], dict):
            request_info = event_data["request"]
        elif "contexts" in event_data and "request" in event_data["contexts"]:
            request_info = event_data["contexts"]["request"]
            
        if request_info:
            context["request"] = {
                "url": request_info.get("url", ""),
                "method": request_info.get("method", ""),
                "headers": request_info.get("headers", {}),
                "data": request_info.get("data", {})
            }
        
        return context
        
    def _create_prompt(self, event_data: Dict[str, Any]) -> Tuple[str, str]:
        """Create a detailed prompt for the LLM, returning both system and user prompts"""
        # Extract context
        context = self._extract_error_context(event_data)
        
        # Create system prompt
        system_prompt = "You are an expert software engineer specializing in diagnosing and fixing errors. "
        
        # Adjust system prompt based on error type
        if context["exception_type"]:
            error_type = context["exception_type"].lower()
            if "syntax" in error_type:
                system_prompt += "You are particularly skilled at identifying and fixing syntax errors in code. "
            elif "reference" in error_type or "undefined" in error_type:
                system_prompt += "You excel at spotting reference errors and variable scoping issues. "
            elif "type" in error_type:
                system_prompt += "You have deep expertise in type systems and type-related errors. "
            elif "network" in error_type or "connection" in error_type:
                system_prompt += "You specialize in diagnosing network and connection issues. "
            elif "database" in error_type or "sql" in error_type or "query" in error_type:
                system_prompt += "You have extensive knowledge of database systems and SQL errors. "
            elif "permission" in error_type or "auth" in error_type:
                system_prompt += "You're an expert in authentication, authorization, and permission issues. "
                
        system_prompt += "Provide clear, concise explanations that help developers understand and fix issues."
        
        # Create user prompt
        prompt = "I'm going to share details of an error and I need you to explain:\n"
        prompt += "1. What likely caused this error in simple terms\n"
        prompt += "2. How to fix or work around it\n"
        prompt += "3. Any additional context that might be helpful\n\n"
        
        prompt += f"ERROR TITLE: {context['title']}\n"
        prompt += f"ERROR LEVEL: {context['level']}\n"
        prompt += f"PLATFORM: {context['platform']}\n"
        
        if context['message']:
            prompt += f"\nERROR MESSAGE:\n{context['message']}\n"
        
        if context['exception_type'] or context['exception_value']:
            prompt += f"\nEXCEPTION DETAILS:\n"
            if context['exception_type']:
                prompt += f"Type: {context['exception_type']}\n"
            if context['exception_value']:
                prompt += f"Value: {context['exception_value']}\n"
        
        if context['stack_frames']:
            prompt += f"\nRELEVANT STACK FRAMES ({len(context['stack_frames'])}):\n"
            for i, frame in enumerate(context['stack_frames'], 1):
                prompt += f"Frame {i}:\n"
                prompt += f"  File: {frame['filename']}\n"
                prompt += f"  Function: {frame['function']}\n"
                prompt += f"  Line: {frame['line']}, Column: {frame['column']}\n"
                if frame['code_context']:
                    prompt += f"  Code:\n    {frame['code_context'].replace('\n', '\n    ')}\n"
        
        # Add request information if available
        if 'request' in context and context['request']:
            prompt += "\nREQUEST DETAILS:\n"
            if context['request'].get('url'):
                prompt += f"  URL: {context['request']['url']}\n"
            if context['request'].get('method'):
                prompt += f"  Method: {context['request']['method']}\n"
            
            # Add relevant headers (without sensitive info)
            safe_headers = {}
            if context['request'].get('headers'):
                headers = context['request']['headers']
                for key, value in headers.items():
                    if key.lower() not in ['authorization', 'cookie', 'password', 'token']:
                        safe_headers[key] = value
                        
            if safe_headers:
                prompt += "  Headers:\n"
                for key, value in safe_headers.items():
                    prompt += f"    {key}: {value}\n"
        
        # Add relevant tags
        relevant_tags = [tag for tag in context['tags'] if tag['key'] in 
                         ['runtime', 'environment', 'browser', 'os', 'release', 'level', 'logger']]
        if relevant_tags:
            prompt += "\nRELEVANT TAGS:\n"
            for tag in relevant_tags:
                prompt += f"  {tag['key']}: {tag['value']}\n"
        
        # Add environment context
        env_context = []
        if context['browser']:
            env_context.append(f"Browser: {context['browser']['name']} {context['browser']['version']}")
        if context['os']:
            env_context.append(f"OS: {context['os']['name']} {context['os']['version']}")
        if context['device']:
            env_context.append(f"Device: {context['device']['name']} {context['device']['model']}")
        
        if env_context:
            prompt += "\nENVIRONMENT:\n  " + "\n  ".join(env_context) + "\n"
        
        # Add user impact
        if context['user_count'] > 0:
            prompt += f"\nUser Impact: This error affects approximately {context['user_count']} users.\n"
        
        # Final instructions
        prompt += "\nPlease provide a clear, concise explanation in 3-4 paragraphs. Use simple language and avoid technical jargon where possible. Focus on explaining the likely cause and potential solutions."
        
        logger.debug(f"Generated prompt for LLM")
        return prompt, system_prompt
        
    def _extract_error_type(self, event_data: Dict[str, Any]) -> Optional[str]:
        """Extract error type from event data"""
        # Check in exception values
        if event_data.get("exception", {}).get("values", []):
            return event_data["exception"]["values"][0].get("type")
            
        # Check in entries
        if event_data.get("entries", []):
            for entry in event_data["entries"]:
                if entry.get("type") == "exception" and entry.get("data", {}).get("values", []):
                    return entry["data"]["values"][0].get("type")
                    
        # Get from title as fallback
        title = event_data.get("title", "")
        if ":" in title:
            return title.split(":")[0]
            
        return None
        
    def _extract_error_message(self, event_data: Dict[str, Any]) -> Optional[str]:
        """Extract error message from event data"""
        # Check direct message field
        if "message" in event_data:
            return event_data["message"]
            
        # Check in exception values
        if event_data.get("exception", {}).get("values", []):
            return event_data["exception"]["values"][0].get("value", "")
            
        # Check in entries
        if event_data.get("entries", []):
            for entry in event_data["entries"]:
                if entry.get("type") == "exception" and entry.get("data", {}).get("values", []):
                    return entry["data"]["values"][0].get("value", "")
                    
        # Get from title as fallback
        title = event_data.get("title", "")
        if ":" in title:
            return ":".join(title.split(":")[1:]).strip()
            
        return title
        
    async def set_provider_config(self, provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update configuration for a specific provider.
        
        Args:
            provider: The provider name (openai, anthropic, etc.)
            config: The configuration settings to update
            
        Returns:
            Dict with status of the update
        """
        # Convert provider string to enum
        try:
            provider_type = ModelProvider(provider.lower())
        except ValueError:
            raise ValueError(f"Unknown provider: {provider}")
            
        # Get the appropriate provider configuration
        app_settings = get_settings()
        provider_config = None
        
        if provider_type == ModelProvider.OPENAI:
            from app.config.providers.openai import OpenAIConfig, get_openai_config
            provider_config = get_openai_config(app_settings)
        elif provider_type == ModelProvider.ANTHROPIC:
            from app.config.providers.anthropic import AnthropicConfig, get_anthropic_config
            provider_config = get_anthropic_config(app_settings)
        else:
            raise ValueError(f"Provider {provider} does not support configuration updates")
            
        # Update the configuration
        for key, value in config.items():
            if hasattr(provider_config, key):
                # Special handling for API keys (SecretStr)
                if key == 'api_key' and value:
                    setattr(provider_config, key, SecretStr(value))
                else:
                    setattr(provider_config, key, value)
            else:
                logger.warning(f"Unknown configuration key for {provider}: {key}")
                
        # Update provider in registry
        provider_settings = self.model_registry.get_provider_settings(provider_type)
        provider_settings.config = provider_config
        self.model_registry.update_provider_settings(provider_type, provider_settings)
        
        # Reinitialize the provider with new settings
        self.providers[provider_type] = create_provider(provider_type, self.client, provider_settings)
        
        # Refresh models for this provider
        try:
            models = await self.providers[provider_type].list_models()
            for model in models:
                self.model_registry.register_model(model)
        except Exception as e:
            logger.error(f"Error refreshing models for provider {provider}: {e}")
        
        return {
            "status": "success",
            "message": f"Updated configuration for provider: {provider}",
            "updated_keys": list(config.keys())
        }
    
    async def test_provider_connection(self, provider: str, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test connection to a provider API with specified credentials.
        
        Args:
            provider: Provider name (openai, anthropic, etc.)
            request: Connection test parameters including API key
            
        Returns:
            Dict with connection test results
        """
        # Convert provider string to enum
        try:
            provider_type = ModelProvider(provider.lower())
        except ValueError:
            raise ValueError(f"Unknown provider: {provider}")
            
        # Extract API key from request
        api_key = request.get("api_key")
        if not api_key:
            raise ValueError("API key is required for connection test")
            
        # Create a temporary provider instance with the test credentials
        app_settings = get_settings()
        provider_settings = self.model_registry.get_provider_settings(provider_type)
        
        # Update the API key for testing
        if provider_type == ModelProvider.OPENAI:
            from app.config.providers.openai import OpenAIConfig
            test_config = OpenAIConfig(**{**provider_settings.config.dict(), "api_key": SecretStr(api_key)})
            provider_settings.config = test_config
        elif provider_type == ModelProvider.ANTHROPIC:
            from app.config.providers.anthropic import AnthropicConfig
            test_config = AnthropicConfig(**{**provider_settings.config.dict(), "api_key": SecretStr(api_key)})
            provider_settings.config = test_config
        else:
            raise ValueError(f"Provider {provider} does not support connection testing")
            
        # Create temporary provider instance
        test_provider = create_provider(provider_type, self.client, provider_settings)
        
        # Test connection
        start_time = time.time()
        available = await test_provider.check_availability()
        end_time = time.time()
        
        if available:
            # Try listing models as an additional check
            try:
                models = await test_provider.list_models()
                model_count = len(models)
                return {
                    "status": "success",
                    "message": f"Successfully connected to {provider}",
                    "available": True,
                    "response_time_ms": round((end_time - start_time) * 1000, 2),
                    "models_available": model_count
                }
            except Exception as e:
                logger.error(f"Error listing models during connection test: {e}")
                return {
                    "status": "partial",
                    "message": f"Connected to {provider} but couldn't list models: {str(e)}",
                    "available": True,
                    "response_time_ms": round((end_time - start_time) * 1000, 2),
                    "error": str(e)
                }
        else:
            return {
                "status": "error",
                "message": f"Failed to connect to {provider}",
                "available": False,
                "response_time_ms": round((end_time - start_time) * 1000, 2)
            }
    
    async def get_provider_availability(self) -> Dict[str, Any]:
        """
        Get availability status for all providers.
        
        Returns:
            Dict with availability status for each provider
        """
        results = {}
        
        # Check each provider
        for provider_type, provider in self.providers.items():
            try:
                start_time = time.time()
                available = await provider.check_availability()
                end_time = time.time()
                
                results[provider_type.value] = {
                    "available": available,
                    "response_time_ms": round((end_time - start_time) * 1000, 2)
                }
                
                # If available, add more information
                if available:
                    # Get the model count
                    try:
                        models = await provider.list_models()
                        available_models = [model.id for model in models if model.status == ModelStatus.AVAILABLE]
                        
                        results[provider_type.value].update({
                            "model_count": len(models),
                            "available_models": len(available_models)
                        })
                    except Exception as e:
                        logger.error(f"Error getting model information for {provider_type}: {e}")
                        results[provider_type.value]["error"] = f"Error getting model information: {str(e)}"
            except Exception as e:
                logger.exception(f"Error checking availability for provider {provider_type}: {e}")
                results[provider_type.value] = {
                    "available": False,
                    "error": str(e)
                }
                
        return results
    
    async def get_fallback_explanation(self, error_type: Optional[str], error_message: Optional[str]) -> str:
        """Provides a generic explanation when AI models are unavailable"""
        # Dictionary of common error types and generic explanations
        common_errors = {
            "SyntaxError": "This is a syntax error, which means there's a mistake in the code structure like a missing bracket, comma, or incorrect indentation. These errors happen before the code runs and need to be fixed by correcting the syntax.",
            
            "TypeError": "This is a type error, which happens when an operation is performed on a value of the wrong type - like trying to use a string method on a number. Check what data types you're working with and ensure they're compatible with the operations you're performing.",
            
            "ReferenceError": "This is a reference error, which occurs when the code tries to use a variable or function that doesn't exist or is out of scope. Make sure all variables and functions are properly defined before using them.",
            
            "NetworkError": "This is a network error, which happens when there's a problem with the network connection or a server request fails. Check your internet connection and the server's status, or try again later if it's a temporary issue.",
            
            "InternalServerError": "This is a server error (HTTP 500), which indicates something went wrong on the server side. The issue is likely in the server code or configuration and may require checking server logs to diagnose.",
            
            "ForbiddenError": "This is a permission error (HTTP 403), which means the request was valid but the server refuses to allow the requested action. Check if you have the necessary permissions or authentication to access this resource.",
            
            "ConnectionError": "This is a connection error, which occurs when the application can't establish a connection to a server or resource. Check if the server is running and accessible, and verify your network configuration.",
            
            "DatabaseError": "This is a database error, which happens when there's a problem interacting with a database. Common causes include connection issues, incorrect queries, or data integrity problems.",
            
            "MemoryError": "This is a memory error, which occurs when the application runs out of memory. This can happen when handling very large datasets or when there are memory leaks in the code.",
            
            "TimeoutError": "This is a timeout error, which happens when an operation takes too long to complete. This could be due to network issues, server overload, or an operation that's too resource-intensive."
        }
        
        if not error_type:
            return f"An error occurred in the application. The specific message is: '{error_message or 'Unknown'}'. Without more details, it's difficult to provide a specific diagnosis."
            
        # Try to match the error type to our dictionary
        for known_error, explanation in common_errors.items():
            if known_error.lower() in error_type.lower():
                return f"{explanation}\n\nSpecific error message: {error_message or 'Unknown'}"
        
        # Generic fallback
        return f"This error ({error_type}) indicates an issue in the application. The specific message is: '{error_message or 'Unknown'}'. To resolve it, check the related code and look for common issues like incorrect input data, missing values, or configuration problems."