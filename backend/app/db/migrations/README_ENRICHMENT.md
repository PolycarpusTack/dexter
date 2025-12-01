# EPIC B: Enrichment Data Schema Extension

## Overview

This document describes the schema extensions for EPIC B - Data Enrichment, which adds support for 11 Sentry data sources to enhance AI-powered issue analysis and ranking.

**Migration**: `002_add_enrichment_columns.py`
**Revision ID**: `002_enrichment`
**Revises**: `001_initial`
**Created**: 2025-11-30

## Business Context

Dexter's knowledge base now stores enriched Sentry issue data to provide:

1. **Multi-signal Ranking**: Combine vector similarity with metadata signals (release recency, ownership, alerts)
2. **Contextual Analysis**: Provide LLMs with richer context (breadcrumbs, performance data, profiling)
3. **Proactive Insights**: Correlate issues with deployments, alerts, and session impact
4. **Team Relevance**: Surface issues owned by or relevant to specific teams

## Schema Changes

### 1. Extended `sentry_issues` Table

Added 11 JSONB columns for enrichment data:

| Column | Type | Description | Example Data |
|--------|------|-------------|--------------|
| `release_context` | JSONB | Releases, suspect commits, deployment info | `{"releases": [{"version": "1.2.3", "deployed_at": "..."}], "suspect_commits": [...]}` |
| `performance_data` | JSONB | Spans, transactions, problem spans | `{"problem_spans": [{"op": "db.query", "duration_ms": 1500}], "avg_duration": 850}` |
| `profiling_data` | JSONB | Function hotspots, top frames | `{"hotspots": [{"function": "parseJSON", "self_time_ms": 450}]}` |
| `session_data` | JSONB | Session counts, replay metadata, crash-free rate | `{"total_sessions": 1000, "crash_free_rate": 0.985, "replay_id": "..."}` |
| `breadcrumbs` | JSONB | User action timeline | `{"breadcrumbs": [{"type": "navigation", "message": "User clicked submit", "timestamp": "..."}]}` |
| `alert_context` | JSONB | Alert history, incidents | `{"incidents": [{"id": 123, "status": "critical", "fired_at": "..."}]}` |
| `attachments_meta` | JSONB | Attachment summaries (NOT content) | `{"attachments": [{"name": "screenshot.png", "size_bytes": 45120, "type": "image/png"}]}` |
| `tag_distributions` | JSONB | Top tag values, breakdowns | `{"environment": {"production": 850, "staging": 150}, "browser": {"chrome": 600, "firefox": 400}}` |
| `ownership` | JSONB | Teams, code owners | `{"teams": ["backend", "payments"], "owners": ["team:backend"], "assignment_rule": "path:*/payments/*"}` |
| `measurements` | JSONB | Web vitals, custom measurements | `{"lcp": 2.5, "fid": 100, "cls": 0.1, "custom": {"api_latency": 450}}` |
| `grouping_insights` | JSONB | Fingerprints, similar issues | `{"fingerprint": ["{{ default }}", "custom-key"], "similar_issues": [456, 789]}` |

#### Tracking Columns

| Column | Type | Description |
|--------|------|-------------|
| `enrichment_status` | JSONB | Per-source status tracking: `{source: {last_fetched, error, enabled}}` |
| `last_enriched_at` | TIMESTAMP | Last successful enrichment timestamp |

**Size Considerations**: Each JSONB column is nullable and unbounded. In production, consider adding check constraints:

```sql
-- Example: Limit JSONB column size to 100KB
ALTER TABLE sentry_issues
ADD CONSTRAINT chk_release_context_size
CHECK (pg_column_size(release_context) < 102400);
```

### 2. New `enrichment_signals` Table

Stores pre-computed ranking signals to avoid expensive JSONB queries during retrieval.

