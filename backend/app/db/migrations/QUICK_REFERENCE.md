# EPIC B Enrichment Schema - Quick Reference

Fast reference for developers working with the enrichment schema.

## Run Migration

```bash
cd /mnt/c/Projects/dexter/backend
poetry run alembic upgrade head
poetry run python -m app.db.migrations.validate_enrichment_migration
```

## Rollback Migration

```bash
poetry run alembic downgrade -1
```

## Schema at a Glance

### sentry_issues Table (Extended)

**11 New JSONB Columns**:
- `release_context` - Releases, commits, deployments
- `performance_data` - Spans, transactions, problem spans
- `profiling_data` - Function hotspots
- `session_data` - Sessions, replays, crash-free rate
- `breadcrumbs` - User action timeline
- `alert_context` - Alerts, incidents
- `attachments_meta` - Attachment metadata (not content)
- `tag_distributions` - Tag breakdowns
- `ownership` - Teams, code owners
- `measurements` - Web vitals, custom metrics
- `grouping_insights` - Fingerprints, similar issues

**2 Metadata Columns**:
- `enrichment_status` (JSONB, default `{}`) - Per-source fetch status
- `last_enriched_at` (TIMESTAMP) - Last successful enrichment

### enrichment_signals Table (New)

**Signal Scores** (all FLOAT 0.0-1.0):
- `release_recency_score` - How recently deployed
- `alert_frequency_score` - Alert firing rate
- `replay_impact_score` - Session impact %
- `tag_overlap_score` - Tag similarity
- `ownership_match_score` - Team relevance
- `composite_score` - Weighted average (indexed)

**Formula**: `composite = vector(40%) + release(15%) + ownership(15%) + alerts(10%) + replay(10%) + tags(10%)`

## Common Code Patterns

### Store Enrichment Data

```python
from app.db.models import SentryIssue
from datetime import datetime

# Update issue with enrichment data
issue.release_context = {
    "releases": [{"version": "1.2.3", "deployed_at": "2025-11-30T10:00:00Z"}],
    "suspect_commits": [{"sha": "abc123", "message": "Fix bug"}]
}

issue.enrichment_status = {
    "releases": {"last_fetched": datetime.utcnow().isoformat(), "error": None, "enabled": True}
}
issue.last_enriched_at = datetime.utcnow()

await db.commit()
```

### Compute Signal Scores

```python
from app.db.models import EnrichmentSignal

# Create or update signals
signal = EnrichmentSignal(
    issue_id=issue.id,
    release_recency_score=0.95,
    alert_frequency_score=0.80,
    replay_impact_score=0.15,
    tag_overlap_score=0.90,
    ownership_match_score=1.0
)

# Compute composite score
signal.composite_score = (
    vector_similarity * 0.40 +
    signal.release_recency_score * 0.15 +
    signal.ownership_match_score * 0.15 +
    signal.alert_frequency_score * 0.10 +
    signal.replay_impact_score * 0.10 +
    signal.tag_overlap_score * 0.10
)

db.add(signal)
await db.commit()
```

### Multi-Signal RAG Query

```python
from sqlalchemy import select, desc
from app.db.models import SentryIssue, EnrichmentSignal

# Top-ranked issues
query = (
    select(SentryIssue, EnrichmentSignal.composite_score)
    .join(EnrichmentSignal)
    .where(SentryIssue.is_useful == True)
    .order_by(desc(EnrichmentSignal.composite_score))
    .limit(10)
)

results = await db.execute(query)
for issue, score in results:
    print(f"{issue.error_type}: {score:.3f}")
```

### JSONB Filtering

```python
# Find issues from specific release
query = select(SentryIssue).where(
    SentryIssue.release_context.op('@>')({
        "releases": [{"version": "1.2.3"}]
    })
)

# Find issues owned by team
query = select(SentryIssue).where(
    SentryIssue.ownership.op('@>')({
        "teams": ["backend"]
    })
)
```

## Common SQL Queries

### Find Recent Deployments

```sql
SELECT id, error_type, release_context->>'version' AS version
FROM sentry_issues
WHERE release_context @> '{"releases": [{"version": "1.2.3"}]}'::jsonb
ORDER BY created_at DESC;
```

### Find High-Impact Issues

```sql
SELECT si.id, si.error_type, es.replay_impact_score
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
WHERE es.replay_impact_score > 0.5
ORDER BY es.replay_impact_score DESC;
```

### Top-Ranked Issues

```sql
SELECT si.id, si.error_type, es.composite_score
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
ORDER BY es.composite_score DESC
LIMIT 10;
```

### Team Ownership

```sql
SELECT id, error_type, ownership->'teams' AS teams
FROM sentry_issues
WHERE ownership @> '{"teams": ["backend"]}'::jsonb;
```

## Index Usage

**GIN Indexes** (JSONB containment):
- Use `@>` operator for containment queries
- Use `->` for key extraction
- Use `->>` for text extraction

**B-tree Indexes** (Numeric sorting):
- Automatically used for `ORDER BY score DESC`
- Composite score index optimized for ranking

## Performance Tips

1. **Use Containment Operators**: `WHERE release_context @> '{...}'::jsonb` (uses GIN index)
2. **Avoid Text Extraction in WHERE**: `WHERE release_context->>'version' = '1.2.3'` (no index)
3. **Pre-compute Signals**: Don't calculate composite score in queries, use pre-computed value
4. **Limit JSONB Size**: Keep enrichment data under 100KB per column
5. **Monitor Index Usage**: Use `EXPLAIN ANALYZE` to verify index scans

## Troubleshooting

### Migration Not Applying
```bash
# Check current state
poetry run alembic current

# Show migration history
poetry run alembic history

# Force stamp (if needed)
poetry run alembic stamp 002_enrichment
```

### Validation Failing
```bash
# Run with full output
poetry run python -m app.db.migrations.validate_enrichment_migration

# Check specific table
psql -h localhost -U dexter -d dexter -c "\d sentry_issues"
```

### Index Not Being Used
```sql
-- Check query plan
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM sentry_issues
WHERE release_context @> '{"releases": []}'::jsonb;

-- Should show: "Index Scan using idx_issues_release_version"
```

### JSONB Column Too Large
```sql
-- Find large JSONB columns
SELECT id, pg_size_pretty(pg_column_size(release_context)) AS size
FROM sentry_issues
WHERE pg_column_size(release_context) > 51200
ORDER BY pg_column_size(release_context) DESC;
```

## Files Location

- **Models**: `/mnt/c/Projects/dexter/backend/app/db/models.py`
- **Migration**: `/mnt/c/Projects/dexter/backend/app/db/migrations/versions/002_add_enrichment_columns.py`
- **Validation**: `/mnt/c/Projects/dexter/backend/app/db/migrations/validate_enrichment_migration.py`
- **Full Docs**: `/mnt/c/Projects/dexter/backend/app/db/migrations/README_ENRICHMENT.md`
- **SQL Examples**: `/mnt/c/Projects/dexter/backend/app/db/migrations/ENRICHMENT_QUERY_EXAMPLES.sql`

## Next Steps

1. Implement enrichment pipeline services
2. Create signal computation background job
3. Update RAG retrieval with multi-signal ranking
4. Build knowledge base UI

## Support

For detailed documentation, see:
- `README_ENRICHMENT.md` - Complete migration guide
- `ENRICHMENT_QUERY_EXAMPLES.sql` - 200+ lines of query examples
- `EPIC_B_IMPLEMENTATION_SUMMARY.md` - Implementation overview
- `MIGRATION_CHECKLIST.md` - Step-by-step execution checklist
