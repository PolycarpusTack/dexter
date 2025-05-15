"""
Router for template management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Dict, List, Optional, Any

from ..models.template_models import (
    CreateTemplateRequest,
    UpdateTemplateRequest,
    PromptTemplate,
    TemplateCategory,
    TemplateListResponse,
    TemplateResponse,
    RenderTemplateRequest,
    RenderTemplateResponse,
    TemplateSearchRequest,
    TemplateType,
    TemplateVersion
)
from ..services.template_service import TemplateService, get_template_service

router = APIRouter(prefix="/templates", tags=["templates"])

@router.get("/", response_model=TemplateListResponse)
async def list_templates(
    query: Optional[str] = None,
    category: Optional[TemplateCategory] = None,
    type: Optional[TemplateType] = None,
    is_default: Optional[bool] = None,
    is_public: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    template_service: TemplateService = Depends(get_template_service)
):
    """
    List templates with optional filtering.
    """
    search_request = TemplateSearchRequest(
        query=query,
        categories=[category] if category else None,
        types=[type] if type else None,
        is_default=is_default,
        is_public=is_public,
        limit=limit,
        offset=offset
    )
    
    templates, total, category_counts = template_service.list_templates(search_request)
    
    return TemplateListResponse(
        templates=templates,
        total=total,
        categories=category_counts
    )

@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_request: CreateTemplateRequest,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Create a new template.
    """
    template = template_service.create_template(template_request)
    
    return TemplateResponse(template=template)

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    version: Optional[str] = None,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Get a template by ID with optional version.
    """
    if version:
        # Get a specific version
        template = template_service.get_template(template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template with ID {template_id} not found"
            )
            
        # Get the specific version
        version_obj = template_service.get_template_version(template_id, version)
        if not version_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Version {version} not found for template {template_id}"
            )
            
        # Create a copy with the specific version set as latest
        # This is done in the service.get_template method
    else:
        template = template_service.get_template(template_id)
        
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )
    
    return TemplateResponse(template=template)

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_request: UpdateTemplateRequest,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Update a template by ID.
    """
    template = template_service.update_template(template_id, template_request)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )
    
    return TemplateResponse(template=template)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Delete a template by ID.
    """
    success = template_service.delete_template(template_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )
    
    return None

@router.post("/{template_id}/render", response_model=RenderTemplateResponse)
async def render_template(
    template_id: str,
    render_request: Dict[str, Any],
    version: Optional[str] = None,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Render a template with variables.
    """
    template = template_service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )
    
    try:
        rendered_content = template_service.render_template(
            template_id=template_id,
            variables=render_request,
            version=version
        )
        
        if rendered_content is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template with ID {template_id} not found"
            )
        
        return RenderTemplateResponse(
            rendered_content=rendered_content,
            template_id=template_id,
            template_name=template.name,
            version=version or template.latest_version
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{template_id}/versions", response_model=List[TemplateVersion])
async def get_template_versions(
    template_id: str,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Get all versions of a template.
    """
    template = template_service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )
    
    return template.versions

@router.get("/categories/{category}/defaults", response_model=List[PromptTemplate])
async def get_default_templates(
    category: TemplateCategory,
    type: Optional[TemplateType] = None,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Get default templates for a category.
    """
    template = template_service.find_template_by_category(category, type)
    
    if not template:
        return []
    
    return [template]

@router.post("/{template_id}/set-as-default", response_model=TemplateResponse)
async def set_template_as_default(
    template_id: str,
    template_service: TemplateService = Depends(get_template_service)
):
    """
    Set a template as the default for its category.
    """
    template = template_service.get_template(template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template with ID {template_id} not found"
        )
    
    # Create update request to set as default
    update_request = UpdateTemplateRequest(is_default=True)
    updated_template = template_service.update_template(template_id, update_request)
    
    return TemplateResponse(template=updated_template)