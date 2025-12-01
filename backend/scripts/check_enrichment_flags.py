#!/usr/bin/env python3
"""
Utility script to check current enrichment feature flag configuration.

This script reads the current configuration and displays the status of all
11 data enrichment sources.

Usage:
    python scripts/check_enrichment_flags.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.core.config import get_settings


def main():
    """Display current enrichment feature flag configuration."""
    settings = get_settings()

    print("=" * 70)
    print("DEXTER DATA ENRICHMENT FEATURE FLAGS")
    print("=" * 70)
    print()

    # Master toggle
    print("Master Toggle:")
    print(f"  ENABLE_ALL_ENRICHMENTS: {settings.ENABLE_ALL_ENRICHMENTS}")
    if settings.ENABLE_ALL_ENRICHMENTS:
        print("  ⚠️  Master toggle is ON - all individual flags are overridden")
    print()

    # Individual flags
    flags = [
        ("ENABLE_RELEASES", "Release Intelligence", "Release and suspect commit data"),
        ("ENABLE_PERFORMANCE_SPANS", "Performance Observability", "Performance spans and transactions"),
        ("ENABLE_PROFILING", "Profiling", "Function hotspots (resource intensive)"),
        ("ENABLE_SESSIONS_REPLAYS", "User Context", "Session counts and replay metadata"),
        ("ENABLE_BREADCRUMBS", "Breadcrumbs", "Breadcrumb timeline"),
        ("ENABLE_ALERTS", "Alerts & Incidents", "Alert and incident correlation"),
        ("ENABLE_ATTACHMENTS", "Attachments", "Attachment download (security sensitive)"),
        ("ENABLE_TAG_DISTRIBUTIONS", "Tag Analysis", "Tag distributions and clustering"),
        ("ENABLE_OWNERSHIP", "Ownership", "Issue ownership and team routing"),
        ("ENABLE_MEASUREMENTS", "Measurements", "Custom measurements and web vitals"),
        ("ENABLE_GROUPING_INSIGHTS", "Grouping", "Grouping variants and fingerprints"),
    ]

    print("Individual Enrichment Sources:")
    enabled_count = 0
    for flag_name, friendly_name, description in flags:
        value = getattr(settings, flag_name)
        status = "✓ ENABLED " if value else "✗ DISABLED"
        if value:
            enabled_count += 1
        print(f"  [{status}] {friendly_name:25s} - {description}")

    print()
    print(f"Summary: {enabled_count}/11 enrichment sources enabled")
    print()

    # Job settings
    print("Enrichment Job Settings:")
    print(f"  Batch Size:        {settings.ENRICHMENT_BATCH_SIZE}")
    print(f"  Interval (seconds): {settings.ENRICHMENT_INTERVAL_SECONDS}")
    print(f"  Max Retries:       {settings.ENRICHMENT_MAX_RETRIES}")
    print()

    # Instructions
    print("=" * 70)
    print("To change these settings:")
    print("  1. Update environment variables in .env file")
    print("  2. Either:")
    print("     a) Restart the application, OR")
    print("     b) Call POST /api/v1/config/reload-config to reload without restart")
    print("=" * 70)


if __name__ == "__main__":
    main()
