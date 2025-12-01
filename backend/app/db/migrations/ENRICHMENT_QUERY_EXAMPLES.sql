-- =====================================================================
-- EPIC B Enrichment Schema - Query Examples
-- =====================================================================
-- This file contains example queries for the enrichment schema extension.
-- Use these as templates for implementing enrichment services and retrieval.
--
-- File: backend/app/db/migrations/ENRICHMENT_QUERY_EXAMPLES.sql
-- Migration: 002_add_enrichment_columns.py
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BASIC JSONB QUERIES
-- ---------------------------------------------------------------------

-- Find issues from a specific release version
SELECT
    id,
    error_type,
    error_message,
    release_context->>'version' AS release_version
FROM sentry_issues
WHERE release_context @> '{"releases": [{"version": "1.2.3"}]}'::jsonb
ORDER BY created_at DESC
LIMIT 10;

-- Find issues owned by a specific team
SELECT
    id,
    error_type,
    ownership->'teams' AS teams,
    ownership->'owners' AS code_owners
FROM sentry_issues
WHERE ownership @> '{"teams": ["backend"]}'::jsonb
ORDER BY created_at DESC;

-- Find issues with performance problems (slow spans)
SELECT
    id,
    error_type,
    performance_data->'problem_spans' AS problem_spans,
    performance_data->>'avg_transaction_duration' AS avg_duration_ms
FROM sentry_issues
WHERE performance_data->'problem_spans' IS NOT NULL
  AND (performance_data->>'avg_transaction_duration')::float > 1000
ORDER BY (performance_data->>'avg_transaction_duration')::float DESC;

-- Find issues with session replay available
SELECT
    id,
    error_type,
    session_data->>'replay_id' AS replay_id,
    session_data->>'crash_free_rate' AS crash_free_rate
FROM sentry_issues
WHERE session_data->'replay_id' IS NOT NULL
ORDER BY created_at DESC;

-- Find issues with critical alerts
SELECT
    id,
    error_type,
    alert_context->'incidents' AS incidents
FROM sentry_issues
WHERE alert_context @> '{"incidents": [{"status": "critical"}]}'::jsonb
ORDER BY created_at DESC;

-- ---------------------------------------------------------------------
-- 2. MULTI-SIGNAL RANKING QUERIES
-- ---------------------------------------------------------------------

-- Top-ranked issues using composite score
SELECT
    si.id,
    si.error_type,
    si.error_message,
    es.composite_score,
    es.release_recency_score,
    es.ownership_match_score,
    es.alert_frequency_score
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
WHERE si.is_useful = true
ORDER BY es.composite_score DESC, si.created_at DESC
LIMIT 10;

-- Issues ranked by release recency (recently deployed bugs)
SELECT
    si.id,
    si.error_type,
    si.release_context->>'version' AS version,
    es.release_recency_score,
    si.created_at
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
WHERE es.release_recency_score > 0.7
ORDER BY es.release_recency_score DESC
LIMIT 20;

-- Issues with high session impact
SELECT
    si.id,
    si.error_type,
    si.session_data->>'crash_free_rate' AS crash_free_rate,
    es.replay_impact_score,
    si.feedback_count
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
WHERE es.replay_impact_score > 0.5
ORDER BY es.replay_impact_score DESC;

-- Issues frequently triggering alerts
SELECT
    si.id,
    si.error_type,
    si.alert_context->'incidents' AS incidents,
    es.alert_frequency_score
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
WHERE es.alert_frequency_score > 0.6
ORDER BY es.alert_frequency_score DESC;

-- ---------------------------------------------------------------------
-- 3. RAG RETRIEVAL WITH MULTI-SIGNAL RANKING
-- ---------------------------------------------------------------------

-- Similarity search with metadata boosting
-- (Use in retrieval_service.py for enhanced RAG)
WITH vector_matches AS (
    SELECT
        id,
        error_type,
        error_message,
        cleaned_stack,
        1 - (embedding <=> :query_embedding::vector) AS vector_similarity
    FROM sentry_issues
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> :query_embedding::vector
    LIMIT 50  -- Fetch top 50 by vector similarity
)
SELECT
    vm.id,
    vm.error_type,
    vm.error_message,
    vm.vector_similarity,
    es.release_recency_score,
    es.ownership_match_score,
    es.alert_frequency_score,
    es.replay_impact_score,
    es.tag_overlap_score,
    -- Compute final score: vector (40%) + metadata signals (60%)
    (vm.vector_similarity * 0.40 +
     es.release_recency_score * 0.15 +
     es.ownership_match_score * 0.15 +
     es.alert_frequency_score * 0.10 +
     es.replay_impact_score * 0.10 +
     es.tag_overlap_score * 0.10) AS final_score
