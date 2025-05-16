"""Organization-level alert rules router for Sentry API integration."""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import logging

# Import from our common utility module
from app.utils.pydantic_compat import pattern_field

logger = logging.getLogger(__name__)

# Try to import dependencies, but don't fail if they're not available
try:
    from app.dependencies import get_sentry_client, get_current_user
    from app.services.sentry_client import SentryApiClient
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Dependencies not available: {e}. Alert rules functionality will be limited.")
    DEPENDENCIES_AVAILABLE = False
    
    # Create dummy dependency functions if real ones aren't available
    async def get_sentry_client():
        return None
        
    async def get_current_user(*args, **kwargs):
        return {"id": "dev-user", "username": "dev", "org": "sentry", "email": "dev@example.com"}

router = APIRouter(
    prefix="/api/v1/organizations/{organization_slug}",
    tags=["alerts-org"],
    responses={404: {"description": "Not found"}},
)

# Reuse the models from the original alerts router
from .alerts import (
    AlertRuleCondition,
    AlertRuleFilter,
    AlertRuleAction,
    AlertRuleResponse,
    IssueAlertRule,
    MetricAlertRule
)

# Create request models specific to organization alerts
class CreateAlertRuleRequest(BaseModel):
    """Request model for creating alert rules."""
    dataset: str = Field(default="events", pattern="^(events|metrics)$")
    projects: List[str]
    name: str
    conditions: Optional[List[AlertRuleCondition]] = None
    actions: Optional[List[AlertRuleAction]] = None
    filters: Optional[List[AlertRuleFilter]] = None
    aggregate: Optional[str] = None
    timeWindow: Optional[int] = None
    query: Optional[str] = None
    triggers: Optional[List[Dict]] = None
    environment: Optional[str] = None
    
class UpdateAlertRuleRequest(BaseModel):
    """Request model for updating alert rules."""
    name: Optional[str] = None
    conditions: Optional[List[AlertRuleCondition]] = None
    actions: Optional[List[AlertRuleAction]] = None
    filters: Optional[List[AlertRuleFilter]] = None
    environment: Optional[str] = None
    aggregate: Optional[str] = None
    timeWindow: Optional[int] = None
    query: Optional[str] = None
    triggers: Optional[List[Dict]] = None

@router.get("/alert-rules", response_model=List[AlertRuleResponse])
async def list_organization_alert_rules(
    organization_slug: str,
    project: Optional[str] = None,
    sentry_client: SentryApiClient = Depends(get_sentry_client)
) -> List[AlertRuleResponse]:
    """List all alert rules for an organization, optionally filtered by project."""
    try:
        # Get all alert rules for the organization
        # If project is specified, filter by project
        issue_rules = await sentry_client.list_issue_alert_rules(organization_slug, project or "*")
        metric_rules = await sentry_client.list_metric_alert_rules(organization_slug)
        
        # Combine and format the rules
        all_rules = []
        
        # Format issue rules
        for rule in issue_rules.get("data", []):
            all_rules.append(AlertRuleResponse(
                id=rule["id"],
                name=rule["name"],
                status=rule.get("status", "active"),
                conditions=rule.get("conditions", []),
                filters=rule.get("filters", []),
                actions=rule.get("actions", []),
                dateCreated=rule.get("dateCreated"),
                dateModified=rule.get("dateModified"),
                createdBy=rule.get("createdBy"),
                environment=rule.get("environment"),
                frequency=rule.get("frequency"),
                dataset="events",
                queryType="event",
                query=rule.get("query"),
            ))
            
        # Format metric rules
        for rule in metric_rules.get("data", []):
            # If project filter is specified, only include rules for that project
            if project and project not in rule.get("projects", []):
                continue
            
            all_rules.append(AlertRuleResponse(
                id=rule["id"],
                name=rule["name"],
                status=rule.get("status", "active"),
                conditions=rule.get("triggers", []),
                filters=[],
                actions=rule.get("actions", []),
                dateCreated=rule.get("dateCreated"),
                dateModified=rule.get("dateModified"),
                createdBy=rule.get("createdBy"),
                environment=rule.get("environment"),
                aggregation=rule.get("aggregate"),
                timeWindow=rule.get("timeWindow"),
                dataset="metrics",
                queryType="metric",
                query=rule.get("query"),
                includeAllProjects=rule.get("includeAllProjects", False),
                owner=rule.get("owner"),
            ))
        
        return all_rules
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Failed to list alert rules: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list alert rules: {str(e)}")

