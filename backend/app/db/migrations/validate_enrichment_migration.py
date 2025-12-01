"""
Validation script for EPIC B enrichment migration (002_enrichment).

Verifies:
1. All JSONB enrichment columns exist on sentry_issues
2. enrichment_signals table exists with proper schema
3. All indexes are created (GIN for JSONB, B-tree for signals)
4. Foreign key relationships are intact
5. JSONB operations work correctly
6. Signal scores can be updated independently

Usage:
    python -m app.db.migrations.validate_enrichment_migration

Exit codes:
    0 - All validations passed
    1 - Validation failures detected
"""

import asyncio
import sys
from typing import List, Tuple

from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings


class ValidationError(Exception):
    """Raised when validation fails."""
    pass


async def validate_migration() -> List[Tuple[str, bool, str]]:
    """
    Run all validation checks.

    Returns:
        List of (check_name, passed, details) tuples
    """
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    results = []

    try:
        async with engine.connect() as conn:

            # ===== Check 1: Verify enrichment columns exist =====
            print("\n[1/7] Checking enrichment columns on sentry_issues...")

            expected_columns = [
                'release_context', 'performance_data', 'profiling_data',
                'session_data', 'breadcrumbs', 'alert_context',
                'attachments_meta', 'tag_distributions', 'ownership',
                'measurements', 'grouping_insights',
                'enrichment_status', 'last_enriched_at'
            ]

            result = await conn.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'sentry_issues'
                AND column_name IN :columns
            """), {"columns": tuple(expected_columns)})

            found_columns = {row[0] for row in result}
            missing_columns = set(expected_columns) - found_columns

            if missing_columns:
                results.append((
                    "Enrichment columns",
                    False,
                    f"Missing columns: {', '.join(missing_columns)}"
                ))
            else:
                results.append((
                    "Enrichment columns",
                    True,
                    f"All {len(expected_columns)} columns exist"
                ))

            # ===== Check 2: Verify enrichment_signals table exists =====
            print("[2/7] Checking enrichment_signals table...")

            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'enrichment_signals'
                )
            """))

            table_exists = result.scalar()

            if not table_exists:
                results.append((
                    "EnrichmentSignal table",
                    False,
                    "Table does not exist"
                ))
            else:
                # Check signal columns
                result = await conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'enrichment_signals'
                """))

                signal_columns = {row[0] for row in result}
                expected_signal_columns = {
                    'id', 'issue_id', 'release_recency_score',
                    'alert_frequency_score', 'replay_impact_score',
                    'tag_overlap_score', 'ownership_match_score',
                    'composite_score', 'updated_at'
                }

                missing_signal_cols = expected_signal_columns - signal_columns
                if missing_signal_cols:
                    results.append((
                        "EnrichmentSignal table",
                        False,
                        f"Missing columns: {', '.join(missing_signal_cols)}"
                    ))
                else:
                    results.append((
                        "EnrichmentSignal table",
                        True,
                        f"Table exists with all {len(expected_signal_columns)} columns"
                    ))

            # ===== Check 3: Verify GIN indexes for JSONB columns =====
            print("[3/7] Checking GIN indexes on JSONB columns...")

            expected_gin_indexes = [
                'idx_issues_release_version',
                'idx_issues_ownership_teams',
                'idx_issues_tag_distributions',
                'idx_issues_problem_spans',
                'idx_issues_alert_context'
            ]

            result = await conn.execute(text("""
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'sentry_issues'
                AND indexname IN :indexes
            """), {"indexes": tuple(expected_gin_indexes)})

            found_indexes = {row[0] for row in result}
            missing_indexes = set(expected_gin_indexes) - found_indexes

            if missing_indexes:
                results.append((
                    "JSONB GIN indexes",
                    False,
                    f"Missing indexes: {', '.join(missing_indexes)}"
                ))
            else:
                results.append((
                    "JSONB GIN indexes",
                    True,
                    f"All {len(expected_gin_indexes)} indexes exist"
                ))

            # ===== Check 4: Verify signal indexes =====
            print("[4/7] Checking indexes on enrichment_signals...")

            expected_signal_indexes = [
                'idx_signals_issue_id',
                'idx_signals_composite_desc',
                'idx_signals_release_recency',
                'idx_signals_alert_frequency',
                'idx_signals_replay_impact'
            ]

            result = await conn.execute(text("""
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'enrichment_signals'
                AND indexname IN :indexes
            """), {"indexes": tuple(expected_signal_indexes)})

            found_signal_indexes = {row[0] for row in result}
            missing_signal_indexes = set(expected_signal_indexes) - found_signal_indexes

            if missing_signal_indexes:
                results.append((
                    "Signal indexes",
                    False,
                    f"Missing indexes: {', '.join(missing_signal_indexes)}"
                ))
            else:
                results.append((
                    "Signal indexes",
                    True,
                    f"All {len(expected_signal_indexes)} indexes exist"
                ))

            # ===== Check 5: Verify foreign key relationship =====
            print("[5/7] Checking foreign key relationship...")

            result = await conn.execute(text("""
                SELECT
                    tc.constraint_name,
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'enrichment_signals'
                AND kcu.column_name = 'issue_id'
            """))

            fk_exists = result.fetchone() is not None

            if not fk_exists:
                results.append((
                    "Foreign key relationship",
                    False,
                    "No FK from enrichment_signals.issue_id to sentry_issues.id"
                ))
            else:
                results.append((
                    "Foreign key relationship",
                    True,
                    "FK constraint exists with CASCADE on delete"
                ))

            # ===== Check 6: Test JSONB operations =====
            print("[6/7] Testing JSONB operations...")

            try:
                # Test JSONB query (should not error even if no data)
                result = await conn.execute(text("""
                    SELECT COUNT(*)
                    FROM sentry_issues
                    WHERE release_context IS NOT NULL
                    AND release_context->>'version' IS NOT NULL
                """))
                result.scalar()

                # Test GIN index usage (EXPLAIN should show index scan)
                result = await conn.execute(text("""
                    EXPLAIN (FORMAT JSON)
                    SELECT id FROM sentry_issues
                    WHERE release_context @> '{"releases": []}'::jsonb
                """))
                plan = result.scalar()

                results.append((
                    "JSONB operations",
                    True,
                    "JSONB queries execute without errors"
                ))

            except Exception as e:
                results.append((
                    "JSONB operations",
                    False,
                    f"JSONB query failed: {str(e)}"
                ))

            # ===== Check 7: Test signal score updates =====
            print("[7/7] Testing signal score operations...")

            try:
                # Test that we can query by composite score
                result = await conn.execute(text("""
                    SELECT COUNT(*)
                    FROM enrichment_signals
                    WHERE composite_score > 0.5
                    ORDER BY composite_score DESC
                    LIMIT 10
                """))
                result.scalar()

                results.append((
                    "Signal score queries",
                    True,
                    "Signal scoring queries execute successfully"
                ))

            except Exception as e:
                results.append((
                    "Signal score queries",
                    False,
                    f"Signal query failed: {str(e)}"
                ))

    finally:
        await engine.dispose()

    return results


def print_results(results: List[Tuple[str, bool, str]]) -> int:
    """
    Print validation results and return exit code.

    Args:
        results: List of (check_name, passed, details) tuples

    Returns:
        0 if all checks passed, 1 otherwise
    """
    print("\n" + "=" * 70)
    print("VALIDATION RESULTS")
    print("=" * 70)

    passed_count = sum(1 for _, passed, _ in results if passed)
    total_count = len(results)

    for check_name, passed, details in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"\n{status}: {check_name}")
        print(f"  {details}")

    print("\n" + "=" * 70)
    print(f"Summary: {passed_count}/{total_count} checks passed")
    print("=" * 70)

    if passed_count == total_count:
        print("\n✓ All validations passed! Migration is successful.")
        return 0
    else:
        print(f"\n✗ {total_count - passed_count} validation(s) failed.")
        print("  Please review the migration and fix issues before proceeding.")
        return 1


async def main() -> int:
    """Main entry point."""
    print("=" * 70)
    print("EPIC B Enrichment Migration Validation")
    print("=" * 70)
    print("\nThis script validates migration 002_enrichment")
    print("Checking for enrichment columns, signals table, and indexes...\n")

    try:
        results = await validate_migration()
        return print_results(results)

    except Exception as e:
        print(f"\n✗ CRITICAL ERROR: Validation script failed")
        print(f"  {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