FROM vector_matches vm
LEFT JOIN enrichment_signals es ON vm.id = es.issue_id
ORDER BY final_score DESC
LIMIT 10;

-- Filtered RAG retrieval (team-specific)
-- (Use when user context includes team ownership)
WITH vector_matches AS (
    SELECT
        si.id,
        si.error_type,
        si.error_message,
        si.ownership,
        1 - (si.embedding <=> :query_embedding::vector) AS vector_similarity
    FROM sentry_issues si
    WHERE si.embedding IS NOT NULL
      AND si.ownership @> '{"teams": ["backend"]}'::jsonb  -- Filter by team
    ORDER BY si.embedding <=> :query_embedding::vector
    LIMIT 50
)
SELECT
    vm.id,
    vm.error_type,
    vm.error_message,
    vm.vector_similarity,
    es.composite_score AS metadata_score,
    (vm.vector_similarity * 0.60 + es.composite_score * 0.40) AS final_score
FROM vector_matches vm
LEFT JOIN enrichment_signals es ON vm.id = es.issue_id
ORDER BY final_score DESC
LIMIT 10;

-- ---------------------------------------------------------------------
-- 4. ENRICHMENT STATUS TRACKING
-- ---------------------------------------------------------------------

-- Check enrichment coverage across all sources
SELECT
    COUNT(*) AS total_issues,
    COUNT(*) FILTER (WHERE release_context IS NOT NULL) AS release_enriched,
    COUNT(*) FILTER (WHERE performance_data IS NOT NULL) AS performance_enriched,
    COUNT(*) FILTER (WHERE profiling_data IS NOT NULL) AS profiling_enriched,
    COUNT(*) FILTER (WHERE session_data IS NOT NULL) AS session_enriched,
    COUNT(*) FILTER (WHERE breadcrumbs IS NOT NULL) AS breadcrumbs_enriched,
    COUNT(*) FILTER (WHERE alert_context IS NOT NULL) AS alert_enriched,
    COUNT(*) FILTER (WHERE ownership IS NOT NULL) AS ownership_enriched,
    COUNT(*) FILTER (WHERE measurements IS NOT NULL) AS measurements_enriched,
    ROUND(COUNT(*) FILTER (WHERE release_context IS NOT NULL) * 100.0 / COUNT(*), 2) AS release_coverage_pct
FROM sentry_issues
WHERE created_at > NOW() - INTERVAL '7 days';

-- Find issues with failed enrichment
SELECT
    id,
    error_type,
    enrichment_status,
    last_enriched_at
FROM sentry_issues
WHERE enrichment_status::text LIKE '%"error"%'
  AND enrichment_status::text NOT LIKE '%"error": null%'
ORDER BY last_enriched_at DESC NULLS LAST;

-- Issues pending enrichment (never enriched or stale)
SELECT
    id,
    error_type,
    created_at,
    last_enriched_at,
    COALESCE(last_enriched_at, created_at) AS last_touch
FROM sentry_issues
WHERE last_enriched_at IS NULL
   OR last_enriched_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 100;

-- ---------------------------------------------------------------------
-- 5. JSONB AGGREGATIONS
-- ---------------------------------------------------------------------

-- Top environments by issue count
SELECT
    tag_key,
    tag_value,
    COUNT(*) AS issue_count
FROM sentry_issues,
     jsonb_each_text(tag_distributions->'environment') AS env(tag_key, tag_value)
WHERE tag_distributions->'environment' IS NOT NULL
GROUP BY tag_key, tag_value
ORDER BY issue_count DESC
LIMIT 10;

-- Top teams by ownership
SELECT
    team_name,
    COUNT(*) AS owned_issues
FROM sentry_issues,
     jsonb_array_elements_text(ownership->'teams') AS team_name
WHERE ownership->'teams' IS NOT NULL
GROUP BY team_name
ORDER BY owned_issues DESC;

-- Average signal scores by error type
SELECT
    si.error_type,
    COUNT(*) AS issue_count,
    ROUND(AVG(es.composite_score)::numeric, 3) AS avg_composite_score,
    ROUND(AVG(es.release_recency_score)::numeric, 3) AS avg_release_score,
    ROUND(AVG(es.ownership_match_score)::numeric, 3) AS avg_ownership_score
FROM sentry_issues si
LEFT JOIN enrichment_signals es ON si.id = es.issue_id
WHERE si.created_at > NOW() - INTERVAL '7 days'
GROUP BY si.error_type
ORDER BY issue_count DESC
LIMIT 20;

-- ---------------------------------------------------------------------
-- 6. PERFORMANCE OPTIMIZATION QUERIES
-- ---------------------------------------------------------------------

-- Check if GIN index is used for release queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, error_type
FROM sentry_issues
WHERE release_context @> '{"releases": [{"version": "1.2.3"}]}'::jsonb;
-- Expected: "Index Scan using idx_issues_release_version"

