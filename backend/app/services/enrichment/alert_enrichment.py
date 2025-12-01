"""
Alert and incident enrichment service.

Fetches alert history and incident data from Sentry,
correlates incidents with issues, and detects alert storms.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.alerts import AlertClient, Incident, AlertRule
from app.services.pii_scrubber import get_pii_scrubber

logger = logging.getLogger(__name__)


class AlertEnrichmentService:
    """Service for enriching issues with alert and incident data."""

    def __init__(self, db: AsyncSession, sentry_client: AlertClient):
        self.db = db
        self.client = sentry_client
        self.pii_scrubber = get_pii_scrubber()
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich a single issue with alert and incident context.

        Args:
            issue_id: Database ID of the issue

        Returns:
            Enrichment result with status and data
        """
        # Check feature flag
        if not self.settings.ENABLE_ALERTS:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            # Get issue from database
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Extract org/project from issue metadata
            org = self._extract_org(issue)
            project = self._extract_project(issue)

            if not org:
                logger.warning(f"Missing organization for issue {issue_id}, skipping enrichment")
                return {"status": "skipped", "reason": "missing organization"}

            # Fetch alert rules (metric + issue alerts)
            alert_rules = []
            try:
                # Get metric alert rules
                metric_rules = await self.client.get_metric_alert_rules(org, project)
                alert_rules.extend(metric_rules)

                # Get issue alert rules if project is available
                if project:
                    try:
                        issue_rules = await self.client.get_issue_alert_rules(org, project)
                        alert_rules.extend(issue_rules)
                    except Exception as e:
                        logger.warning(f"Failed to fetch issue alert rules for {org}/{project}: {e}")
            except Exception as e:
                logger.error(f"Failed to fetch alert rules for {org}: {e}")

            # Fetch incidents (focus on recent ones)
            incidents = []
            try:
                # Get all incidents in last 7 days
                all_incidents = await self.client.get_incidents(org, limit=100)

                # Filter incidents to last 7 days
                cutoff = datetime.now(timezone.utc) - timedelta(days=7)
                incidents = [
                    inc for inc in all_incidents
                    if inc.date_started >= cutoff
                ]
            except Exception as e:
                logger.error(f"Failed to fetch incidents for {org}: {e}")

            # Build alert context
            alert_context = self._build_alert_context(
                issue,
                alert_rules,
                incidents
            )

            # No PII in alert data (already sanitized by Sentry)
            # But we still run scrubber for consistency and future-proofing
            alert_context = self.pii_scrubber.scrub_dict(alert_context)

            # Update issue with alert context
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    alert_context=alert_context,
                    enrichment_status=self._update_enrichment_status(
                        issue.enrichment_status or {},
                        "alerts",
                        "completed"
                    ),
                    last_enriched_at=datetime.now(timezone.utc)
                )
            )
            await self.db.commit()

            logger.info(f"Enriched issue {issue_id} with alert context", extra={
                "issue_id": issue_id,
                "alert_rules_count": len(alert_rules),
                "incidents_count": len(incidents),
                "is_alert_storm": alert_context.get("is_alert_storm", False)
            })

            return {
                "status": "success",
                "alert_rules_count": len(alert_rules),
                "incidents_count": len(incidents),
                "is_alert_storm": alert_context.get("is_alert_storm", False)
            }

        except Exception as e:
            logger.error(f"Failed to enrich issue {issue_id}: {e}", exc_info=True)

            # Update status to failed
            try:
                await self.db.execute(
                    update(SentryIssue)
                    .where(SentryIssue.id == issue_id)
                    .values(
                        enrichment_status=self._update_enrichment_status(
                            {},
                            "alerts",
                            "failed",
                            error=str(e)
                        )
                    )
                )
                await self.db.commit()
            except Exception as db_error:
                logger.error(f"Failed to update enrichment status: {db_error}")

            return {"status": "error", "reason": str(e)}

    def _build_alert_context(
        self,
        issue: SentryIssue,
        alert_rules: List[AlertRule],
        incidents: List[Incident]
    ) -> Dict[str, Any]:
        """
        Build structured alert context for storage.

        Args:
            issue: The issue being enriched
            alert_rules: List of alert rules from Sentry
            incidents: List of incidents from Sentry

        Returns:
            Alert context dictionary
        """
        # Get alert history (alerts that could have been triggered by this issue)
        # For now, we'll use incident data as proxy for alert history
        alert_history = self._extract_alert_history_from_incidents(incidents)

        # Detect alert storm
        is_alert_storm, storm_details = self._detect_alert_storm(alert_history)

        # Correlate incidents with this issue
        correlated_incidents, active_incident = self._correlate_incidents(
            issue,
            incidents
        )

        # Compute alert frequency
        recent_alert_count = self._compute_alert_frequency(alert_history, window_hours=24)

        return {
            "alert_history": alert_history[:50],  # Store last 50 alerts
            "recent_alert_count": recent_alert_count,
            "is_alert_storm": is_alert_storm,
            "alert_storm_details": storm_details,
            "correlated_incidents": correlated_incidents,
            "active_incident": active_incident,
            "alert_rules": [
                {
                    "id": rule.id,
                    "name": rule.name,
                    "status": rule.status,
                    "date_created": rule.date_created.isoformat() if rule.date_created else None
                }
                for rule in alert_rules[:10]  # Store top 10 rules
            ],
            "last_fetched": datetime.now(timezone.utc).isoformat()
        }

    def _extract_alert_history_from_incidents(
        self,
        incidents: List[Incident]
    ) -> List[Dict[str, Any]]:
        """
        Extract alert history from incident data.

        In production, this would come from alert rule history API.
        For now, we use incidents as proxy.

        Args:
            incidents: List of incidents

        Returns:
            List of alert events
        """
        alert_history = []

        for incident in incidents:
            alert_history.append({
                "incident_id": incident.id,
                "timestamp": incident.date_detected.isoformat() if incident.date_detected else None,
                "severity": self._map_incident_status_to_severity(incident.status),
                "title": incident.title,
                "status": incident.status,
                "date_started": incident.date_started.isoformat() if incident.date_started else None,
                "date_closed": incident.date_closed.isoformat() if incident.date_closed else None
            })

        # Sort by timestamp descending (most recent first)
        alert_history.sort(
            key=lambda x: x["timestamp"] if x["timestamp"] else "",
            reverse=True
        )

        return alert_history

    def _detect_alert_storm(
        self,
        alert_history: List[Dict[str, Any]],
        threshold: int = 3,
        window_minutes: int = 60
    ) -> tuple[bool, Optional[Dict[str, Any]]]:
        """
        Detect if there's an alert storm (>3 alerts in 1 hour).

        Args:
            alert_history: List of alert events
            threshold: Number of alerts to qualify as storm (default: 3)
            window_minutes: Time window in minutes (default: 60)

        Returns:
            Tuple of (is_storm, storm_details)
        """
        if len(alert_history) < threshold:
            return False, None

        # Parse timestamps
        alerts_with_time = []
        for alert in alert_history:
            timestamp_str = alert.get("timestamp")
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    alerts_with_time.append({
                        "alert": alert,
                        "timestamp": timestamp
                    })
                except (ValueError, TypeError):
                    continue

        if len(alerts_with_time) < threshold:
            return False, None

        # Sort by timestamp ascending
        alerts_with_time.sort(key=lambda x: x["timestamp"])

        # Use sliding window to detect storm
        for i in range(len(alerts_with_time) - threshold + 1):
            window_start = alerts_with_time[i]["timestamp"]
            window_end = window_start + timedelta(minutes=window_minutes)

            # Count alerts in this window
            alerts_in_window = 0
            last_alert_time = None

            for j in range(i, len(alerts_with_time)):
                alert_time = alerts_with_time[j]["timestamp"]
                if alert_time <= window_end:
                    alerts_in_window += 1
                    last_alert_time = alert_time
                else:
                    break

            # Storm detected
            if alerts_in_window >= threshold:
                duration_minutes = (last_alert_time - window_start).total_seconds() / 60

                return True, {
                    "alert_count": alerts_in_window,
                    "start_time": window_start.isoformat(),
                    "end_time": last_alert_time.isoformat() if last_alert_time else None,
                    "duration_minutes": round(duration_minutes, 2),
                    "window_minutes": window_minutes
                }

        return False, None

    def _correlate_incidents(
        self,
        issue: SentryIssue,
        incidents: List[Incident]
    ) -> tuple[List[str], Optional[Dict[str, Any]]]:
        """
        Correlate incidents with this issue.

        In production, this would match issue fingerprint to incident issue group.
        For now, we use simple heuristics.

        Args:
            issue: The issue to correlate
            incidents: List of incidents

        Returns:
            Tuple of (correlated_incident_ids, active_incident_data)
        """
        correlated_ids = []
        active_incident = None

        # Simple correlation: match by error type or title
        issue_error_type = issue.error_type.lower() if issue.error_type else ""
        issue_error_msg = issue.error_message.lower() if issue.error_message else ""

        for incident in incidents:
            incident_title = incident.title.lower() if incident.title else ""

            # Check for correlation
            is_correlated = (
                issue_error_type in incident_title or
                any(word in incident_title for word in issue_error_msg.split()[:5])
            )

            if is_correlated:
                correlated_ids.append(incident.identifier)

                # Track active incident (open/critical/warning)
                if incident.status in ["open", "critical", "warning"] and not active_incident:
                    active_incident = {
                        "id": incident.id,
                        "identifier": incident.identifier,
                        "title": incident.title,
                        "status": incident.status,
                        "priority": self._map_status_to_priority(incident.status),
                        "date_started": incident.date_started.isoformat() if incident.date_started else None,
                        "date_detected": incident.date_detected.isoformat() if incident.date_detected else None
                    }

        return correlated_ids, active_incident

    def _compute_alert_frequency(
        self,
        alert_history: List[Dict[str, Any]],
        window_hours: float = 24.0
    ) -> int:
        """
        Count alerts in the specified time window.

        Args:
            alert_history: List of alert events
            window_hours: Time window in hours

        Returns:
            Count of alerts in window
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        count = 0

        for alert in alert_history:
            timestamp_str = alert.get("timestamp")
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                    if timestamp >= cutoff:
                        count += 1
                except (ValueError, TypeError):
                    continue

        return count

    def _map_incident_status_to_severity(self, status: str) -> str:
        """Map incident status to alert severity level."""
        severity_map = {
            "critical": "critical",
            "warning": "warning",
            "open": "medium",
            "closed": "low"
        }
        return severity_map.get(status.lower(), "medium")

    def _map_status_to_priority(self, status: str) -> str:
        """Map incident status to priority level."""
        priority_map = {
            "critical": "high",
            "warning": "medium",
            "open": "medium",
            "closed": "low"
        }
        return priority_map.get(status.lower(), "medium")

    def _extract_org(self, issue: SentryIssue) -> Optional[str]:
        """Extract organization from issue."""
        # Try to get from context_tags first
        if issue.context_tags and "organization" in issue.context_tags:
            return issue.context_tags["organization"]

        # Fallback to config
        org_from_config = getattr(self.settings, "SENTRY_ORGANIZATION_SLUG", None)
        if org_from_config:
            return org_from_config

        # Try deprecated fields
        return self.settings.SENTRY_ORG or self.settings.ORGANIZATION_SLUG or None

    def _extract_project(self, issue: SentryIssue) -> Optional[str]:
        """Extract project from issue."""
        # Try to get from context_tags first
        if issue.context_tags and "project" in issue.context_tags:
            return issue.context_tags["project"]

        # Fallback to config
        project_from_config = getattr(self.settings, "SENTRY_PROJECT_SLUG", None)
        if project_from_config:
            return project_from_config

        # Try deprecated field
        return self.settings.PROJECT_SLUG or None

    def _update_enrichment_status(
        self,
        current_status: Dict[str, Any],
        source: str,
        status: str,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update enrichment status for a source."""
        current_status[source] = {
            "status": status,
            "last_attempt": datetime.now(timezone.utc).isoformat(),
            "error": error
        }
        return current_status


async def get_alert_enrichment_service(
    db: AsyncSession
) -> AlertEnrichmentService:
    """Factory function for alert enrichment service."""
    settings = get_settings()
    client = AlertClient(token=settings.get_sentry_token())
    return AlertEnrichmentService(db, client)
