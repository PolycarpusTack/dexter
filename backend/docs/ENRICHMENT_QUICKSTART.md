# Enrichment System Quick Start Guide

## Overview

The Dexter enrichment system augments Sentry issues with additional context from 11 data sources, improving RAG retrieval accuracy and providing richer insights to the LLM.

## EPIC D: Release & Commit Intelligence (IMPLEMENTED)

### Configuration

Add to `.env`:
```bash
# Enable release enrichment
ENABLE_RELEASES=true

# Sentry organization and project
SENTRY_ORGANIZATION_SLUG=your-org-slug
SENTRY_PROJECT_SLUG=your-project-slug

# Background job settings (optional)
ENRICHMENT_BATCH_SIZE=50
ENRICHMENT_INTERVAL_SECONDS=300
```

### Manual Enrichment

Enrich a specific issue via API:

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-base/issues/123/enrich/releases
```

Response:
```json
{
  "success": true,
  "message": "Issue enriched with release context",
  "details": {
    "status": "success",
    "releases_count": 5,
    "suspects_count": 3
  }
}
```

### Programmatic Usage

```python
from app.services.enrichment import get_release_enrichment_service

async def enrich_issue(db: AsyncSession, issue_id: int):
    service = await get_release_enrichment_service(db)
    result = await service.enrich_issue(issue_id)

    if result["status"] == "success":
        print(f"Enriched with {result['releases_count']} releases")
    else:
        print(f"Enrichment failed: {result['reason']}")
```

### Background Job

For automated enrichment of stale issues:

```python
from app.services.enrichment import enrich_stale_issues

# Run periodically (e.g., via scheduler)
await enrich_stale_issues()
```

### Data Structure

Enriched data is stored in `sentry_issues.release_context` (JSONB):

```json
{
  "releases": [
    {
      "version": "1.2.3",
      "date_created": "2025-11-30T14:00:00Z",
      "crash_free_users": 98.5,
      "crash_free_sessions": 99.2,
      "total_sessions": 15000,
      "health_score": 0.987
    }
  ],
  "suspect_commits": [
    {
      "id": "abc123",
      "repository": {"name": "backend"},
      "author_name": "[FIELD_REDACTED]",
      "message": "Fix critical bug...",
      "timestamp": "2025-11-30T13:45:00Z",
      "confidence_score": 0.85
    }
  ],
  "last_fetched": "2025-11-30T15:00:00Z"
}
```

### Ranking Signals

Release recency signal is automatically computed:

```python
from app.services.enrichment import compute_release_recency_score

score = await compute_release_recency_score(db, issue_id)
# Returns 1.0 for releases < 1 hour old
# Returns 0.0 for releases > 7 days old
# Linear decay in between
```

Composite ranking score (for RAG retrieval):

```python
from app.services.enrichment import update_enrichment_signals

# Update all signals for an issue
await update_enrichment_signals(db, issue_id)

# Result stored in enrichment_signals table:
# - release_recency_score: 0.0-1.0
# - composite_score: weighted average (40% vector + 15% release + 45% other)
```

### Health Score Calculation

Release health score formula:
```
health_score = (crash_free_users * 0.6 + crash_free_sessions * 0.4) / 100

Example:
- crash_free_users: 98.5%
- crash_free_sessions: 99.2%
- health_score = (98.5 * 0.6 + 99.2 * 0.4) / 100 = 0.987
```

### Suspect Commit Filtering

Only commits with `confidence_score > 0.5` are stored:

```python
# Service automatically filters:
high_confidence = [c for c in commits if c.confidence_score > 0.5]
```

## Troubleshooting

### Enrichment Fails

Check feature flag:
```bash
# In .env
ENABLE_RELEASES=true
```

Check org/project configuration:
```bash
SENTRY_ORGANIZATION_SLUG=your-org
SENTRY_PROJECT_SLUG=your-project
```

### No Releases Returned

Check Sentry API token:
```bash
SENTRY_API_TOKEN=your-token-here
```

Verify releases exist in Sentry for your project.

### PII in Commit Data

PII is automatically scrubbed. If you see `[FIELD_REDACTED]` or `[EMAIL_REDACTED]`, the system is working correctly.

## Monitoring

Check enrichment status:

```python
from app.db.repositories.issues import IssueRepository

issue = await issue_repo.get_by_id(issue_id)
print(issue.enrichment_status)
# {
#   "releases": {
#     "status": "completed",
#     "last_attempt": "2025-11-30T15:00:00Z",
#     "error": null
#   }
# }
```

Check last enrichment time:

```python
print(issue.last_enriched_at)
# 2025-11-30 15:00:00+00:00
```

## Performance

### API Rate Limits

Respects Sentry API rate limits via circuit breaker:

```bash
# In .env
SENTRY_RATE_LIMIT_REQUESTS_PER_MIN=100
SENTRY_CIRCUIT_BREAKER_THRESHOLD=5
SENTRY_CIRCUIT_BREAKER_TIMEOUT=60
```

### Caching

Enrichment data is cached in the database:

- Not re-fetched on every query
- Refreshed by background job every `ENRICHMENT_INTERVAL_SECONDS`
- Manual refresh via API endpoint

### Batch Processing

Background job processes in batches:

```bash
ENRICHMENT_BATCH_SIZE=50  # Process 50 issues per batch
```

## Security

### PII Scrubbing

Always applied before storage:

- Commit author emails → `[EMAIL_REDACTED]`
- User IDs → `[UUID_REDACTED]`
- API keys/tokens → `[TOKEN_REDACTED]`

### Feature Flags

Disable at any time:

```bash
ENABLE_RELEASES=false
```

Service will skip enrichment when disabled.

## Future Enrichment Sources

Coming in future EPICs:

- **Performance Spans** - Transaction traces, slow queries
- **Profiling** - Function hotspots, CPU/memory usage
- **Sessions/Replays** - User session data, crash rates
- **Breadcrumbs** - User action timeline
- **Alerts** - Alert history, incident correlation
- **Tags** - Tag distributions, environment clustering
- **Ownership** - Team assignments, code owners
- **Measurements** - Web vitals, custom metrics
- **Grouping** - Similar issues, fingerprint analysis

## References

- **Implementation:** `app/services/enrichment/release_enrichment.py`
- **Tests:** `tests/services/enrichment/test_release_enrichment.py`
- **API Endpoint:** `POST /api/v1/knowledge-base/issues/{id}/enrich/releases`
- **Completion Report:** `docs/EPIC_D_RELEASE_ENRICHMENT_COMPLETION.md`
