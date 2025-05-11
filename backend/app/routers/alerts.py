"""Alert rules router for Sentry API integration."""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator

from app.dependencies import get_sentry_client, get_current_user
from app.services.sentry_client import SentryApiClient


router = APIRouter(
    prefix="/api/v1/projects/{project}",
    tags=["alerts"],
    responses={404: {"description": "Not found"}},
)


class AlertRuleCondition(BaseModel):
    """Alert rule condition model."""
    id: str
    value: Optional[Any] = None
    comparison_type: Optional[str] = None
    interval: Optional[str] = None


class AlertRuleFilter(BaseModel):
    """Alert rule filter model."""
    id: str
    value: Optional[Any] = None
    comparison_type: Optional[str] = None
    time: Optional[str] = None
    targetType: Optional[str] = None
    targetIdentifier: Optional[str] = None


class AlertRuleAction(BaseModel):
    """Alert rule action model."""
    id: str
    targetType: Optional[str] = None
    targetIdentifier: Optional[str] = None
    integration: Optional[int] = None
    fallthroughType: Optional[str] = None
    workspace: Optional[int] = None
    channel: Optional[str] = None
    channel_id: Optional[str] = None
    tags: Optional[str] = None
    team: Optional[int] = None
    project: Optional[str] = None
    issue_type: Optional[str] = None
    dynamic_form_fields: Optional[List[Dict]] = None


class IssueAlertRule(BaseModel):
    """Issue alert rule model."""
    name: str
    actionMatch: str = Field(..., regex="^(all|any|none)$")
    conditions: List[AlertRuleCondition]
    actions: List[AlertRuleAction]
    frequency: int = Field(..., ge=5, le=43200)
    environment: Optional[str] = None
    filterMatch: Optional[str] = Field(None, regex="^(all|any|none)$")
    filters: Optional[List[AlertRuleFilter]] = None
    owner: Optional[str] = None


class MetricAlertTrigger(BaseModel):
    """Metric alert trigger model."""
    label: str = Field(..., regex="^(critical|warning)$")
    alertThreshold: float
    actions: List[AlertRuleAction] = []


class MetricAlertRule(BaseModel):
    """Metric alert rule model."""
    name: str = Field(..., max_length=256)
    aggregate: str
    timeWindow: int = Field(..., regex="^(1|5|10|15|30|60|120|240|1440)$")
    projects: List[str]
    query: str
    thresholdType: int = Field(..., regex="^(0|1)$")
    triggers: List[MetricAlertTrigger]
    environment: Optional[str] = None
    dataset: Optional[str] = "events"
    queryType: Optional[int] = None
    eventTypes: Optional[List[str]] = None
    comparisonDelta: Optional[int] = None
    resolveThreshold: Optional[float] = None
    owner: Optional[str] = None


class AlertRuleResponse(BaseModel):
    """Alert rule response model."""
    id: str
    name: str
    dateCreated: str
    createdBy: Optional[Dict] = None
    environment: Optional[str] = None
    projects: List[str]
    status: str
    type: str  # "issue" or "metric"


@router.get("/rules", response_model=List[AlertRuleResponse])
async def list_alert_rules(
    project: str,
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    current_user: dict = Depends(get_current_user)
) -> List[AlertRuleResponse]:
    """List all alert rules for a project."""
    try:
        # Get both issue and metric alert rules
        issue_rules = await sentry_client.list_issue_alert_rules(current_user["org"], project)
        metric_rules = await sentry_client.list_metric_alert_rules(current_user["org"])
        
        # Filter metric rules for the current project
        project_metric_rules = [
            rule for rule in metric_rules.get("data", [])
            if project in rule.get("projects", [])
        ]
        
        # Combine and format response
        rules = []
        
        # Process issue rules
        for rule in issue_rules.get("data", []):
            rules.append(AlertRuleResponse(
                id=rule["id"],
                name=rule["name"],
                dateCreated=rule.get("dateCreated", ""),
                createdBy=rule.get("createdBy"),
                environment=rule.get("environment"),
                projects=[project],
                status=rule.get("status", "enabled"),
                type="issue"
            ))
        
        # Process metric rules
        for rule in project_metric_rules:
            rules.append(AlertRuleResponse(
                id=rule["id"],
                name=rule["name"],
                dateCreated=rule.get("dateCreated", ""),
                createdBy=rule.get("createdBy"),
                environment=rule.get("environment"),
                projects=rule.get("projects", []),
                status=rule.get("status", "enabled"),
                type="metric"
            ))
        
        return rules
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list alert rules: {str(e)}")