-- Check if composite score index is used
EXPLAIN (ANALYZE, BUFFERS)
SELECT si.id, es.composite_score
FROM sentry_issues si
JOIN enrichment_signals es ON si.id = es.issue_id
ORDER BY es.composite_score DESC
LIMIT 10;
-- Expected: "Index Scan using idx_signals_composite_desc"

-- Monitor JSONB column sizes
SELECT
    COUNT(*) AS total_issues,
    pg_size_pretty(AVG(pg_column_size(release_context))) AS avg_release_size,
    pg_size_pretty(AVG(pg_column_size(performance_data))) AS avg_perf_size,
    pg_size_pretty(AVG(pg_column_size(breadcrumbs))) AS avg_breadcrumbs_size,
    pg_size_pretty(MAX(pg_column_size(release_context))) AS max_release_size,
    pg_size_pretty(MAX(pg_column_size(performance_data))) AS max_perf_size
FROM sentry_issues
WHERE release_context IS NOT NULL OR performance_data IS NOT NULL;

-- Find bloated JSONB columns (> 50KB)
SELECT
    id,
    error_type,
    pg_size_pretty(pg_column_size(release_context)) AS release_size,
    pg_size_pretty(pg_column_size(performance_data)) AS perf_size,
    pg_size_pretty(pg_column_size(breadcrumbs)) AS breadcrumbs_size
FROM sentry_issues
WHERE pg_column_size(release_context) > 51200
   OR pg_column_size(performance_data) > 51200
   OR pg_column_size(breadcrumbs) > 51200
ORDER BY pg_column_size(breadcrumbs) DESC;

-- ---------------------------------------------------------------------
-- 7. MAINTENANCE QUERIES
-- ---------------------------------------------------------------------

-- Update signal scores for a batch of issues
-- (Use in signal computation service)
INSERT INTO enrichment_signals (
    issue_id,
    release_recency_score,
    alert_frequency_score,
    replay_impact_score,
    tag_overlap_score,
    ownership_match_score,
    composite_score,
    updated_at
)
VALUES
    (123, 0.95, 0.80, 0.15, 0.90, 1.0, 0.865, NOW()),
    (124, 0.85, 0.60, 0.25, 0.70, 0.5, 0.645, NOW())
ON CONFLICT (issue_id)
DO UPDATE SET
    release_recency_score = EXCLUDED.release_recency_score,
    alert_frequency_score = EXCLUDED.alert_frequency_score,
    replay_impact_score = EXCLUDED.replay_impact_score,
    tag_overlap_score = EXCLUDED.tag_overlap_score,
    ownership_match_score = EXCLUDED.ownership_match_score,
    composite_score = EXCLUDED.composite_score,
    updated_at = NOW();

-- Archive old enrichment data (> 90 days)
-- (Use in data retention job)
UPDATE sentry_issues
SET
    release_context = NULL,
    performance_data = NULL,
    profiling_data = NULL,
    breadcrumbs = NULL,
    session_data = NULL,
    alert_context = NULL,
    attachments_meta = NULL
WHERE created_at < NOW() - INTERVAL '90 days'
  AND (release_context IS NOT NULL OR performance_data IS NOT NULL);

-- Vacuum enrichment data to reclaim space
VACUUM ANALYZE sentry_issues;
VACUUM ANALYZE enrichment_signals;

-- ---------------------------------------------------------------------
-- 8. DEBUGGING QUERIES
-- ---------------------------------------------------------------------

-- View full enrichment data for a specific issue
SELECT
    id,
    sentry_issue_id,
    error_type,
    jsonb_pretty(release_context) AS release_context,
    jsonb_pretty(performance_data) AS performance_data,
    jsonb_pretty(ownership) AS ownership,
    jsonb_pretty(enrichment_status) AS enrichment_status,
    last_enriched_at
FROM sentry_issues
WHERE id = 123;

-- View all signal scores for a specific issue
SELECT
    issue_id,
    release_recency_score,
    alert_frequency_score,
    replay_impact_score,
    tag_overlap_score,
    ownership_match_score,
    composite_score,
    updated_at
FROM enrichment_signals
WHERE issue_id = 123;

-- Find orphaned signals (no corresponding issue - should never happen due to FK)
SELECT es.*
FROM enrichment_signals es
LEFT JOIN sentry_issues si ON es.issue_id = si.id
WHERE si.id IS NULL;

-- Verify cascade delete behavior
-- (Should return 0 orphaned signals after deleting an issue)
SELECT COUNT(*)
FROM enrichment_signals es
LEFT JOIN sentry_issues si ON es.issue_id = si.id
WHERE si.id IS NULL;

-- =====================================================================
-- END OF QUERY EXAMPLES
-- =====================================================================
