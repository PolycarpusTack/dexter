"""Background jobs for enrichment."""

import asyncio
import logging
from typing import List
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_

from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import SentryIssue
from app.services.enrichment.release_enrichment import get_release_enrichment_service
from app.services.enrichment.alert_enrichment import get_alert_enrichment_service
from app.services.enrichment.profiling_enrichment import get_profiling_enrichment_service
from app.services.enrichment.session_enrichment import get_session_enrichment_service
from app.services.enrichment.attachments_enrichment import get_attachments_enrichment_service
from app.services.enrichment.measurements_enrichment import get_measurements_enrichment_service
from app.services.enrichment.breadcrumbs_enrichment import get_breadcrumbs_enrichment_service
from app.services.enrichment.grouping_enrichment import get_grouping_enrichment_service

logger = logging.getLogger(__name__)


async def enrich_stale_issues():
    """
    Enrich issues that haven't been enriched recently.

    Runs periodically to keep release context fresh.
    """
    settings = get_settings()

    if not settings.ENABLE_RELEASES:
        logger.info("Release enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)
    max_age_minutes = getattr(settings, "ENRICHMENT_INTERVAL_SECONDS", 300) / 60

    async for db in get_db():
        try:
            # Find stale issues (not enriched recently)
            cutoff = datetime.utcnow() - timedelta(minutes=max_age_minutes)

            result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        (SentryIssue.last_enriched_at == None) |
                        (SentryIssue.last_enriched_at < cutoff)
                    )
                )
                .limit(batch_size)
            )
            issues = result.scalars().all()

            if not issues:
                logger.info("No stale issues to enrich")
                return

            logger.info(f"Found {len(issues)} stale issues to enrich")

            # Enrich each issue
            enrichment_service = await get_release_enrichment_service(db)

            success_count = 0
            failure_count = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                    else:
                        failure_count += 1
                    logger.debug(f"Enriched issue {issue.id}: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id}: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count})"
            )

        except Exception as e:
            logger.error(f"Background enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration


async def enrich_alerts():
    """
    Enrich issues with alert and incident data.

    Priority:
    - Issues with active incidents: refresh every 30 minutes
    - Other issues with alerts enabled: refresh every 2 hours
    """
    settings = get_settings()

    if not settings.ENABLE_ALERTS:
        logger.info("Alert enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)

    # Two intervals: priority (30 min) and normal (2 hours)
    priority_interval_minutes = 30
    normal_interval_minutes = 120

    async for db in get_db():
        try:
            priority_cutoff = datetime.now(timezone.utc) - timedelta(minutes=priority_interval_minutes)
            normal_cutoff = datetime.now(timezone.utc) - timedelta(minutes=normal_interval_minutes)

            # Priority: Issues with active incidents (refresh every 30 minutes)
            priority_result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        SentryIssue.alert_context.isnot(None),
                        SentryIssue.alert_context["active_incident"].isnot(None),
                        or_(
                            SentryIssue.last_enriched_at == None,
                            SentryIssue.last_enriched_at < priority_cutoff
                        )
                    )
                )
                .limit(batch_size)
            )
            priority_issues = priority_result.scalars().all()

            # Normal: Other issues (refresh every 2 hours)
            remaining_batch = batch_size - len(priority_issues)
            normal_issues = []

            if remaining_batch > 0:
                normal_result = await db.execute(
                    select(SentryIssue)
                    .where(
                        and_(
                            SentryIssue.processing_status == "completed",
                            or_(
                                SentryIssue.alert_context == None,
                                SentryIssue.alert_context["active_incident"] == None
                            ),
                            or_(
                                SentryIssue.last_enriched_at == None,
                                SentryIssue.last_enriched_at < normal_cutoff
                            )
                        )
                    )
                    .limit(remaining_batch)
                )
                normal_issues = normal_result.scalars().all()

            issues = priority_issues + normal_issues

            if not issues:
                logger.info("No stale issues to enrich with alerts")
                return

            logger.info(
                f"Found {len(issues)} issues to enrich with alerts "
                f"(priority: {len(priority_issues)}, normal: {len(normal_issues)})"
            )

            # Enrich each issue
            enrichment_service = await get_alert_enrichment_service(db)

            success_count = 0
            failure_count = 0
            storm_count = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                        if result.get("is_alert_storm"):
                            storm_count += 1
                    else:
                        failure_count += 1
                    logger.debug(f"Enriched issue {issue.id} with alerts: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id} with alerts: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed alert enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count}, storms: {storm_count})"
            )

        except Exception as e:
            logger.error(f"Background alert enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration


async def enrich_profiling_data():
    """
    Enrich issues with profiling hotspot data.

    Profiling enrichment is resource-intensive, so we:
    - Only enrich issues with ENABLE_PROFILING=true
    - Refresh every 6 hours (profiling data changes slowly)
    - Skip if profiling data is fresh (<6h old)
    """
    settings = get_settings()

    if not settings.ENABLE_PROFILING:
        logger.info("Profiling enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)
    refresh_interval_hours = 6  # Refresh every 6 hours

    async for db in get_db():
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=refresh_interval_hours)

            # Find issues needing profiling enrichment
            # Either never enriched or last enriched >6h ago
            result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        or_(
                            # Never enriched with profiling data
                            SentryIssue.profiling_data == None,
                            # Or profiling data is stale
                            and_(
                                SentryIssue.last_enriched_at.isnot(None),
                                SentryIssue.last_enriched_at < cutoff
                            )
                        )
                    )
                )
                .limit(batch_size)
            )
            issues = result.scalars().all()

            if not issues:
                logger.info("No issues need profiling enrichment")
                return

            logger.info(f"Found {len(issues)} issues to enrich with profiling data")

            # Enrich each issue
            enrichment_service = await get_profiling_enrichment_service(db)

            success_count = 0
            failure_count = 0
            skipped_count = 0
            hotspots_detected = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                        hotspots_detected += result.get("hotspots_count", 0)
                    elif result["status"] == "skipped":
                        skipped_count += 1
                    else:
                        failure_count += 1
                    logger.debug(f"Profiling enrichment for issue {issue.id}: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id} with profiling: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed profiling enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count}, skipped: {skipped_count}, "
                f"total hotspots: {hotspots_detected})"
            )

        except Exception as e:
            logger.error(f"Background profiling enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration


async def enrich_sessions_replays():
    """
    Enrich issues with session and replay data.

    Priority handling:
    - High-impact issues (>5% sessions affected): refresh every 1 hour
    - Normal issues: refresh every 4 hours
    - Skip if session data is fresh (<refresh interval)
    """
    settings = get_settings()

    if not settings.ENABLE_SESSIONS_REPLAYS:
        logger.info("Session/replay enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)

    # Two intervals: high-impact (1 hour) and normal (4 hours)
    high_impact_interval_hours = 1
    normal_interval_hours = 4
    high_impact_threshold = 5.0  # % of sessions affected

    async for db in get_db():
        try:
            high_impact_cutoff = datetime.now(timezone.utc) - timedelta(hours=high_impact_interval_hours)
            normal_cutoff = datetime.now(timezone.utc) - timedelta(hours=normal_interval_hours)

            # Priority: High-impact issues (refresh every 1 hour)
            # Issues affecting >5% of sessions
            high_impact_result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        SentryIssue.session_data.isnot(None),
                        SentryIssue.session_data["is_high_impact"] == True,
                        or_(
                            SentryIssue.last_enriched_at == None,
                            SentryIssue.last_enriched_at < high_impact_cutoff
                        )
                    )
                )
                .limit(batch_size)
            )
            high_impact_issues = high_impact_result.scalars().all()

            # Normal: Other issues (refresh every 4 hours)
            remaining_batch = batch_size - len(high_impact_issues)
            normal_issues = []

            if remaining_batch > 0:
                normal_result = await db.execute(
                    select(SentryIssue)
                    .where(
                        and_(
                            SentryIssue.processing_status == "completed",
                            or_(
                                SentryIssue.session_data == None,
                                SentryIssue.session_data["is_high_impact"] != True
                            ),
                            or_(
                                SentryIssue.last_enriched_at == None,
                                SentryIssue.last_enriched_at < normal_cutoff
                            )
                        )
                    )
                    .limit(remaining_batch)
                )
                normal_issues = normal_result.scalars().all()

            issues = high_impact_issues + normal_issues

            if not issues:
                logger.info("No stale issues to enrich with session data")
                return

            logger.info(
                f"Found {len(issues)} issues to enrich with sessions/replays "
                f"(high-impact: {len(high_impact_issues)}, normal: {len(normal_issues)})"
            )

            # Enrich each issue
            enrichment_service = await get_session_enrichment_service(db)

            success_count = 0
            failure_count = 0
            high_impact_count = 0
            replay_count = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                        if result.get("is_high_impact"):
                            high_impact_count += 1
                        replay_count += result.get("replay_count", 0)
                    else:
                        failure_count += 1
                    logger.debug(f"Enriched issue {issue.id} with sessions: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id} with sessions: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed session enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count}, "
                f"high-impact: {high_impact_count}, replays found: {replay_count})"
            )

        except Exception as e:
            logger.error(f"Background session enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration


async def enrich_measurements():
    """
    Enrich issues with measurements and web vitals data.

    Priority handling:
    - Issues with poor web vitals: refresh every 2 hours
    - Other issues: refresh every 6 hours
    - Skip if measurements data is fresh (<refresh interval)
    """
    settings = get_settings()

    if not settings.ENABLE_MEASUREMENTS:
        logger.info("Measurements enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)

    # Two intervals: poor vitals (2 hours) and normal (6 hours)
    poor_vitals_interval_hours = 2
    normal_interval_hours = 6

    async for db in get_db():
        try:
            poor_vitals_cutoff = datetime.now(timezone.utc) - timedelta(
                hours=poor_vitals_interval_hours
            )
            normal_cutoff = datetime.now(timezone.utc) - timedelta(
                hours=normal_interval_hours
            )

            # Priority: Issues with poor web vitals (refresh every 2 hours)
            poor_vitals_result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        SentryIssue.measurements.isnot(None),
                        SentryIssue.measurements["overall_score"] == "poor",
                        or_(
                            SentryIssue.last_enriched_at == None,
                            SentryIssue.last_enriched_at < poor_vitals_cutoff,
                        ),
                    )
                )
                .limit(batch_size)
            )
            poor_vitals_issues = poor_vitals_result.scalars().all()

            # Normal: Other issues (refresh every 6 hours)
            remaining_batch = batch_size - len(poor_vitals_issues)
            normal_issues = []

            if remaining_batch > 0:
                normal_result = await db.execute(
                    select(SentryIssue)
                    .where(
                        and_(
                            SentryIssue.processing_status == "completed",
                            or_(
                                SentryIssue.measurements == None,
                                SentryIssue.measurements["overall_score"] != "poor",
                            ),
                            or_(
                                SentryIssue.last_enriched_at == None,
                                SentryIssue.last_enriched_at < normal_cutoff,
                            ),
                        )
                    )
                    .limit(remaining_batch)
                )
                normal_issues = normal_result.scalars().all()

            issues = poor_vitals_issues + normal_issues

            if not issues:
                logger.info("No stale issues to enrich with measurements")
                return

            logger.info(
                f"Found {len(issues)} issues to enrich with measurements "
                f"(poor vitals: {len(poor_vitals_issues)}, normal: {len(normal_issues)})"
            )

            # Enrich each issue
            enrichment_service = await get_measurements_enrichment_service(db)

            success_count = 0
            failure_count = 0
            poor_count = 0
            regression_count = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                        if result.get("overall_score") == "poor":
                            poor_count += 1
                        regression_count += result.get("regressions_count", 0)
                    else:
                        failure_count += 1
                    logger.debug(f"Enriched issue {issue.id} with measurements: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id} with measurements: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed measurements enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count}, "
                f"poor vitals: {poor_count}, regressions detected: {regression_count})"
            )

        except Exception as e:
            logger.error(f"Background measurements enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration


async def enrich_attachments():
    """
    Enrich issues with attachment metadata.

    Attachment enrichment is simple and static:
    - No priority handling (attachments rarely added after initial report)
    - Refresh every 24 hours if ENABLE_ATTACHMENTS=true
    - Skip if attachment metadata is fresh (<24h old)

    CRITICAL: This ONLY fetches metadata (names, sizes, types, URLs).
    It NEVER downloads or stores attachment content.
    """
    settings = get_settings()

    if not settings.ENABLE_ATTACHMENTS:
        logger.info("Attachments enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)
    refresh_interval_hours = 24  # Refresh every 24 hours

    async for db in get_db():
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=refresh_interval_hours)

            # Find issues needing attachment enrichment
            # Either never enriched or last enriched >24h ago
            result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        or_(
                            # Never enriched with attachments
                            SentryIssue.attachments_meta == None,
                            # Or attachment data is stale
                            and_(
                                SentryIssue.last_enriched_at.isnot(None),
                                SentryIssue.last_enriched_at < cutoff
                            )
                        )
                    )
                )
                .limit(batch_size)
            )
            issues = result.scalars().all()

            if not issues:
                logger.info("No issues need attachment enrichment")
                return

            logger.info(f"Found {len(issues)} issues to enrich with attachment metadata")

            # Enrich each issue
            enrichment_service = await get_attachments_enrichment_service(db)

            success_count = 0
            failure_count = 0
            skipped_count = 0
            total_attachments = 0
            important_attachments = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                        total_attachments += result.get("total_attachments", 0)
                        important_attachments += result.get("important_count", 0)
                    elif result["status"] == "skipped":
                        skipped_count += 1
                    else:
                        failure_count += 1
                    logger.debug(f"Attachment enrichment for issue {issue.id}: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id} with attachments: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed attachment enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count}, skipped: {skipped_count}, "
                f"total attachments: {total_attachments}, important: {important_attachments})"
            )

        except Exception as e:
            logger.error(f"Background attachment enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration


async def enrich_breadcrumbs():
    """
    Enrich issues with breadcrumbs timeline data.

    Breadcrumbs are event-specific and rarely change, so we:
    - Only enrich issues with ENABLE_BREADCRUMBS=true
    - Refresh every 12 hours (breadcrumbs data changes slowly)
    - Skip if breadcrumbs data is fresh (<12h old)
    - No priority handling needed (breadcrumbs rarely change)
    """
    settings = get_settings()

    if not settings.ENABLE_BREADCRUMBS:
        logger.info("Breadcrumbs enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)
    refresh_interval_hours = 12  # Refresh every 12 hours

    async for db in get_db():
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=refresh_interval_hours)

            # Find issues needing breadcrumbs enrichment
            # Either never enriched or last enriched >12h ago
            result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        or_(
                            # Never enriched with breadcrumbs
                            SentryIssue.breadcrumbs == None,
                            # Or breadcrumbs data is stale
                            and_(
                                SentryIssue.last_enriched_at.isnot(None),
                                SentryIssue.last_enriched_at < cutoff
                            )
                        )
                    )
                )
                .limit(batch_size)
            )
            issues = result.scalars().all()

            if not issues:
                logger.info("No issues need breadcrumbs enrichment")
                return

            logger.info(f"Found {len(issues)} issues to enrich with breadcrumbs")

            # Enrich each issue
            enrichment_service = await get_breadcrumbs_enrichment_service(db)

            success_count = 0
            failure_count = 0
            skipped_count = 0
            total_breadcrumbs = 0
            total_critical_paths = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                        total_breadcrumbs += result.get("total_breadcrumbs", 0)
                        total_critical_paths += result.get("critical_path_size", 0)
                    elif result["status"] == "skipped":
                        skipped_count += 1
                    else:
                        failure_count += 1
                    logger.debug(f"Breadcrumbs enrichment for issue {issue.id}: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id} with breadcrumbs: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed breadcrumbs enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count}, skipped: {skipped_count}, "
                f"total breadcrumbs: {total_breadcrumbs}, total critical paths: {total_critical_paths})"
            )

        except Exception as e:
            logger.error(f"Background breadcrumbs enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration


async def enrich_grouping_insights():
    """
    Enrich issues with grouping insights and similar issue detection.

    Priority handling:
    - New issues (first 24h): refresh every 2 hours (grouping may change)
    - Older issues: refresh every 8 hours
    - Skip if grouping insights are fresh (<refresh interval)

    Grouping enrichment includes:
    - Fingerprint variants and algorithm info
    - Similar issues detection
    - Grouping health (over/under-grouping detection)
    """
    settings = get_settings()

    if not settings.ENABLE_GROUPING_INSIGHTS:
        logger.info("Grouping insights enrichment disabled, skipping background job")
        return

    batch_size = getattr(settings, "ENRICHMENT_BATCH_SIZE", 50)

    # Two intervals: new issues (2 hours) and older issues (8 hours)
    new_issue_interval_hours = 2
    normal_interval_hours = 8
    new_issue_age_hours = 24  # Issues created in last 24h are "new"

    async for db in get_db():
        try:
            new_issue_cutoff = datetime.now(timezone.utc) - timedelta(hours=new_issue_interval_hours)
            normal_cutoff = datetime.now(timezone.utc) - timedelta(hours=normal_interval_hours)
            new_issue_age_cutoff = datetime.now(timezone.utc) - timedelta(hours=new_issue_age_hours)

            # Priority: New issues (created in last 24h, refresh every 2 hours)
            new_issues_result = await db.execute(
                select(SentryIssue)
                .where(
                    and_(
                        SentryIssue.processing_status == "completed",
                        SentryIssue.created_at >= new_issue_age_cutoff,
                        or_(
                            SentryIssue.last_enriched_at == None,
                            SentryIssue.last_enriched_at < new_issue_cutoff,
                        ),
                    )
                )
                .limit(batch_size)
            )
            new_issues = new_issues_result.scalars().all()

            # Normal: Older issues (refresh every 8 hours)
            remaining_batch = batch_size - len(new_issues)
            older_issues = []

            if remaining_batch > 0:
                older_issues_result = await db.execute(
                    select(SentryIssue)
                    .where(
                        and_(
                            SentryIssue.processing_status == "completed",
                            SentryIssue.created_at < new_issue_age_cutoff,
                            or_(
                                SentryIssue.last_enriched_at == None,
                                SentryIssue.last_enriched_at < normal_cutoff,
                            ),
                        )
                    )
                    .limit(remaining_batch)
                )
                older_issues = older_issues_result.scalars().all()

            issues = new_issues + older_issues

            if not issues:
                logger.info("No stale issues to enrich with grouping insights")
                return

            logger.info(
                f"Found {len(issues)} issues to enrich with grouping insights "
                f"(new: {len(new_issues)}, older: {len(older_issues)})"
            )

            # Enrich each issue
            enrichment_service = await get_grouping_enrichment_service(db)

            success_count = 0
            failure_count = 0
            similar_issues_found = 0
            overgrouped_count = 0
            undergrouped_count = 0

            for issue in issues:
                try:
                    result = await enrichment_service.enrich_issue(issue.id)
                    if result["status"] == "success":
                        success_count += 1
                        similar_issues_found += result.get("similar_issues_count", 0)
                        # Note: These would need to be extracted from grouping_insights
                        # For now, we'll log the basic counts
                    else:
                        failure_count += 1
                    logger.debug(f"Enriched issue {issue.id} with grouping insights: {result}")
                except Exception as e:
                    logger.error(f"Failed to enrich issue {issue.id} with grouping insights: {e}")
                    failure_count += 1
                    continue

            logger.info(
                f"Completed grouping insights enrichment of {len(issues)} issues "
                f"(success: {success_count}, failed: {failure_count}, "
                f"similar issues found: {similar_issues_found})"
            )

        except Exception as e:
            logger.error(f"Background grouping insights enrichment job failed: {e}", exc_info=True)
        finally:
            break  # get_db() is async generator, break after one iteration
