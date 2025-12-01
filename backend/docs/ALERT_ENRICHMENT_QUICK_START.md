# Alert Enrichment - Quick Start Guide

## Overview

Alert enrichment adds alert history, incident correlation, and alert storm detection to Dexter's incident management system.

## Configuration

### Environment Variables

```bash
# Enable alert enrichment
ENABLE_ALERTS=true

# Sentry credentials
SENTRY_API_TOKEN=your_sentry_token
SENTRY_ORGANIZATION_SLUG=your_org
SENTRY_PROJECT_SLUG=your_project

# Optional: Batch size for background jobs
ENRICHMENT_BATCH_SIZE=50
```

## Quick Start

### 1. Enable Feature Flag

```python
# In .env or environment
ENABLE_ALERTS=true
```

### 2. Enrich a Single Issue

```python
from app.services.enrichment import get_alert_enrichment_service
from app.db.database import get_db

async def enrich_issue(issue_id: int):
    async for db in get_db():
        service = await get_alert_enrichment_service(db)
        result = await service.enrich_issue(issue_id)

        if result["status"] == "success":
            print(f"✅ Enriched with {result['alert_rules_count']} alert rules")
            print(f"   Incidents: {result['incidents_count']}")
            if result.get("is_alert_storm"):
                print("   ⚠️ ALERT STORM DETECTED!")
        break
```

### 3. Run Background Enrichment

```python
from app.services.enrichment import enrich_alerts

# Run as scheduled task (cron, APScheduler, etc.)
await enrich_alerts()
```

### 4. Query Alert Context

```python
from sqlalchemy import select
from app.db.models import SentryIssue

async def get_alert_info(db, issue_id: int):
    result = await db.execute(
        select(SentryIssue).where(SentryIssue.id == issue_id)
    )
    issue = result.scalar_one()

    if not issue.alert_context:
        return None

    return {
        "recent_alerts": issue.alert_context.get("recent_alert_count", 0),
        "is_storm": issue.alert_context.get("is_alert_storm", False),
        "active_incident": issue.alert_context.get("active_incident"),
        "correlated_incidents": issue.alert_context.get("correlated_incidents", [])
    }
```

## Alert Context Structure

```json
{
  "alert_history": [
    {
      "incident_id": "inc-123",
      "timestamp": "2025-11-30T10:00:00Z",
      "severity": "critical",
      "title": "High Error Rate Alert",
      "status": "open",
      "date_started": "2025-11-30T09:55:00Z"
    }
  ],
  "recent_alert_count": 7,
  "is_alert_storm": false,
  "alert_storm_details": null,
  "correlated_incidents": ["INC-123"],
  "active_incident": {
    "id": "inc-123",
    "identifier": "INC-123",
    "title": "Production Database Outage",
    "status": "critical",
    "priority": "high",
    "date_started": "2025-11-30T09:00:00Z"
  },
  "alert_rules": [
    {
      "id": "rule-1",
      "name": "Error Rate Alert",
      "status": "active"
    }
  ],
  "last_fetched": "2025-11-30T10:30:00Z"
}
```

## Alert Storm Detection

### What is an Alert Storm?

An alert storm occurs when 3+ alerts fire within 60 minutes, indicating a systemic issue.

### Detection Logic

```python
# Configurable parameters
threshold = 3  # Number of alerts
window_minutes = 60  # Time window

# Detected when:
# - 3+ alerts in 60-minute window
# - Returns storm details (start, end, duration)
```

### Storm Details Structure

```json
{
  "alert_count": 5,
  "start_time": "2025-11-30T09:00:00Z",
  "end_time": "2025-11-30T09:45:00Z",
  "duration_minutes": 45,
  "window_minutes": 60
}
```

## Incident Correlation

### How It Works

Issues are correlated with incidents by:
1. Error type matching in incident title
2. Error message keyword matching
3. Prioritizing active incidents (open/critical/warning)

### Priority Mapping

| Incident Status | Priority Level |
|-----------------|----------------|
| critical        | high           |
| warning         | medium         |
| open            | medium         |
| closed          | low            |

### Example

