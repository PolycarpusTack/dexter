# Multi-Signal Ranking Algorithm

**EPIC P - Story P-1: Enhanced RAG retrieval with composite scoring**

This document explains the multi-signal ranking algorithm that combines vector similarity with operational enrichment signals for improved issue retrieval.

## Table of Contents

- [Overview](#overview)
- [Algorithm Design](#algorithm-design)
- [Signal Definitions](#signal-definitions)
- [Composite Scoring Formula](#composite-scoring-formula)
- [A/B Testing Variants](#ab-testing-variants)
- [Staleness Handling](#staleness-handling)
- [Performance Considerations](#performance-considerations)
- [Tuning Guide](#tuning-guide)

## Overview

Traditional vector-only similarity search can miss contextually relevant issues. Our multi-signal ranking combines:

- **Vector Similarity** (40%): Semantic similarity from Jina code embeddings
- **Enrichment Signals** (60%): Operational context from 11 Sentry data sources

This hybrid approach improves:
- **Relevance**: Issues from the same team/release rank higher
- **Timeliness**: Recent deployment issues get priority
- **Context**: Alert storms and incidents influence ranking
- **Impact**: High-impact errors (many sessions affected) rank higher

## Algorithm Design

### Pipeline Flow

```
1. Vector Search (pgvector)
   ↓ Get top 50 candidates
2. Fetch Enrichment Signals (batch query)
   ↓ Load pre-computed scores from enrichment_signals table
3. Compute Composite Scores
   ↓ weighted_sum(vector_sim, signal1, signal2, ...)
4. Apply Staleness Discount
   ↓ Reduce score for old enrichment data (>7 days)
5. Re-rank by Composite Score
   ↓ Sort descending
6. Return Top N Results
```

### Key Design Decisions

**Why 50 candidates?**
- Cast a wide net for vector search
- Re-rank with enrichment signals
- Return top 10 after re-ranking
- Balances recall vs latency

**Why pre-compute signals?**
- Enrichment data queries are expensive
- Signals are stored in `enrichment_signals` table
- Updated when enrichment data changes
- Fast lookups during retrieval (indexed by issue_id)

**Why staleness discounts?**
- Enrichment data becomes less relevant over time
- Fresh data (<7 days): 100% weight
- Stale data (7-30 days): 50% weight
- Very stale (>30 days): 25% weight

## Signal Definitions

### 1. Vector Similarity (40% weight)

**Source**: pgvector cosine similarity
**Range**: 0.0 - 1.0
**Computation**: Automatic (pgvector `<=>` operator)

Semantic similarity between issue embeddings (768-dim Jina Code vectors).

### 2. Release Recency (15% weight)

**Source**: `release_context` JSONB column
**Range**: 0.0 - 1.0
**Formula**: `exp(-hours_since_deploy / decay_constant)`

Exponentially decaying score based on deployment time:
- 1.0: Deployed in last hour
- 0.5: Deployed ~24 hours ago
- 0.1: Deployed ~1 week ago
- 0.0: Deployed >1 week ago

**Why important**: Recently deployed code is more likely to cause new errors.

### 3. Ownership Match (12% weight)

**Source**: `ownership` JSONB column
**Range**: 0.0 - 1.0
**Values**:
- 1.0: User's team is primary owner
- 0.7: User's team is secondary owner
- 0.5: User's team in suggested owners
- 0.0: No team match

**Why important**: Users care more about errors in their team's code.

### 4. Alert Frequency (10% weight)

**Source**: `alert_context` JSONB column
**Range**: 0.0 - 1.0
**Formula**: `min(recent_alert_count / max_alerts, 1.0)`

Normalized alert density in last 24 hours:
- 1.0: ≥10 alerts in 24h (alert storm)
- 0.5: 5 alerts in 24h
- 0.0: No recent alerts

**Why important**: High alert frequency indicates ongoing incident.

### 5. Replay Impact (10% weight)

**Source**: `session_data` JSONB column
**Range**: 0.0 - 1.0
**Formula**: `1.0 - (crash_free_rate / 100)`

Impact on user sessions:
- 1.0: 100% session crash rate
- 0.5: 50% session crash rate
- 0.0: 0% crash rate (100% crash-free)

**Why important**: High user impact = higher priority.

### 6. Tag Overlap (8% weight)

**Source**: `tag_distributions` JSONB column
**Range**: 0.0 - 1.0
**Formula**: `matched_tags / total_query_tags`

Percentage of query context tags matching issue tags:
- 1.0: All tags match (environment, browser, OS, etc.)
- 0.5: 50% of tags match
- 0.0: No tag overlap

**Why important**: Same environment/context = more relevant.

### 7. Profiling Hotspot (3% weight)

**Source**: `profiling_data` JSONB column
**Range**: 0.0 - 1.0
**Formula**: `0.4 * count_score + 0.4 * time_score + 0.2 * severity_score`

Hot function detection:
- Count score: Number of hot functions (1-3 = 0.5, 4+ = 1.0)
- Time score: % time in hot functions (50%+ = 1.0)
- Severity score: Max severity (critical = 1.0, low = 0.2)

**Why important**: Performance issues with profiling data are easier to diagnose.

### 8. Performance Impact (2% weight)

**Source**: `performance_data` JSONB column
**Range**: 0.0 - 1.0
**Formula**: Weighted sum of problem spans + N+1 patterns

Performance problem detection:
- Problem spans: Severity-weighted count
- N+1 patterns: Occurrence count × severity

**Why important**: Known performance issues rank higher.

## Composite Scoring Formula

### Balanced Variant (Default)

```python
composite_score = (
    0.40 * vector_similarity +
    0.15 * release_recency +
    0.12 * ownership_match +
    0.10 * alert_frequency +
    0.10 * replay_impact +
    0.08 * tag_overlap +
    0.03 * profiling_hotspot +
    0.02 * performance_impact
) * staleness_factor
```

**Total**: 100% (weights sum to 1.0)

### Example Calculation

Given an issue with:
- Vector similarity: 0.85
- Release recency: 0.90 (deployed 2h ago)
- Ownership match: 1.0 (user's team owns it)
- Alert frequency: 0.70 (7 alerts in 24h)
- Replay impact: 0.15 (15% session crash rate)
- Tag overlap: 1.0 (all tags match)
- Profiling hotspot: 0.0 (no profiling data)
- Performance impact: 0.0 (no perf data)
- Staleness factor: 1.0 (fresh)

```
composite = (
    0.40 * 0.85 +  # 0.340
    0.15 * 0.90 +  # 0.135
    0.12 * 1.00 +  # 0.120
    0.10 * 0.70 +  # 0.070
    0.10 * 0.15 +  # 0.015
    0.08 * 1.00 +  # 0.080
    0.03 * 0.00 +  # 0.000
    0.02 * 0.00    # 0.000
) * 1.0 = 0.760
```

This issue would rank higher than one with 0.90 vector similarity but no enrichment signals (score = 0.36 with balanced weights).

## A/B Testing Variants

### Control Variant (Pure Vector)

**Use Case**: Baseline comparison

```python
weights = {
    "vector_similarity": 1.0,
    # All other signals: 0.0
}
```

### Balanced Variant (Default)

**Use Case**: Production default

```python
weights = {
    "vector_similarity": 0.40,
    "release_recency": 0.15,
    "ownership_match": 0.12,
    "alert_frequency": 0.10,
    "replay_impact": 0.10,
    "tag_overlap": 0.08,
    "profiling_hotspot": 0.03,
    "performance_impact": 0.02,
}
```

### Enrichment-Heavy Variant

**Use Case**: Test maximum enrichment influence

```python
weights = {
    "vector_similarity": 0.20,
    "release_recency": 0.20,
    "ownership_match": 0.15,
    "alert_frequency": 0.15,
    "replay_impact": 0.10,
    "tag_overlap": 0.08,
    "profiling_hotspot": 0.07,
    "performance_impact": 0.05,
}
```

### Variant Assignment

Users are assigned to variants via stable hashing:

```python
hash_val = md5(user_id).hexdigest()
variant_index = hash_val % 3
variants = ["control", "balanced", "enrichment_heavy"]
assigned = variants[variant_index]
```

## Staleness Handling

Enrichment data freshness is tracked via `last_enriched_at` timestamp:

| Age | Staleness Factor | Impact |
|-----|------------------|--------|
| < 7 days | 1.0 (100%) | No penalty |
| 7-30 days | 0.5 (50%) | Half weight |
| > 30 days | 0.25 (25%) | Heavy penalty |

**Formula**:
```python
if age < 7 days:
    factor = 1.0
elif age < 30 days:
    factor = 0.5
else:
    factor = 0.25

composite_score *= factor
```

**Rationale**: Old enrichment data (stale release info, old alerts) is less relevant.

## Performance Considerations

### Latency Targets

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Vector search (pgvector) | 50ms | 150ms | 300ms |
| Signal fetching (batch) | 20ms | 50ms | 100ms |
| Composite scoring (in-memory) | 5ms | 10ms | 20ms |
| **Total retrieval** | **100ms** | **300ms** | **500ms** |

### Optimization Techniques

1. **Batch Signal Fetching**
   ```python
   # Single query for all candidates
   signals = await session.execute(
       select(EnrichmentSignal)
       .where(EnrichmentSignal.issue_id.in_(candidate_ids))
   )
   ```

2. **Signal Pre-computation**
   - Signals computed when enrichment data changes
   - Stored in `enrichment_signals` table
   - No JSONB queries during retrieval

3. **Candidate Limiting**
   - Fetch 50 candidates (5x final limit)
   - Balance recall vs latency
   - Avoids scoring 100s of issues

4. **Indexed Lookups**
   ```sql
   CREATE INDEX idx_signals_issue_id ON enrichment_signals(issue_id);
   CREATE INDEX idx_signals_composite_desc ON enrichment_signals(composite_score DESC);
   ```

### Caching Strategy

**Signal caching** (5 minutes):
```python
@cache(ttl=300)
async def get_enrichment_signals(issue_id):
    # Cached for 5min to reduce DB load
    ...
```

**Not cached**:
- Vector search (always fresh)
- Composite scoring (fast in-memory)

## Tuning Guide

### When to Adjust Weights

**Symptom**: Team-owned issues ranking too low
**Fix**: Increase `ownership_match` weight (e.g., 0.12 → 0.18)

**Symptom**: Old issues ranking too high
**Fix**: Increase `release_recency` weight (e.g., 0.15 → 0.20)

**Symptom**: Incident issues not prioritized
**Fix**: Increase `alert_frequency` weight (e.g., 0.10 → 0.15)

**Symptom**: Vector similarity ignored
**Fix**: Increase `vector_similarity` weight (e.g., 0.40 → 0.50)

### Experimentation Workflow

1. **Create New Variant**
   ```python
   # In retrieval_service.py
   def _get_ranking_weights(self, variant):
       if variant == "my_experiment":
           return {
               "vector_similarity": 0.50,  # Adjusted
               "release_recency": 0.20,
               ...
           }
   ```

2. **Assign Users to Variant**
   ```python
   experiment = get_ranking_experiment()
   variant = experiment.get_variant_for_user(user_id)
   ```

3. **Collect Metrics**
   ```python
   experiment.record_query(variant, latency_ms, similarity, composite)
   experiment.record_feedback(variant, "positive")
   experiment.record_click(variant, clicked_rank=2)
   ```

4. **Analyze Results**
   ```python
   stats = experiment.get_stats()
   comparisons = experiment.compare_variants(metric="avg_relevance")
   ```

5. **Promote Winning Variant**
   - If `confidence_level > 0.8` and sample size > 500
   - Update default weights in production

### Signal-Specific Tuning

**Release Recency Decay**:
```python
# Adjust decay_constant for faster/slower decay
decay_constant = max_hours / 5  # Current
decay_constant = max_hours / 3  # Faster decay
```

**Alert Frequency Threshold**:
```python
# Adjust max_alerts for sensitivity
max_alerts = 10  # Current (10 alerts = 1.0 score)
max_alerts = 5   # More sensitive (5 alerts = 1.0)
```

**Staleness Thresholds**:
```python
# Adjust age thresholds
FRESH_THRESHOLD = 7    # days (current)
STALE_THRESHOLD = 30   # days (current)

# More aggressive:
FRESH_THRESHOLD = 3    # days
STALE_THRESHOLD = 14   # days
```

## Metrics & Monitoring

### Key Metrics

**Relevance**:
- Manual relevance ratings (1-5 scale)
- Click-through rate on similar issues
- Thumbs up/down ratio

**Performance**:
- P50/P95/P99 retrieval latency
- Cache hit rate
- Database query count

**Variant Comparison**:
- Avg relevance by variant
- Avg latency by variant
- Statistical significance (t-test)

### Dashboards

```python
GET /api/v1/admin/ranking-experiments/stats

{
  "variants": {
    "control": {
      "avg_relevance": 3.2,
      "avg_latency_ms": 120,
      "sample_size": 1000,
      "ctr": 0.25
    },
    "balanced": {
      "avg_relevance": 3.8,
      "avg_latency_ms": 180,
      "sample_size": 1000,
      "ctr": 0.32
    }
  },
  "winning_variant": "balanced",
  "confidence_level": 0.85
}
```

## References

- **Implementation**: `/backend/app/services/retrieval_service.py`
- **Signal Computation**: `/backend/app/services/enrichment/signal_computation.py`
- **A/B Testing**: `/backend/app/services/ranking_experiment.py`
- **Tests**: `/backend/tests/services/test_retrieval_service_multi_signal.py`
