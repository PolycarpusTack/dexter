# Enhanced issues router with path resolution
from fastapi import APIRouter, Depends, Query, status
from typing import Dict, Any, Optional
import logging

from ..services.enhanced_sentry_client import EnhancedSentryClient, get_enhanced_sentry_client
from ..services.config_service import ConfigService, get_config_service
from ..models.issues import IssueStatusUpdate
from ..utils.error_handling import SentryAPIError

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/{organization_slug}/projects/{project_slug}/issues",
    response_model=None,
    summary="List Project Issues",
    description="Retrieve a paginated list of Sentry issues for a project."
)
async def list_issues(
    organization_slug: str,
    project_slug: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    query: Optional[str] = Query(None, description="Search query"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Get a list of issues for a project using enhanced path resolution"""
    try:
        result = await sentry_client.list_project_issues(
            organization_slug=organization_slug,
            project_slug=project_slug,
            query=query,
            cursor=cursor,
            status=status
        )
        return result
    except Exception as e:
        logger.exception(f"Error listing issues: {e}")
        if isinstance(e, SentryAPIError):
            raise
        raise SentryAPIError(message=f"Failed to list issues: {str(e)}")


@router.get(
    "/{organization_slug}/issues/{issue_id}",
    response_model=Dict[str, Any],
    summary="Get Issue Details",
    description="Retrieve details for a specific issue."
)
async def get_issue_details(
    organization_slug: str,
    issue_id: str,
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Get details for a specific issue using enhanced path resolution"""
    try:
        result = await sentry_client.get_issue_details(
            organization_slug=organization_slug,
            issue_id=issue_id
        )
        return result
    except Exception as e:
        logger.exception(f"Error getting issue details: {e}")
        if isinstance(e, SentryAPIError):
            raise
        raise SentryAPIError(message=f"Failed to get issue details: {str(e)}")


@router.put(
    "/{organization_slug}/issues/{issue_id}/status",
    response_model=Dict[str, Any],
    summary="Update Issue Status",
    description="Update the status of a Sentry issue."
)
async def update_issue_status(
    organization_slug: str,
    issue_id: str,
    status_update: IssueStatusUpdate,
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Update the status of a Sentry issue using enhanced path resolution"""
    try:
        result = await sentry_client.update_issue_status(
            issue_id=issue_id,
            status=status_update.status,
            organization_slug=organization_slug
        )
        return result
    except Exception as e:
        logger.exception(f"Error updating issue status: {e}")
        if isinstance(e, SentryAPIError):
            raise
        raise SentryAPIError(message=f"Failed to update issue status: {str(e)}")


# New endpoints that were missing
@router.put(
    "/{organization_slug}/issues/{issue_id}/assign",
    response_model=Dict[str, Any],
    summary="Assign Issue",
    description="Assign an issue to a user."
)
async def assign_issue(
    organization_slug: str,
    issue_id: str,
    assignee: Dict[str, Any],
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Assign an issue to a user using enhanced path resolution"""
    try:
        params = {
            'organization_slug': organization_slug,
            'issue_id': issue_id,
        }
        
        data = {
            'assignedTo': assignee.get('assignee') or assignee.get('id')
        }
        
        result = await sentry_client.call_endpoint('assign_issue', params, data)
        return result
    except Exception as e:
        logger.exception(f"Error assigning issue: {e}")
        if isinstance(e, SentryAPIError):
            raise
        raise SentryAPIError(message=f"Failed to assign issue: {str(e)}")


@router.get(
    "/{organization_slug}/issues/{issue_id}/tags",
    response_model=Dict[str, Any],
    summary="List Issue Tags",
    description="List tags for an issue."
)
async def list_issue_tags(
    organization_slug: str,
    issue_id: str,
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """List tags for an issue using enhanced path resolution"""
    try:
        params = {
            'organization_slug': organization_slug,
            'issue_id': issue_id,
        }
        
        result = await sentry_client.call_endpoint('list_issue_tags', params)
        return result
    except Exception as e:
        logger.exception(f"Error listing issue tags: {e}")
        if isinstance(e, SentryAPIError):
            raise
        raise SentryAPIError(message=f"Failed to list issue tags: {str(e)}")


@router.post(
    "/{organization_slug}/issues/{issue_id}/tags",
    response_model=Dict[str, Any],
    summary="Add Issue Tags",
    description="Add tags to an issue."
)
async def add_issue_tags(
    organization_slug: str,
    issue_id: str,
    tags: Dict[str, list[str]],
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Add tags to an issue using enhanced path resolution"""
    try:
        params = {
            'organization_slug': organization_slug,
            'issue_id': issue_id,
        }
        
        result = await sentry_client.call_endpoint('add_issue_tags', params, tags)
        return result
    except Exception as e:
        logger.exception(f"Error adding issue tags: {e}")
        if isinstance(e, SentryAPIError):
            raise
        raise SentryAPIError(message=f"Failed to add issue tags: {str(e)}")


@router.put(
    "/{organization_slug}/projects/{project_slug}/issues",
    response_model=Dict[str, Any],
    summary="Bulk Update Issues",
    description="Bulk update multiple issues."
)
async def bulk_update_issues(
    organization_slug: str,
    project_slug: str,
    updates: Dict[str, Any],
    status: Optional[str] = Query(None, description="Filter by status"),
    id: Optional[list[str]] = Query(None, description="Issue IDs to update"),
    sentry_client: EnhancedSentryClient = Depends(get_enhanced_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Bulk update multiple issues using enhanced path resolution"""
    try:
        params = {
            'organization_slug': organization_slug,
            'project_slug': project_slug,
        }
        
        if status:
            params['status'] = status
        if id:
            params['id'] = id
        
        result = await sentry_client.call_endpoint('bulk_update_issues', params, updates)
        return result
    except Exception as e:
        logger.exception(f"Error in bulk update: {e}")
        if isinstance(e, SentryAPIError):
            raise
        raise SentryAPIError(message=f"Failed to bulk update issues: {str(e)}")