```python
# Issue: DatabaseError - Connection timeout
# Incident: "DatabaseError Connection timeout in production"
# Result: ✅ Correlated

correlated_incidents = ["INC-123", "INC-124"]
active_incident = {
    "identifier": "INC-123",
    "status": "critical",
    "priority": "high"
}
```

## Background Job Scheduling

### Priority System

1. **High Priority** (30-minute refresh)
   - Issues with active incidents
   - Example: Production outages

2. **Normal Priority** (2-hour refresh)
   - Issues without active incidents
   - Example: Historical analysis

### Recommended Scheduler Setup

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.enrichment import enrich_alerts

scheduler = AsyncIOScheduler()

# Run every 30 minutes (handles both priority levels internally)
scheduler.add_job(
    enrich_alerts,
    'interval',
    minutes=30,
    id='alert_enrichment'
)

scheduler.start()
```

## Alert Frequency Scoring

### Score Calculation

```python
from app.services.enrichment import compute_alert_frequency_score

# Compute score (0.0 to 1.0)
score = await compute_alert_frequency_score(
    db,
    issue_id=123,
    window_hours=24.0,  # Last 24 hours
    max_alerts=10       # 10 alerts = score 1.0
)

# Examples:
# 0 alerts  → score = 0.0
# 5 alerts  → score = 0.5
# 10 alerts → score = 1.0
# 15 alerts → score = 1.0 (capped)
```

### Integration with Composite Score

Alert frequency contributes 10% to the overall ranking score:

```python
composite_score = (
    vector_similarity * 0.40 +
    release_recency * 0.15 +
    ownership_match * 0.15 +
    alert_frequency * 0.10 +  # ← Alert enrichment
    replay_impact * 0.10 +
    tag_overlap * 0.10
)
```

## Monitoring

### Check Enrichment Status

```python
from sqlalchemy import select
from app.db.models import SentryIssue

result = await db.execute(
    select(SentryIssue).where(SentryIssue.id == issue_id)
)
issue = result.scalar_one()

status = issue.enrichment_status.get("alerts", {})
print(f"Status: {status.get('status')}")
print(f"Last attempt: {status.get('last_attempt')}")
if status.get('error'):
    print(f"Error: {status.get('error')}")
```

### Key Metrics to Monitor

- Alert enrichment success rate
- Alert storms detected per day
- Active incidents count
- Average enrichment duration

## Troubleshooting

### Issue: No alerts being enriched

**Check**:
1. Feature flag: `ENABLE_ALERTS=true`
2. Sentry token configured
3. Organization/project slugs set
4. Background job running

### Issue: Alert data stale

**Check**:
1. `last_enriched_at` timestamp
2. Background job schedule
3. Priority thresholds (30 min vs 2 hours)

### Issue: Alert storms not detected

**Check**:
1. Alert history populated
2. Timestamps valid
3. Threshold met (3+ alerts in 60 min)

## API Integration (Future)

Coming soon:

```bash
# Get alert context
GET /api/v1/issues/{id}/alerts

# Manually trigger enrichment
POST /api/v1/issues/{id}/refresh-alerts

# Get alert storm summary
GET /api/v1/alerts/storms?since=2025-11-30
```

## Best Practices

1. **Enable Feature Flag First**
   - Set `ENABLE_ALERTS=true` before deploying
   - Test with a small batch of issues

2. **Monitor Background Jobs**
   - Track success/failure rates
   - Alert on high failure rates

3. **Handle Alert Storms**
   - Set up notifications for storms
   - Investigate root causes promptly

4. **Tune Refresh Intervals**
   - Adjust based on alert volume
   - Balance freshness vs API load

5. **Review Correlation Logic**
   - Monitor false positives/negatives
   - Tune matching keywords if needed

## Support

- **Documentation**: `/backend/docs/EPIC_J_ALERT_CORRELATION_COMPLETE.md`
- **Tests**: `/backend/tests/services/enrichment/test_alert_enrichment.py`
- **Source**: `/backend/app/services/enrichment/alert_enrichment.py`

---

*Last Updated: 2025-11-30*