@router.post("/rules", response_model=AlertRuleResponse)
async def create_alert_rule(
    project: str,
    rule_type: str,
    rule_data: Dict[str, Any],
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    current_user: dict = Depends(get_current_user)
) -> AlertRuleResponse:
    """Create a new alert rule."""
    try:
        if rule_type == "issue":
            # Validate and create issue alert rule
            rule = IssueAlertRule(**rule_data)
            response = await sentry_client.create_issue_alert_rule(
                current_user["org"], project, rule.dict()
            )
        elif rule_type == "metric":
            # Validate and create metric alert rule
            rule = MetricAlertRule(**rule_data)
            response = await sentry_client.create_metric_alert_rule(
                current_user["org"], rule.dict()
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid rule type")
        
        return AlertRuleResponse(
            id=response["id"],
            name=response["name"],
            dateCreated=response.get("dateCreated", ""),
            createdBy=response.get("createdBy"),
            environment=response.get("environment"),
            projects=response.get("projects", [project]),
            status=response.get("status", "enabled"),
            type=rule_type
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid rule data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert rule: {str(e)}")


@router.put("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    project: str,
    rule_id: str,
    rule_type: str,
    rule_data: Dict[str, Any],
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    current_user: dict = Depends(get_current_user)
) -> AlertRuleResponse:
    """Update an existing alert rule."""
    try:
        if rule_type == "issue":
            # Validate and update issue alert rule
            rule = IssueAlertRule(**rule_data)
            response = await sentry_client.update_issue_alert_rule(
                current_user["org"], project, rule_id, rule.dict()
            )
        elif rule_type == "metric":
            # Validate and update metric alert rule
            rule = MetricAlertRule(**rule_data)
            response = await sentry_client.update_metric_alert_rule(
                current_user["org"], rule_id, rule.dict()
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid rule type")
        
        return AlertRuleResponse(
            id=response["id"],
            name=response["name"],
            dateCreated=response.get("dateCreated", ""),
            createdBy=response.get("createdBy"),
            environment=response.get("environment"),
            projects=response.get("projects", [project]),
            status=response.get("status", "enabled"),
            type=rule_type
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid rule data: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update alert rule: {str(e)}")


@router.delete("/rules/{rule_id}")
async def delete_alert_rule(
    project: str,
    rule_id: str,
    rule_type: str,
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, str]:
    """Delete an alert rule."""
    try:
        if rule_type == "issue":
            await sentry_client.delete_issue_alert_rule(
                current_user["org"], project, rule_id
            )
        elif rule_type == "metric":
            await sentry_client.delete_metric_alert_rule(
                current_user["org"], rule_id
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid rule type")
        
        return {"status": "success", "message": f"Alert rule {rule_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete alert rule: {str(e)}")


@router.get("/rules/{rule_id}")
async def get_alert_rule(
    project: str,
    rule_id: str,
    rule_type: str,
    sentry_client: SentryApiClient = Depends(get_sentry_client),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get details for a specific alert rule."""
    try:
        if rule_type == "issue":
            response = await sentry_client.get_issue_alert_rule(
                current_user["org"], project, rule_id
            )
        elif rule_type == "metric":
            response = await sentry_client.get_metric_alert_rule(
                current_user["org"], rule_id
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid rule type")
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alert rule: {str(e)}")