| Column | Type | Description | Range |
|--------|------|-------------|-------|
| `id` | INTEGER | Primary key | Auto-increment |
| `issue_id` | INTEGER | FK to `sentry_issues.id` (UNIQUE, CASCADE on delete) | - |
| `release_recency_score` | FLOAT | Release freshness (1.0 = deployed in last hour, exponential decay) | 0.0-1.0 |
| `alert_frequency_score` | FLOAT | Alert rate (1.0 = >10 alerts/hour, normalized) | 0.0-1.0 |
| `replay_impact_score` | FLOAT | Session impact (1.0 = affects 100% of sessions) | 0.0-1.0 |
| `tag_overlap_score` | FLOAT | Tag similarity to query context (1.0 = exact match) | 0.0-1.0 |
| `ownership_match_score` | FLOAT | Team relevance (1.0 = owned by user's team, 0.5 = related) | 0.0-1.0 |
| `composite_score` | FLOAT | Weighted average for ranking | 0.0-1.0 |
| `updated_at` | TIMESTAMP | Last signal recomputation | - |

#### Composite Score Formula

```
composite_score = (
    vector_similarity * 0.40 +      # pgvector cosine similarity
    release_recency_score * 0.15 +
    ownership_match_score * 0.15 +
    alert_frequency_score * 0.10 +
    replay_impact_score * 0.10 +
    tag_overlap_score * 0.10
)
```

**Rationale**:
- **Vector similarity (40%)**: Semantic relevance remains most important
- **Release/Ownership (30% combined)**: Recent deployments and team ownership are high-priority signals
- **Alerts/Replay/Tags (30% combined)**: Secondary signals for context and impact

### 3. Indexes

#### GIN Indexes (JSONB Containment Queries)

| Index Name | Column | Query Pattern |
|------------|--------|---------------|
| `idx_issues_release_version` | `release_context->'releases'` | `WHERE release_context @> '{"releases": [{"version": "1.2.3"}]}'` |
| `idx_issues_ownership_teams` | `ownership->'teams'` | `WHERE ownership @> '{"teams": ["backend"]}'` |
| `idx_issues_tag_distributions` | `tag_distributions` | `WHERE tag_distributions @> '{"environment": {"production": ...}}'` |
| `idx_issues_problem_spans` | `performance_data->'problem_spans'` | `WHERE performance_data->'problem_spans' IS NOT NULL` |
| `idx_issues_alert_context` | `alert_context->'incidents'` | `WHERE alert_context @> '{"incidents": [{"status": "critical"}]}'` |

**Query Example**:
```sql
-- Find issues from release 1.2.3 owned by backend team
SELECT id, error_type, error_message
FROM sentry_issues
WHERE release_context @> '{"releases": [{"version": "1.2.3"}]}'::jsonb
  AND ownership @> '{"teams": ["backend"]}'::jsonb
ORDER BY created_at DESC
LIMIT 10;
```

#### B-tree Indexes (Numeric Sorting)

| Index Name | Column | Query Pattern |
|------------|--------|---------------|
| `idx_signals_composite_desc` | `composite_score DESC` | `ORDER BY composite_score DESC` |
| `idx_signals_release_recency` | `release_recency_score DESC` | `ORDER BY release_recency_score DESC` |
| `idx_signals_alert_frequency` | `alert_frequency_score DESC` | `ORDER BY alert_frequency_score DESC` |
| `idx_signals_replay_impact` | `replay_impact_score DESC` | `ORDER BY replay_impact_score DESC` |

**Query Example**:
```sql
-- Find top-ranked issues (uses idx_signals_composite_desc)
SELECT si.id, si.error_type, es.composite_score
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
WHERE si.is_useful = true
ORDER BY es.composite_score DESC
LIMIT 10;
```

## Migration Instructions

### Running the Migration

```bash
# From backend directory
cd /mnt/c/Projects/dexter/backend

# 1. Ensure database is running
docker-compose up -d postgres

# 2. Run migration
poetry run alembic upgrade head

# 3. Validate migration
poetry run python -m app.db.migrations.validate_enrichment_migration
```

### Expected Output

```
====================================================================
EPIC B Enrichment Migration Validation
====================================================================

[1/7] Checking enrichment columns on sentry_issues...
[2/7] Checking enrichment_signals table...
[3/7] Checking GIN indexes on JSONB columns...
[4/7] Checking indexes on enrichment_signals...
[5/7] Checking foreign key relationship...
[6/7] Testing JSONB operations...
[7/7] Testing signal score operations...

====================================================================
VALIDATION RESULTS
====================================================================

✓ PASS: Enrichment columns
  All 13 columns exist

✓ PASS: EnrichmentSignal table
  Table exists with all 9 columns

✓ PASS: JSONB GIN indexes
  All 5 indexes exist

✓ PASS: Signal indexes
  All 5 indexes exist

✓ PASS: Foreign key relationship
  FK constraint exists with CASCADE on delete

✓ PASS: JSONB operations
  JSONB queries execute without errors

✓ PASS: Signal score queries
  Signal scoring queries execute successfully

====================================================================
Summary: 7/7 checks passed
====================================================================

✓ All validations passed! Migration is successful.
```

### Rollback Instructions

```bash
# WARNING: This will delete all enrichment data
poetry run alembic downgrade -1
```

## Usage Examples

### 1. Storing Enrichment Data

```python
from app.db.models import SentryIssue
from app.db.database import get_db

async with get_db() as db:
    issue = await db.get(SentryIssue, issue_id)

    # Store release context
    issue.release_context = {
        "releases": [
            {"version": "1.2.3", "deployed_at": "2025-11-30T10:00:00Z"}
        ],
        "suspect_commits": [
            {"sha": "abc123", "message": "Fix payment bug"}
        ]
    }

    # Store performance data
    issue.performance_data = {
        "problem_spans": [
            {"op": "db.query", "description": "SELECT * FROM users", "duration_ms": 1500}
        ],
        "avg_transaction_duration": 850
    }

    # Update enrichment status
    issue.enrichment_status = {
        "releases": {"last_fetched": "2025-11-30T10:05:00Z", "error": null, "enabled": true},
        "performance": {"last_fetched": "2025-11-30T10:05:00Z", "error": null, "enabled": true}
    }
    issue.last_enriched_at = datetime.utcnow()

    await db.commit()
```

### 2. Computing Signal Scores

```python
from app.db.models import EnrichmentSignal

async with get_db() as db:
    # Create or update signals
    signal = EnrichmentSignal(
        issue_id=issue.id,
        release_recency_score=0.95,  # Deployed 30 min ago
        alert_frequency_score=0.80,  # 8 alerts in last hour
        replay_impact_score=0.15,    # Affects 15% of sessions
        tag_overlap_score=0.90,      # High tag similarity
        ownership_match_score=1.0    # Owned by user's team
    )

    # Compute composite score
    signal.composite_score = (
        0.85 * 0.40 +  # vector_similarity (from separate query)
        0.95 * 0.15 +  # release_recency_score
        1.0 * 0.15 +   # ownership_match_score
        0.80 * 0.10 +  # alert_frequency_score
        0.15 * 0.10 +  # replay_impact_score
        0.90 * 0.10    # tag_overlap_score
    )  # = 0.865

    db.add(signal)
    await db.commit()
```

### 3. Multi-Signal Ranking Query

```python
from sqlalchemy import select, desc
from sqlalchemy.sql import func

# RAG retrieval with multi-signal ranking
query = (
    select(SentryIssue, EnrichmentSignal.composite_score)
    .join(EnrichmentSignal, SentryIssue.id == EnrichmentSignal.issue_id)
    .where(SentryIssue.is_useful == True)
    .order_by(desc(EnrichmentSignal.composite_score))
    .limit(10)
)

results = await db.execute(query)
top_issues = results.all()

for issue, score in top_issues:
    print(f"Issue {issue.id}: {issue.error_type} (score: {score:.3f})")
```

### 4. JSONB Filtering

```python
from sqlalchemy.dialects.postgresql import JSONB

# Find issues from specific release affecting production
query = (
    select(SentryIssue)
    .where(
        SentryIssue.release_context.op('@>')({
            "releases": [{"version": "1.2.3"}]
        }),
        SentryIssue.tag_distributions.op('@>')({
            "environment": {"production": {}}
        })
    )
    .order_by(desc(SentryIssue.created_at))
)

issues = await db.execute(query)
```

## Performance Considerations

### Index Usage

```sql
-- Verify GIN index is used
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM sentry_issues
WHERE release_context @> '{"releases": [{"version": "1.2.3"}]}'::jsonb;

-- Expected: "Index Scan using idx_issues_release_version"
```

### JSONB Size Limits

Monitor JSONB column sizes to prevent bloat:

```sql
-- Check average JSONB column sizes
SELECT
    pg_size_pretty(AVG(pg_column_size(release_context))) AS avg_release_size,
    pg_size_pretty(AVG(pg_column_size(performance_data))) AS avg_perf_size,
    pg_size_pretty(AVG(pg_column_size(breadcrumbs))) AS avg_breadcrumbs_size
FROM sentry_issues
WHERE release_context IS NOT NULL;
```

### Signal Score Updates

Signals should be recomputed when:
- Enrichment data changes (via enrichment pipeline)
- User context changes (team membership, ownership rules)
- Time-based decay (release recency degrades over time)

**Recommended**: Background job to refresh signals every 15 minutes for active issues.

## Data Integrity

### Cascading Deletes

When a `sentry_issue` is deleted:
- Associated `enrichment_signals` row is automatically deleted (CASCADE)
- Associated `feedback_log` entries are deleted (CASCADE)

### Null Handling

All enrichment JSONB columns are nullable:
- **NULL**: Data not yet fetched or unavailable from Sentry
- **Empty object `{}`**: Data fetched but no content available
- **Populated object**: Data successfully enriched

### Enrichment Status Tracking

Use `enrichment_status` to track per-source fetch state:

```json
{
  "releases": {
    "last_fetched": "2025-11-30T10:00:00Z",
    "error": null,
    "enabled": true
  },
  "performance": {
    "last_fetched": "2025-11-30T09:55:00Z",
    "error": "rate_limited",
    "enabled": false
  }
}
```

## Testing

### Unit Tests

```python
# tests/db/test_enrichment_models.py

async def test_enrichment_columns_nullable():
    """All enrichment columns should accept NULL."""
    issue = SentryIssue(
        sentry_issue_id="test-123",
        sentry_event_id="evt-456",
        error_type="ValueError",
        error_message="Test error"
    )
    # Should not raise even with all enrichment columns NULL
    db.add(issue)
    await db.commit()

async def test_signal_cascade_delete():
    """Deleting issue should cascade to signals."""
    issue = await create_test_issue()
    signal = EnrichmentSignal(issue_id=issue.id, composite_score=0.5)
    db.add(signal)
    await db.commit()

    await db.delete(issue)
    await db.commit()

    # Signal should be deleted
    assert await db.get(EnrichmentSignal, signal.id) is None
```

### Integration Tests

```python
# tests/services/test_enrichment_service.py

async def test_enrichment_pipeline_end_to_end():
    """Test full enrichment flow from Sentry webhook to signals."""
    # 1. Ingest issue
    issue = await ingest_sentry_event(webhook_payload)

    # 2. Run enrichment
    await enrichment_service.enrich_issue(issue.id)

    # 3. Verify enrichment data
    assert issue.release_context is not None
    assert issue.enrichment_status["releases"]["error"] is None

    # 4. Verify signals computed
    signal = await db.get(EnrichmentSignal, issue.id)
    assert signal.composite_score > 0
```

## Monitoring

### Metrics to Track

1. **Enrichment Coverage**: Percentage of issues with each enrichment type populated
2. **Enrichment Latency**: Time to fetch each enrichment source
3. **Signal Freshness**: Time since last signal recomputation
4. **JSONB Size Growth**: Average size of JSONB columns over time
5. **Query Performance**: P95 latency for multi-signal ranking queries

### Grafana Queries

```sql
-- Enrichment coverage by source
SELECT
    COUNT(*) FILTER (WHERE release_context IS NOT NULL) * 100.0 / COUNT(*) AS release_coverage,
    COUNT(*) FILTER (WHERE performance_data IS NOT NULL) * 100.0 / COUNT(*) AS performance_coverage,
    COUNT(*) FILTER (WHERE ownership IS NOT NULL) * 100.0 / COUNT(*) AS ownership_coverage
FROM sentry_issues;

-- Average signal scores
SELECT
    AVG(composite_score) AS avg_composite,
    AVG(release_recency_score) AS avg_release_recency,
    AVG(ownership_match_score) AS avg_ownership_match
FROM enrichment_signals;
```

## Troubleshooting

### Issue: GIN index not used in query plan

**Solution**: Ensure query uses containment operators (`@>`, `<@`, `?`, `?|`, `?&`):

```sql
-- Bad (won't use GIN index)
WHERE release_context->>'version' = '1.2.3'

-- Good (uses GIN index)
WHERE release_context @> '{"releases": [{"version": "1.2.3"}]}'::jsonb
```

### Issue: Slow signal score queries

**Solution**: Check index usage and consider partial indexes:

```sql
-- Partial index for high-score issues only
CREATE INDEX idx_signals_high_composite
ON enrichment_signals (composite_score DESC)
WHERE composite_score > 0.5;
```

### Issue: JSONB column bloat

**Solution**: Add check constraints or implement archival strategy:

```sql
-- Archive old enrichment data (older than 90 days)
UPDATE sentry_issues
SET release_context = NULL,
    performance_data = NULL,
    profiling_data = NULL
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Next Steps

After migration:

1. **Implement Enrichment Pipeline** (EPIC B-2): Services to fetch 11 data sources from Sentry API
2. **Implement Signal Computation** (EPIC B-3): Background job to compute and update enrichment signals
3. **Update RAG Retrieval** (EPIC B-4): Modify retrieval service to use multi-signal ranking
4. **Create Knowledge Base UI** (EPIC B-5): Frontend to browse enriched issues

## References

- **External Patterns**:
  - `/mnt/c/Projects/dexter/external/rag_api` - JSONB metadata patterns
  - `/mnt/c/Projects/dexter/external/vectorapi` - pgvector + JSONB integration
  - `/mnt/c/Projects/dexter/external/pgai` - Derived signals pattern

- **PostgreSQL Documentation**:
  - [JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING)
  - [GIN Indexes](https://www.postgresql.org/docs/current/gin.html)

- **Dexter Documentation**:
  - `/mnt/c/Projects/dexter/DEVELOPMENT_PLAN.md` - Overall roadmap
  - `/mnt/c/Projects/dexter/CLAUDE.md` - Development guidelines
