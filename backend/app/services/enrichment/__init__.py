"""
Enrichment services for Dexter knowledge base.

Provides services to enrich issue data with additional context from Sentry:
- Release and commit intelligence (EPIC D)
- Ownership and team routing (EPIC F)
- Performance span analysis (EPIC E)
- Profiling hotspots (EPIC H)
- Alert correlation (EPIC J)
- Session and replay tracking (EPIC I)
- Breadcrumbs timeline (EPIC K)
- Attachments metadata (EPIC L)
- Measurements and web vitals (EPIC M)
- Grouping insights and similar issues (EPIC N)
"""

# Only import what exists
__all__ = []

# EPIC D: Release enrichment
try:
    from .release_enrichment import ReleaseEnrichmentService, get_release_enrichment_service
    from .background_jobs import enrich_stale_issues, enrich_alerts

    __all__.extend([
        "ReleaseEnrichmentService",
        "get_release_enrichment_service",
        "enrich_stale_issues",
        "enrich_alerts",
    ])
except ImportError:
    pass

# EPIC F: Ownership enrichment
try:
    from .ownership_enrichment import (
        OwnershipEnrichmentService,
        get_ownership_enrichment_service,
    )

    __all__.extend([
        "OwnershipEnrichmentService",
        "get_ownership_enrichment_service",
    ])
except ImportError:
    pass

# EPIC E: Performance enrichment
try:
    from .performance_enrichment import (
        PerformanceEnrichmentService,
        get_performance_enrichment_service,
    )

    __all__.extend([
        "PerformanceEnrichmentService",
        "get_performance_enrichment_service",
    ])
except ImportError:
    pass

# EPIC H: Profiling enrichment
try:
    from .profiling_enrichment import (
        ProfilingEnrichmentService,
        get_profiling_enrichment_service,
    )
    from .background_jobs import enrich_profiling_data

    __all__.extend([
        "ProfilingEnrichmentService",
        "get_profiling_enrichment_service",
        "enrich_profiling_data",
    ])
except ImportError:
    pass

# EPIC J: Alert enrichment
try:
    from .alert_enrichment import (
        AlertEnrichmentService,
        get_alert_enrichment_service,
    )

    __all__.extend([
        "AlertEnrichmentService",
        "get_alert_enrichment_service",
    ])
except ImportError:
    pass

# EPIC I: Session and replay enrichment
try:
    from .session_enrichment import (
        SessionEnrichmentService,
        get_session_enrichment_service,
    )
    from .background_jobs import enrich_sessions_replays

    __all__.extend([
        "SessionEnrichmentService",
        "get_session_enrichment_service",
        "enrich_sessions_replays",
    ])
except ImportError:
    pass

# EPIC M: Measurements and Web Vitals enrichment
try:
    from .measurements_enrichment import (
        MeasurementsEnrichmentService,
        get_measurements_enrichment_service,
    )
    from .background_jobs import enrich_measurements

    __all__.extend([
        "MeasurementsEnrichmentService",
        "get_measurements_enrichment_service",
        "enrich_measurements",
    ])
except ImportError:
    pass

# EPIC L: Attachments metadata enrichment
try:
    from .attachments_enrichment import (
        AttachmentsEnrichmentService,
        get_attachments_enrichment_service,
    )
    from .background_jobs import enrich_attachments

    __all__.extend([
        "AttachmentsEnrichmentService",
        "get_attachments_enrichment_service",
        "enrich_attachments",
    ])
except ImportError:
    pass

# EPIC K: Breadcrumbs timeline enrichment
try:
    from .breadcrumbs_enrichment import (
        BreadcrumbsEnrichmentService,
        get_breadcrumbs_enrichment_service,
    )
    from .background_jobs import enrich_breadcrumbs

    __all__.extend([
        "BreadcrumbsEnrichmentService",
        "get_breadcrumbs_enrichment_service",
        "enrich_breadcrumbs",
    ])
except ImportError:
    pass

# EPIC N: Grouping insights enrichment
try:
    from .grouping_enrichment import (
        GroupingEnrichmentService,
        get_grouping_enrichment_service,
    )
    from .background_jobs import enrich_grouping_insights

    __all__.extend([
        "GroupingEnrichmentService",
        "get_grouping_enrichment_service",
        "enrich_grouping_insights",
    ])
except ImportError:
    pass

# Signal computation (EPIC D + EPIC E + EPIC F + EPIC H + EPIC I + EPIC J)
try:
    from .signal_computation import (
        compute_release_recency_score,
        update_enrichment_signals,
        compute_composite_score,
        compute_ownership_match_score,
        compute_alert_frequency_score,
        compute_replay_impact_score,
        compute_tag_overlap_score,
        compute_performance_impact_score,
        compute_n_plus_one_severity_score,
        compute_composite_performance_score,
        compute_profiling_hotspot_score,
    )

    __all__.extend([
        "compute_release_recency_score",
        "update_enrichment_signals",
        "compute_composite_score",
        "compute_ownership_match_score",
        "compute_alert_frequency_score",
        "compute_replay_impact_score",
        "compute_tag_overlap_score",
        "compute_performance_impact_score",
        "compute_n_plus_one_severity_score",
        "compute_composite_performance_score",
        "compute_profiling_hotspot_score",
    ])
except ImportError:
    pass
