# File: backend/app/routers/issues.py

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
from io import StringIO
import csv
import json
import httpx
from fastapi import Request

from ..services.sentry_client import SentryApiClient
from ..services.config_service import ConfigService, get_config_service
from ..models.issues import IssueSummary, IssuePagination, IssueResponse, IssueStatusUpdate, IssueAssignment
from ..utils.error_handling import SentryAPIError
from ..services.cache_service import cached, invalidate_issue_cache

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Dependencies ---
async def get_sentry_client():
    # Create a new httpx.AsyncClient for the SentryApiClient
    client = httpx.AsyncClient()
    try:
        sentry_client = SentryApiClient(client)
        yield sentry_client
    finally:
        await client.aclose()

# --- Routes ---
@router.get(
    "/organizations/{organization_slug}/projects/{project_slug}/issues",
    response_model=None,  # Use None to avoid pydantic validation
    summary="List Project Issues",
    description="Retrieve a paginated list of Sentry issues for a project."
)
async def list_issues(
    organization_slug: str,
    project_slug: str,
    status: Optional[str] = Query(None, description="Filter by status: 'unresolved', 'resolved', 'ignored', or 'all'"),
    query: Optional[str] = Query(None, description="Text search term"),
    cursor: Optional[str] = Query(None, description="Pagination cursor"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Get a list of issues for a project with optional filtering."""
    try:
        # Build the query string based on the status parameter
        query_str = query
        if not query_str and status and status != "all":
            query_str = f"is:{status}"
            
        result = await sentry_client.list_project_issues(
            organization_slug=organization_slug,
            project_slug=project_slug,
            query=query_str,
            cursor=cursor
        )
        
        # Debug logging
        logger.info(f"Issues response being returned: {result.keys() if isinstance(result, dict) else 'not a dict'}")
        
        return result
    except Exception as e:
        logger.exception(f"Error listing issues: {e}")
        # Use our custom error handling
        if isinstance(e, SentryAPIError):
            raise
        if isinstance(e, HTTPException):
            raise
        raise SentryAPIError(message=f"Failed to list issues: {str(e)}")

@router.get(
    "/organizations/{organization_slug}/issues/{issue_id}",
    response_model=Dict[str, Any],
    summary="Get Issue Details",
    description="Retrieve details for a specific issue."
)
@cached(ttl=60, prefix="get_issue")  # 1 minute TTL
async def get_issue_details(
    request: Request,
    organization_slug: str,
    issue_id: str,
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Get details for a specific issue."""
    try:
        result = await sentry_client.get_issue_details(
            organization_slug=organization_slug,
            issue_id=issue_id
        )
        return result
    except Exception as e:
        logger.exception(f"Error getting issue details: {e}")
        # Use our custom error handling
        if isinstance(e, SentryAPIError):
            raise
        if isinstance(e, HTTPException):
            raise
        raise SentryAPIError(message=f"Failed to get issue details: {str(e)}")
        
@router.get(
    "/{organization_slug}/projects/{project_slug}/issues/export",
    response_model=None,  # Custom response handling
    summary="Export Issues as CSV or JSON",
    description="Exports the currently filtered issue list in CSV or JSON format.",
)
async def export_issues(
    organization_slug: str,
    project_slug: str,
    format: str = Query("csv", description="Export format: 'csv' or 'json'"),
    status: Optional[str] = Query(None, description="Filter by status: 'unresolved', 'resolved', 'ignored', or 'all'"),
    query: Optional[str] = Query(None, description="Text search term"),
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    config_service: ConfigService = Depends(get_config_service),
):
    """Export issues in CSV or JSON format with optional filtering."""
    logger.info(f"Exporting issues for {organization_slug}/{project_slug} in {format} format")
    
    if format not in ["csv", "json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format must be 'csv' or 'json'"
        )
    
    try:
        # Build the query string based on the status parameter
        query_str = query
        if not query_str and status and status != "all":
            query_str = f"is:{status}"
        
        # Fetch all pages of issues based on filters
        # Note: This could be resource-intensive for large datasets
        all_issues = []
        cursor = None
        
        while True:
            issues_page = await sentry_client.list_project_issues(
                organization_slug=organization_slug,
                project_slug=project_slug,
                query=query_str,
                cursor=cursor
            )
            
            all_issues.extend(issues_page.get("data", []))
            
            # Check if there are more pages
            pagination = issues_page.get("pagination", {})
            cursor = pagination.get("next", {}).get("cursor")
            if not cursor:
                break
        
        logger.info(f"Fetched {len(all_issues)} issues for export")
        
        # Prepare the response based on the requested format
        if format == "csv":
            csv_content = create_csv_content(all_issues)
            return Response(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=sentry_issues_{project_slug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
        else:  # JSON format
            return Response(
                content=json.dumps(all_issues, indent=2),
                media_type="application/json",
                headers={
                    "Content-Disposition": f"attachment; filename=sentry_issues_{project_slug}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                }
            )
            
    except Exception as e:
        logger.exception(f"Error exporting issues: {e}")
        if isinstance(e, SentryAPIError):
            raise
        if isinstance(e, HTTPException):
            raise
        raise SentryAPIError(message=f"Failed to export issues: {str(e)}")

@router.put(
    "/issues/{issue_id}/status",
    response_model=Dict[str, Any],
    summary="Update Issue Status",
    description="Update the status of a Sentry issue (e.g., resolve, ignore)."
)
async def update_issue_status(
    issue_id: str,
    status_update: IssueStatusUpdate,
    request: Request,
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Update the status of a Sentry issue."""
    try:
        result = await sentry_client.update_issue_status(
            issue_id=issue_id,
            status=status_update.status
        )
        
        # Invalidate cache for this issue and the issues list
        await invalidate_issue_cache(request.app.state.cache, issue_id)
        
        return result
    except Exception as e:
        logger.exception(f"Error updating issue status: {e}")
        if isinstance(e, SentryAPIError):
            raise
        if isinstance(e, HTTPException):
            raise
        raise SentryAPIError(message=f"Failed to update issue status: {str(e)}")

@router.put(
    "/issues/{issue_id}/assign",
    response_model=Dict[str, Any],
    summary="Assign Issue",
    description="Assign a Sentry issue to a user."
)
async def assign_issue(
    issue_id: str,
    assignment: IssueAssignment,
    request: Request,
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Assign an issue to a user."""
    try:
        result = await sentry_client.assign_issue(
            issue_id=issue_id,
            assignee=assignment.assignee
        )
        
        # Invalidate cache for this issue and the issues list
        await invalidate_issue_cache(request.app.state.cache, issue_id)
        
        return result
    except Exception as e:
        logger.exception(f"Error assigning issue: {e}")
        if isinstance(e, SentryAPIError):
            raise
        if isinstance(e, HTTPException):
            raise
        raise SentryAPIError(message=f"Failed to assign issue: {str(e)}")

@router.post(
    "/issues/bulk",
    response_model=Dict[str, Any],
    summary="Bulk Operations on Issues",
    description="Perform bulk operations on multiple issues (status update, assignment, tagging)"
)
async def bulk_issue_operations(
    operations: List[Dict[str, Any]],
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    config_service: ConfigService = Depends(get_config_service)
):
    """Perform bulk operations on multiple issues.
    
    Each operation should include:
    - issue_id: The ID of the issue
    - operation_type: 'status' | 'assign' | 'tag'
    - data: The operation-specific data
    """
    results = []
    errors = []
    
    # Process operations in parallel
    async def process_operation(op: Dict[str, Any]) -> Dict[str, Any]:
        issue_id = op.get('issue_id')
        operation_type = op.get('operation_type')
        data = op.get('data', {})
        
        if not issue_id or not operation_type:
            return {
                'issue_id': issue_id,
                'success': False,
                'error': 'Missing issue_id or operation_type'
            }
        
        try:
            result = None
            if operation_type == 'status':
                result = await sentry_client.update_issue_status(issue_id, data.get('status'))
            elif operation_type == 'assign':
                result = await sentry_client.assign_issue(issue_id, data.get('assignee'))
            elif operation_type == 'tag':
                result = await sentry_client.add_issue_tags(issue_id, data.get('tags', []))
            else:
                return {
                    'issue_id': issue_id,
                    'success': False,
                    'error': f'Unknown operation type: {operation_type}'
                }
            
            return {
                'issue_id': issue_id,
                'success': True,
                'operation_type': operation_type,
                'result': result
            }
        except Exception as e:
            logger.exception(f"Error processing operation for issue {issue_id}: {e}")
            return {
                'issue_id': issue_id,
                'success': False,
                'error': str(e)
            }
    
    # Process all operations
    import asyncio
    tasks = [process_operation(op) for op in operations]
    completed_operations = await asyncio.gather(*tasks)
    
    # Separate successes and failures
    for result in completed_operations:
        if result['success']:
            results.append(result)
        else:
            errors.append(result)
    
    # Log the bulk operation
    logger.info(f"Bulk operation completed: {len(results)} successes, {len(errors)} failures")
    
    return {
        'total': len(operations),
        'succeeded': len(results),
        'failed': len(errors),
        'results': results,
        'errors': errors
    }

def create_csv_content(issues: List[Dict[str, Any]]) -> str:
    """Convert issues list to CSV format."""
    if not issues:
        return "No issues found"
    
    # Extract column headers from the first issue
    # Ensure we include common fields
    base_fields = [
        "id", "shortId", "title", "status", "culprit", 
        "lastSeen", "firstSeen", "count", "userCount", "project"
    ]
    
    # Optional fields that might be present
    optional_fields = ["level", "logger", "type", "annotations", "isSubscribed", "isBookmarked"]
    
    # Create a set of all available fields
    all_fields = set(base_fields)
    for issue in issues:
        all_fields.update(issue.keys())
    
    # Prioritize base fields, then include any additional fields
    csv_fields = base_fields + [f for f in sorted(all_fields) if f not in base_fields]
    
    # Create CSV
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=csv_fields)
    writer.writeheader()
    
    for issue in issues:
        # Handle nested 'project' field
        if "project" in issue and isinstance(issue["project"], dict):
            issue["project"] = issue["project"].get("slug", "unknown")
        
        # Write the row, filling in missing fields with empty strings
        writer.writerow({field: issue.get(field, "") for field in csv_fields})
    
    return output.getvalue()
