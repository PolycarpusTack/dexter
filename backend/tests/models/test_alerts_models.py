"""
Tests for Alert Rules Pydantic models.
"""

import pytest
from pydantic import ValidationError
from app.routers.alerts import (
    IssueAlertRule, MetricAlertRule, MetricAlertTrigger,
    AlertRuleCondition, AlertRuleFilter, AlertRuleAction
)


def test_issue_alert_rule():
    """Test IssueAlertRule model validation."""
    # Valid rule
    rule = IssueAlertRule(
        name="Test alert rule",
        actionMatch="all",
        conditions=[
            AlertRuleCondition(id="frequency", value=10)
        ],
        actions=[
            AlertRuleAction(id="email", targetIdentifier="user@example.com")
        ],
        frequency=60
    )
    
    assert rule.name == "Test alert rule"
    assert rule.actionMatch == "all"
    assert len(rule.conditions) == 1
    assert len(rule.actions) == 1
    
    # Invalid actionMatch should fail
    with pytest.raises(ValidationError):
        IssueAlertRule(
            name="Test alert rule",
            actionMatch="invalid",  # Not in allowed values
            conditions=[
                AlertRuleCondition(id="frequency", value=10)
            ],
            actions=[
                AlertRuleAction(id="email", targetIdentifier="user@example.com")
            ],
            frequency=60
        )
    
    # Invalid frequency (too low) should fail
    with pytest.raises(ValidationError):
        IssueAlertRule(
            name="Test alert rule",
            actionMatch="all",
            conditions=[
                AlertRuleCondition(id="frequency", value=10)
            ],
            actions=[
                AlertRuleAction(id="email", targetIdentifier="user@example.com")
            ],
            frequency=3  # Less than minimum 5
        )


def test_metric_alert_rule():
    """Test MetricAlertRule model validation."""
    # Valid rule
    rule = MetricAlertRule(
        name="Test metric alert",
        aggregate="count()",
        timeWindow=60,
        projects=["project1"],
        query="event.type:error",
        thresholdType=0,
        triggers=[
            MetricAlertTrigger(
                label="critical",
                alertThreshold=100.0
            )
        ]
    )
    
    assert rule.name == "Test metric alert"
    assert rule.aggregate == "count()"
    assert rule.timeWindow == 60
    assert rule.projects == ["project1"]
    
    # Invalid timeWindow should fail
    with pytest.raises(ValidationError):
        MetricAlertRule(
            name="Test metric alert",
            aggregate="count()",
            timeWindow=2,  # Not in allowed values
            projects=["project1"],
            query="event.type:error",
            thresholdType=0,
            triggers=[
                MetricAlertTrigger(
                    label="critical",
                    alertThreshold=100.0
                )
            ]
        )
    
    # Invalid trigger label should fail
    with pytest.raises(ValidationError):
        MetricAlertRule(
            name="Test metric alert",
            aggregate="count()",
            timeWindow=60,
            projects=["project1"],
            query="event.type:error",
            thresholdType=0,
            triggers=[
                MetricAlertTrigger(
                    label="invalid",  # Not in allowed values
                    alertThreshold=100.0
                )
            ]
        )


def test_serialization():
    """Test model serialization in both Pydantic versions."""
    rule = IssueAlertRule(
        name="Test alert rule",
        actionMatch="all",
        conditions=[
            AlertRuleCondition(id="frequency", value=10)
        ],
        actions=[
            AlertRuleAction(id="email", targetIdentifier="user@example.com")
        ],
        frequency=60
    )
    
    # Try v2 method first, fall back to v1
    try:
        # Pydantic v2
        data = rule.model_dump()
    except AttributeError:
        # Pydantic v1
        data = rule.dict()
    
    assert data["name"] == "Test alert rule"
    assert data["actionMatch"] == "all"
    assert len(data["conditions"]) == 1
    assert len(data["actions"]) == 1
    assert data["frequency"] == 60
