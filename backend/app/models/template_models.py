"""
Template models for prompt template management system.
"""
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
import uuid

from app.models.common import BaseResponse


class TemplateCategory(str, Enum):
    """Categories for prompt templates."""
    GENERAL = "general"
    DATABASE = "database"
    NETWORK = "network"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    SYNTAX = "syntax"
    REFERENCE = "reference"
    TYPE = "type"
    MEMORY = "memory"
    DEADLOCK = "deadlock"
    TIMEOUT = "timeout"
    CONFIGURATION = "configuration"
    DEPENDENCY = "dependency"
    CUSTOM = "custom"


class TemplateType(str, Enum):
    """Types of prompt templates."""
    SYSTEM = "system"  # System prompt
    USER = "user"      # User prompt
    COMBINED = "combined"  # Combined system and user prompt


class TemplateVariable(BaseModel):
    """Variable that can be used in a template."""
    name: str = Field(..., description="Variable name")
    description: str = Field(..., description="Description of what the variable represents")
    required: bool = Field(False, description="Whether the variable is required")
    default_value: Optional[str] = Field(None, description="Default value if not provided")
    example: Optional[str] = Field(None, description="Example value")


class TemplateVersion(BaseModel):
    """Version information for a template."""
    version: str = Field(..., description="Version number (e.g., '1.0.0')")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    content: str = Field(..., description="Template content")
    changes: Optional[str] = Field(None, description="Description of changes in this version")


class PromptTemplate(BaseModel):
    """Model for a prompt template."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique identifier")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: TemplateCategory = Field(..., description="Template category")
    type: TemplateType = Field(..., description="Template type")
    
    # Variables defined in this template
    variables: List[TemplateVariable] = Field(default_factory=list, description="Variables used in the template")
    
    # Version management - stores multiple versions of the template
    versions: List[TemplateVersion] = Field(..., description="Template versions")
    latest_version: str = Field(..., description="Latest version identifier")
    
    # Metadata
    author: Optional[str] = Field(None, description="Template author")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    is_default: bool = Field(False, description="Whether this is a default template")
    is_public: bool = Field(False, description="Whether this template is publicly available")
    tags: List[str] = Field(default_factory=list, description="Tags for this template")
    
    # Additional metadata
    model_specific: Optional[Dict[str, Any]] = Field(None, description="Model-specific configuration")
    provider_specific: Optional[Dict[str, Any]] = Field(None, description="Provider-specific configuration")
    
    @validator('versions')
    def validate_versions(cls, v):
        """Validate that there is at least one version."""
        if not v or len(v) == 0:
            raise ValueError("Template must have at least one version")
        return v
    
    @validator('latest_version')
    def validate_latest_version(cls, v, values):
        """Validate that the latest version exists in the versions list."""
        if 'versions' in values and values['versions']:
            available_versions = [version.version for version in values['versions']]
            if v not in available_versions:
                raise ValueError(f"Latest version '{v}' not found in versions list: {available_versions}")
        return v
    
    def get_latest_content(self) -> str:
        """Get the content of the latest version."""
        for version in self.versions:
            if version.version == self.latest_version:
                return version.content
        raise ValueError(f"Latest version '{self.latest_version}' not found in versions list")
    
    def render(self, variables: Dict[str, Any]) -> str:
        """Render the template with the given variables."""
        content = self.get_latest_content()
        
        # Apply variable substitution
        for var in self.variables:
            var_name = var.name
            var_value = variables.get(var_name, var.default_value)
            
            # Check if required variable is missing
            if var.required and var_value is None:
                raise ValueError(f"Required variable '{var_name}' is missing")
                
            # Replace variable in template
            if var_value is not None:
                content = content.replace(f"{{{var_name}}}", str(var_value))
                
        return content


class TemplateListResponse(BaseResponse):
    """Response model for listing templates."""
    templates: List[PromptTemplate] = Field(default_factory=list, description="List of templates")
    total: int = Field(..., description="Total number of templates")
    categories: Dict[TemplateCategory, int] = Field(default_factory=dict, description="Count of templates by category")


class TemplateResponse(BaseResponse):
    """Response model for a single template."""
    template: PromptTemplate = Field(..., description="The template")


class CreateTemplateRequest(BaseModel):
    """Request model for creating a template."""
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: TemplateCategory = Field(..., description="Template category")
    type: TemplateType = Field(..., description="Template type")
    content: str = Field(..., description="Template content")
    variables: List[TemplateVariable] = Field(default_factory=list, description="Variables used in the template")
    author: Optional[str] = Field(None, description="Template author")
    is_default: bool = Field(False, description="Whether this is a default template")
    is_public: bool = Field(False, description="Whether this template is publicly available")
    tags: List[str] = Field(default_factory=list, description="Tags for this template")
    model_specific: Optional[Dict[str, Any]] = Field(None, description="Model-specific configuration")
    provider_specific: Optional[Dict[str, Any]] = Field(None, description="Provider-specific configuration")


class UpdateTemplateRequest(BaseModel):
    """Request model for updating a template."""
    name: Optional[str] = Field(None, description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    category: Optional[TemplateCategory] = Field(None, description="Template category")
    type: Optional[TemplateType] = Field(None, description="Template type")
    content: Optional[str] = Field(None, description="New template content version")
    version_changes: Optional[str] = Field(None, description="Description of changes in this version")
    variables: Optional[List[TemplateVariable]] = Field(None, description="Variables used in the template")
    is_default: Optional[bool] = Field(None, description="Whether this is a default template")
    is_public: Optional[bool] = Field(None, description="Whether this template is publicly available")
    tags: Optional[List[str]] = Field(None, description="Tags for this template")
    model_specific: Optional[Dict[str, Any]] = Field(None, description="Model-specific configuration")
    provider_specific: Optional[Dict[str, Any]] = Field(None, description="Provider-specific configuration")


class RenderTemplateRequest(BaseModel):
    """Request model for rendering a template."""
    template_id: str = Field(..., description="Template ID")
    variables: Dict[str, Any] = Field(default_factory=dict, description="Variables to apply to the template")
    version: Optional[str] = Field(None, description="Specific version to render (defaults to latest)")


class RenderTemplateResponse(BaseResponse):
    """Response model for a rendered template."""
    rendered_content: str = Field(..., description="Rendered template content")
    template_id: str = Field(..., description="Template ID")
    template_name: str = Field(..., description="Template name")
    version: str = Field(..., description="Version that was rendered")


class TemplateSearchRequest(BaseModel):
    """Request model for searching templates."""
    query: Optional[str] = Field(None, description="Search query")
    categories: Optional[List[TemplateCategory]] = Field(None, description="Filter by categories")
    types: Optional[List[TemplateType]] = Field(None, description="Filter by types")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    author: Optional[str] = Field(None, description="Filter by author")
    is_default: Optional[bool] = Field(None, description="Filter by default status")
    is_public: Optional[bool] = Field(None, description="Filter by public status")
    limit: int = Field(100, description="Maximum number of results to return")
    offset: int = Field(0, description="Offset for pagination")