@router.post("/alert-rules", response_model=AlertRuleResponse)
async def create_organization_alert_rule(
    organization_slug: str,
    rule: CreateAlertRuleRequest,
    sentry_client: SentryApiClient = Depends(get_sentry_client)
) -> AlertRuleResponse:
    """Create a new alert rule for the organization."""
    try:
        # For organization-level endpoint, require project to be specified in the rule
        if not rule.project and not rule.projects:
            raise HTTPException(status_code=400, detail="Project must be specified for alert rules")
        
        project = rule.project or (rule.projects[0] if rule.projects else None)
        
        rule_data = rule.model_dump(exclude_unset=True)
        
        # Create the appropriate type of rule
        if rule.dataset == "events":
            result = await sentry_client.create_issue_alert_rule(organization_slug, project, rule_data)
        else:
            result = await sentry_client.create_metric_alert_rule(organization_slug, rule_data)
            
        return AlertRuleResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create alert rule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create alert rule: {str(e)}")

@router.get("/alert-rules/{rule_id}", response_model=AlertRuleResponse)
async def get_organization_alert_rule(
    organization_slug: str,
    rule_id: str,
    sentry_client: SentryApiClient = Depends(get_sentry_client)
) -> AlertRuleResponse:
    """Get a specific alert rule by ID."""
    try:
        # Try to get as issue rule first
        try:
            rule = await sentry_client.get_issue_alert_rule(organization_slug, rule_id)
            rule["dataset"] = "events"
            rule["queryType"] = "event"
        except HTTPException as e:
            if e.status_code == 404:
                # Try as metric rule
                rule = await sentry_client.get_metric_alert_rule(organization_slug, rule_id)
                rule["dataset"] = "metrics"
                rule["queryType"] = "metric"
            else:
                raise
                
        return AlertRuleResponse(**rule)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get alert rule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get alert rule: {str(e)}")

@router.put("/alert-rules/{rule_id}", response_model=AlertRuleResponse)
async def update_organization_alert_rule(
    organization_slug: str,
    rule_id: str,
    rule: UpdateAlertRuleRequest,
    sentry_client: SentryApiClient = Depends(get_sentry_client)
) -> AlertRuleResponse:
    """Update an existing alert rule."""
    try:
        rule_data = rule.model_dump(exclude_unset=True)
        
        # Get existing rule to determine type
        existing_rule = await get_organization_alert_rule(organization_slug, rule_id, sentry_client)
        
        # Update the appropriate type of rule
        if existing_rule.dataset == "events":
            result = await sentry_client.update_issue_alert_rule(organization_slug, rule_id, rule_data)
        else:
            result = await sentry_client.update_metric_alert_rule(organization_slug, rule_id, rule_data)
            
        return AlertRuleResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update alert rule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update alert rule: {str(e)}")

@router.delete("/alert-rules/{rule_id}")
async def delete_organization_alert_rule(
    organization_slug: str,
    rule_id: str,
    sentry_client: SentryApiClient = Depends(get_sentry_client)
):
    """Delete an alert rule."""
    try:
        # Get existing rule to determine type
        existing_rule = await get_organization_alert_rule(organization_slug, rule_id, sentry_client)
        
        # Delete the appropriate type of rule
        if existing_rule.dataset == "events":
            await sentry_client.delete_issue_alert_rule(organization_slug, rule_id)
        else:
            await sentry_client.delete_metric_alert_rule(organization_slug, rule_id)
            
        return {"status": "deleted", "id": rule_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete alert rule: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete alert rule: {str(e)}")