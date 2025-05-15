# backend/app/services/model_registry_service.py

import logging
import json
from typing import Dict, List, Optional, Any, Union, Type
from datetime import datetime
import asyncio
import time

from app.core.settings import settings
from app.models.ai_models import (
    Model, 
    ModelGroup, 
    ModelProvider, 
    ModelStatus, 
    ModelCapability,
    ModelParameters,
    ModelPreferences,
    FallbackChain,
    ProviderSettings,
    ModelSize
)

logger = logging.getLogger(__name__)

class ModelRegistry:
    """
    Central registry for managing AI models from multiple providers.
    Handles model discovery, status tracking, and capabilities.
    """
    
    def __init__(self):
        self.models: Dict[str, Model] = {}
        self.groups: Dict[str, ModelGroup] = {}
        self.fallback_chains: Dict[str, FallbackChain] = {}
        self.provider_settings: Dict[ModelProvider, ProviderSettings] = {}
        self.user_preferences: Dict[str, ModelPreferences] = {}
        self.default_model_id: Optional[str] = None
        self.default_fallback_chain_id: Optional[str] = None
        
        # Initialize with default settings
        self._initialize_defaults()
        
    def _initialize_defaults(self):
        """Initialize default settings and providers."""
        # Set up Ollama provider settings
        self.register_provider(ProviderSettings(
            provider=ModelProvider.OLLAMA,
            base_url=settings.ollama_base_url,
            timeout=settings.ollama_timeout
        ))
        
        # Create default fallback chain
        default_chain = FallbackChain(
            name="Default Chain",
            models=["mistral:latest", "orca-mini", "gemma:latest"],
            is_default=True
        )
        self.fallback_chains["default"] = default_chain
        self.default_fallback_chain_id = "default"
        
        # Set default model
        self.default_model_id = settings.ollama_model
        
        # Create default groups
        self.groups = {
            "code": ModelGroup(name="Code Models", models=[], description="Specialized for code analysis"),
            "general": ModelGroup(name="General Models", models=[], description="All-purpose models"),
            "small": ModelGroup(name="Small Models", models=[], description="Fast, efficient models"),
            "large": ModelGroup(name="Large Models", models=[], description="Powerful, high-capacity models")
        }
        
    def register_provider(self, provider_settings: ProviderSettings) -> None:
        """Register a model provider with the registry."""
        self.provider_settings[provider_settings.provider] = provider_settings
        logger.info(f"Registered provider: {provider_settings.provider}")
        
    def get_provider_settings(self, provider: ModelProvider) -> Optional[ProviderSettings]:
        """Get settings for a specific provider."""
        return self.provider_settings.get(provider)
        
    def update_provider_settings(self, provider: ModelProvider, settings: ProviderSettings) -> None:
        """Update settings for a specific provider."""
        self.provider_settings[provider] = settings
        logger.info(f"Updated settings for provider: {provider}")
        
    def register_model(self, model: Model) -> None:
        """Register a model with the registry."""
        model_id = model.id
        self.models[model_id] = model
        
        # Add to appropriate groups
        if "code" in model.capabilities or ModelCapability.CODE in model.capabilities:
            self.add_model_to_group("code", model)
            
        if model.size in [ModelSize.TINY, ModelSize.SMALL]:
            self.add_model_to_group("small", model)
        elif model.size in [ModelSize.LARGE, ModelSize.XLARGE]:
            self.add_model_to_group("large", model)
            
        # All models go in general group
        self.add_model_to_group("general", model)
        
        logger.info(f"Registered model: {model.name} (ID: {model_id}, provider: {model.provider})")
        
    def add_model_to_group(self, group_name: str, model: Model) -> None:
        """Add a model to a specific group."""
        if group_name not in self.groups:
            self.groups[group_name] = ModelGroup(name=group_name, models=[])
            
        # Check if model already exists in group
        if not any(m.id == model.id for m in self.groups[group_name].models):
            self.groups[group_name].models.append(model)
        
    def get_model(self, model_id: str) -> Optional[Model]:
        """Get a model by its ID."""
        return self.models.get(model_id)
        
    def list_models(self) -> List[Model]:
        """List all registered models."""
        return list(self.models.values())
        
    def list_groups(self) -> List[ModelGroup]:
        """List all model groups."""
        return list(self.groups.values())
        
    def get_group(self, group_name: str) -> Optional[ModelGroup]:
        """Get a specific model group."""
        return self.groups.get(group_name)
        
    def update_model_status(self, model_id: str, status: ModelStatus, error: Optional[str] = None) -> None:
        """Update the status of a model."""
        if model_id in self.models:
            self.models[model_id].status = status
            if error:
                self.models[model_id].error = error
            logger.info(f"Updated model {model_id} status to {status}")
            
    def get_default_model(self) -> Optional[Model]:
        """Get the default model."""
        if self.default_model_id:
            return self.get_model(self.default_model_id)
        return None
        
    def set_default_model(self, model_id: str) -> None:
        """Set the default model."""
        if model_id in self.models:
            self.default_model_id = model_id
            logger.info(f"Set default model to {model_id}")
        else:
            logger.warning(f"Attempted to set default model to unknown ID: {model_id}")
            
    def register_fallback_chain(self, chain: FallbackChain) -> None:
        """Register a fallback chain."""
        self.fallback_chains[chain.name] = chain
        if chain.is_default:
            self.default_fallback_chain_id = chain.name
        logger.info(f"Registered fallback chain: {chain.name}")
        
    def get_fallback_chain(self, chain_id: str) -> Optional[FallbackChain]:
        """Get a fallback chain by ID."""
        return self.fallback_chains.get(chain_id)
        
    def list_fallback_chains(self) -> List[FallbackChain]:
        """List all fallback chains."""
        return list(self.fallback_chains.values())
        
    def get_default_fallback_chain(self) -> Optional[FallbackChain]:
        """Get the default fallback chain."""
        if self.default_fallback_chain_id:
            return self.get_fallback_chain(self.default_fallback_chain_id)
        return None
        
    def set_default_fallback_chain(self, chain_id: str) -> None:
        """Set the default fallback chain."""
        if chain_id in self.fallback_chains:
            self.default_fallback_chain_id = chain_id
            logger.info(f"Set default fallback chain to {chain_id}")
            
    def set_user_preferences(self, user_id: str, preferences: ModelPreferences) -> None:
        """Set model preferences for a specific user."""
        self.user_preferences[user_id] = preferences
        logger.info(f"Updated model preferences for user {user_id}")
        
    def get_user_preferences(self, user_id: str) -> Optional[ModelPreferences]:
        """Get model preferences for a specific user."""
        return self.user_preferences.get(user_id)
        
    def update_model_metrics(self, model_id: str, 
                            response_time: Optional[float] = None,
                            success: Optional[bool] = None) -> None:
        """Update usage metrics for a model."""
        if model_id not in self.models:
            return
            
        model = self.models[model_id]
        if not model.metrics:
            from app.models.ai_models import ModelMetrics
            model.metrics = ModelMetrics()
            
        if response_time is not None:
            # Update average response time
            if model.metrics.avg_response_time is None:
                model.metrics.avg_response_time = response_time
            else:
                # Simple moving average
                if model.metrics.usage_count:
                    weight = min(0.1, 1.0 / model.metrics.usage_count)
                    model.metrics.avg_response_time = (
                        (1 - weight) * model.metrics.avg_response_time +
                        weight * response_time
                    )
                    
        # Update success metrics
        if success is not None:
            if success:
                model.metrics.usage_count = (model.metrics.usage_count or 0) + 1
            else:
                model.metrics.error_count = (model.metrics.error_count or 0) + 1
                
            # Calculate success rate
            total = (model.metrics.usage_count or 0) + (model.metrics.error_count or 0)
            if total > 0:
                model.metrics.success_rate = (model.metrics.usage_count or 0) / total
                
        # Update last used timestamp
        model.metrics.last_used = datetime.now().isoformat()
        
    def get_model_for_task(self, task_type: str, 
                          max_size: Optional[ModelSize] = None,
                          required_capabilities: Optional[List[ModelCapability]] = None) -> Optional[Model]:
        """
        Get the best available model for a specific task type, considering constraints.
        """
        available_models = [m for m in self.models.values() if m.status == ModelStatus.AVAILABLE]
        
        # Filter by size if specified
        if max_size:
            size_values = {s.value: i for i, s in enumerate(ModelSize)}
            max_size_idx = size_values.get(max_size.value, 0)
            available_models = [
                m for m in available_models
                if size_values.get(m.size.value, 0) <= max_size_idx
            ]
            
        # Filter by required capabilities
        if required_capabilities:
            available_models = [
                m for m in available_models
                if all(cap in m.capabilities for cap in required_capabilities)
            ]
            
        # If no models match, return None
        if not available_models:
            return None
            
        # Find best model for task
        if task_type == "code":
            # Prefer code-specialized models
            code_models = [m for m in available_models if ModelCapability.CODE in m.capabilities]
            if code_models:
                # Sort by success rate and size
                code_models.sort(
                    key=lambda m: (
                        m.metrics.success_rate if m.metrics and m.metrics.success_rate else 0,
                        size_values.get(m.size.value, 0)
                    ),
                    reverse=True
                )
                return code_models[0]
                
        # Default sorting by metrics and size
        available_models.sort(
            key=lambda m: (
                m.metrics.success_rate if m.metrics and m.metrics.success_rate else 0,
                size_values.get(m.size.value, 0)
            ),
            reverse=True
        )
        
        return available_models[0] if available_models else None
        
    def clear(self) -> None:
        """Clear all registry data."""
        self.models = {}
        self.groups = {}
        self.fallback_chains = {}
        self.default_model_id = None
        self.default_fallback_chain_id = None
        self._initialize_defaults()
        logger.info("Registry cleared and reinitialized with defaults")

# Global registry instance
model_registry = ModelRegistry()

# Singleton accessor function
def get_model_registry() -> ModelRegistry:
    return model_registry