"""
Measurements and Web Vitals enrichment service.

Fetches Core Web Vitals and custom measurements from Sentry events,
scores them according to Google's standards, and detects performance regressions.

This module implements Story M-1 through M-4 from EPIC M:
- Web Vitals extraction and scoring (LCP, FID, CLS, TTFB, FCP)
- Custom measurements extraction
- Baseline comparison and regression detection
- Background job integration with priority handling

IMPORTANT: No PII scrubbing needed - measurements are numeric data only.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.models import SentryIssue
from app.services.sentry.measurements import MeasurementClient, Measurement

logger = logging.getLogger(__name__)


# Google's Web Vitals thresholds
# Values represent upper bounds for "good" and "poor" ratings
THRESHOLDS = {
    "lcp": {"good": 2.5, "poor": 4.0, "unit": "s"},  # seconds
    "fid": {"good": 100, "poor": 300, "unit": "ms"},  # milliseconds
    "cls": {"good": 0.1, "poor": 0.25, "unit": ""},  # unitless
    "ttfb": {"good": 800, "poor": 1800, "unit": "ms"},  # milliseconds
    "fcp": {"good": 1.8, "poor": 3.0, "unit": "s"},  # seconds
}

# Minimum samples required for statistical validity of baselines
MIN_BASELINE_SAMPLES = 10

# Regression severity thresholds (percentage increase from baseline)
REGRESSION_THRESHOLDS = {
    "critical": 100,  # 100%+ increase
    "high": 50,  # 50-100% increase
    "medium": 25,  # 25-50% increase
    "low": 10,  # 10-25% increase
}


class MeasurementsEnrichmentService:
    """Service for enriching issues with Web Vitals and custom measurements."""

    def __init__(self, db: AsyncSession, sentry_client: MeasurementClient):
        """
        Initialize measurements enrichment service.

        Args:
            db: Database session
            sentry_client: Sentry measurements client
        """
        self.db = db
        self.client = sentry_client
        self.settings = get_settings()

    async def enrich_issue(self, issue_id: int) -> Dict[str, Any]:
        """
        Enrich issue with measurements and web vitals data.

        Args:
            issue_id: Database ID of the issue to enrich

        Returns:
            Dict with enrichment status and metrics
        """
        if not self.settings.ENABLE_MEASUREMENTS:
            return {"status": "skipped", "reason": "feature disabled"}

        try:
            result = await self.db.execute(
                select(SentryIssue).where(SentryIssue.id == issue_id)
            )
            issue = result.scalar_one_or_none()
            if not issue:
                return {"status": "error", "reason": "issue not found"}

            # Fetch measurements from issue's latest event
            try:
                measurements = await self.client.get_issue_measurements(
                    issue.sentry_issue_id
                )
            except Exception as e:
                logger.error(
                    f"Failed to fetch measurements for issue {issue.sentry_issue_id}: {e}"
                )
                measurements = []

            if not measurements:
                logger.debug(f"No measurements available for issue {issue_id}")
                return {"status": "skipped", "reason": "no measurements data"}

            # Extract and score web vitals
            web_vitals = self._extract_web_vitals(measurements)
            overall_score = self._compute_web_vitals_score(web_vitals)

            # Extract custom metrics (non-web-vital measurements)
            custom_metrics = self._extract_custom_metrics(measurements)

            # Get baseline data for regression detection
            baseline_data = await self._get_baseline_data(issue)
            regressions = self._compare_to_baseline(web_vitals, baseline_data)

            # Build measurements context
            measurements_data = self._build_measurements_data(
                web_vitals, overall_score, custom_metrics, baseline_data, regressions
            )

            # Update issue
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    measurements=measurements_data,
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {}, "measurements", "completed"
                    ),
                    last_enriched_at=datetime.utcnow(),
                )
            )
            await self.db.commit()

            logger.info(
                f"Enriched issue {issue_id} with measurements data",
                extra={
                    "issue_id": issue_id,
                    "overall_score": overall_score,
                    "vitals_count": len(
                        [v for v in web_vitals.values() if v is not None]
                    ),
                    "custom_count": len(custom_metrics),
                    "regressions": len(regressions),
                },
            )

            return {
                "status": "success",
                "overall_score": overall_score,
                "vitals_count": len([v for v in web_vitals.values() if v is not None]),
                "custom_count": len(custom_metrics),
                "regressions_count": len(regressions),
            }

        except Exception as e:
            logger.error(
                f"Measurements enrichment failed for issue {issue_id}: {e}",
                exc_info=True,
            )
            await self._mark_failed(issue_id, str(e))
            return {"status": "error", "reason": str(e)}

    def _extract_web_vitals(
        self, measurements: List[Measurement]
    ) -> Dict[str, Optional[Dict[str, Any]]]:
        """
        Extract Core Web Vitals from measurements.

        Args:
            measurements: List of all measurements

        Returns:
            Dict mapping vital name to {value, score, unit} or None if not present
        """
        vitals = {}
        web_vital_names = {"lcp", "fid", "cls", "ttfb", "fcp"}

        # Create lookup dict
        measurement_dict = {m.name.lower(): m for m in measurements}

        for vital_name in web_vital_names:
            measurement = measurement_dict.get(vital_name)
            if measurement:
                # Convert value to appropriate unit for scoring
                value = self._convert_to_threshold_unit(
                    measurement.value, measurement.unit, vital_name
                )

                vitals[vital_name] = {
                    "value": round(value, 2),
                    "score": self._score_web_vital(vital_name, value),
                    "unit": THRESHOLDS[vital_name]["unit"],
                }
            else:
                vitals[vital_name] = None

        return vitals

    def _convert_to_threshold_unit(
        self, value: float, measurement_unit: str, vital_name: str
    ) -> float:
        """
        Convert measurement value to the unit expected by thresholds.

        Args:
            value: Raw measurement value
            measurement_unit: Unit from Sentry (e.g., "millisecond", "none")
            vital_name: Name of the web vital

        Returns:
            Converted value in threshold unit
        """
        threshold_unit = THRESHOLDS[vital_name]["unit"]

        # Handle unitless metrics (CLS)
        if threshold_unit == "":
            return value

        # Convert milliseconds to seconds if needed
        if measurement_unit == "millisecond" and threshold_unit == "s":
            return value / 1000.0

        # Convert seconds to milliseconds if needed
        if measurement_unit in ("second", "s") and threshold_unit == "ms":
            return value * 1000.0

        # Already in correct unit
        return value

    def _score_web_vital(self, vital_name: str, value: float) -> str:
        """
        Score a web vital as good/needs-improvement/poor based on Google's thresholds.

        Args:
            vital_name: Name of the vital (lcp, fid, cls, ttfb, fcp)
            value: Vital value in threshold unit

        Returns:
            Score: "good", "needs-improvement", or "poor"
        """
        thresholds = THRESHOLDS.get(vital_name)
        if not thresholds:
            return "unknown"

        if value <= thresholds["good"]:
            return "good"
        elif value <= thresholds["poor"]:
            return "needs-improvement"
        else:
            return "poor"

    def _compute_web_vitals_score(
        self, web_vitals: Dict[str, Optional[Dict[str, Any]]]
    ) -> str:
        """
        Compute overall Web Vitals score.

        Overall score logic:
        - "good" if all present metrics are good
        - "poor" if any metric is poor
        - "needs-improvement" otherwise

        Args:
            web_vitals: Dict of web vitals with scores

        Returns:
            Overall score: "good", "needs-improvement", or "poor"
        """
        scores = [
            vital["score"]
            for vital in web_vitals.values()
            if vital is not None and "score" in vital
        ]

        if not scores:
            return "no-data"

        # If any metric is poor, overall is poor
        if "poor" in scores:
            return "poor"

        # If all metrics are good, overall is good
        if all(score == "good" for score in scores):
            return "good"

        # Otherwise, needs improvement
        return "needs-improvement"

    def _extract_custom_metrics(
        self, measurements: List[Measurement]
    ) -> Dict[str, float]:
        """
        Extract custom (non-web-vital) measurements.

        Args:
            measurements: List of all measurements

        Returns:
            Dict of custom metric name to value
        """
        web_vital_names = {"lcp", "fid", "cls", "ttfb", "fcp", "fp"}
        custom = {}

        for measurement in measurements:
            if measurement.name.lower() not in web_vital_names:
                custom[measurement.name] = round(measurement.value, 2)

        return custom

    async def _get_baseline_data(self, issue: SentryIssue) -> Dict[str, float]:
        """
        Get baseline measurements (p75 over 7 days) for regression detection.

        For MVP, we return empty dict. In production, this would query
        historical measurements from the last 7 days and compute p75.

        Args:
            issue: The issue to get baseline for

        Returns:
            Dict of {metric_name_p75: value}
        """
        # TODO: Implement baseline calculation from historical data
        # This would require:
        # 1. Query all measurements for this issue type from last 7 days
        # 2. Compute p75 for each metric
        # 3. Require >= MIN_BASELINE_SAMPLES samples for validity

        # For now, return empty baseline
        # In production, this could query from a separate measurements table
        return {}

    def _compare_to_baseline(
        self,
        web_vitals: Dict[str, Optional[Dict[str, Any]]],
        baseline: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        """
        Compare current measurements to baseline and detect regressions.

        A regression is detected when current value exceeds baseline by 10%+.

        Args:
            web_vitals: Current web vitals measurements
            baseline: Baseline measurements (p75 over 7 days)

        Returns:
            List of regression dictionaries
        """
        if not baseline:
            return []

        regressions = []

        for vital_name, vital_data in web_vitals.items():
            if vital_data is None:
                continue

            baseline_key = f"{vital_name}_p75"
            baseline_value = baseline.get(baseline_key)

            if baseline_value is None or baseline_value == 0:
                continue

            current_value = vital_data["value"]
            regression_pct = ((current_value - baseline_value) / baseline_value) * 100

            # Only flag if regression >= 10%
            if regression_pct >= 10:
                severity = self._compute_regression_severity(regression_pct)
                regressions.append(
                    {
                        "metric": vital_name,
                        "current": current_value,
                        "baseline": baseline_value,
                        "regression_pct": round(regression_pct, 1),
                        "severity": severity,
                    }
                )

        return regressions

    def _compute_regression_severity(self, regression_pct: float) -> str:
        """
        Compute regression severity based on percentage increase.

        Args:
            regression_pct: Percentage increase from baseline

        Returns:
            Severity: "critical", "high", "medium", or "low"
        """
        if regression_pct >= REGRESSION_THRESHOLDS["critical"]:
            return "critical"
        elif regression_pct >= REGRESSION_THRESHOLDS["high"]:
            return "high"
        elif regression_pct >= REGRESSION_THRESHOLDS["medium"]:
            return "medium"
        else:
            return "low"

    def _build_measurements_data(
        self,
        web_vitals: Dict[str, Optional[Dict[str, Any]]],
        overall_score: str,
        custom_metrics: Dict[str, float],
        baseline: Dict[str, float],
        regressions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Build structured measurements data for storage.

        Args:
            web_vitals: Scored web vitals
            overall_score: Overall score
            custom_metrics: Custom measurements
            baseline: Baseline data
            regressions: Detected regressions

        Returns:
            Structured measurements data dictionary
        """
        # Count non-null vitals
        vitals_count = len([v for v in web_vitals.values() if v is not None])

        return {
            "web_vitals": web_vitals,
            "overall_score": overall_score,
            "custom_metrics": custom_metrics,
            "baselines": baseline,
            "regressions": regressions,
            "summary": {
                "has_web_vitals": vitals_count > 0,
                "has_custom_metrics": len(custom_metrics) > 0,
                "vitals_count": vitals_count,
                "custom_count": len(custom_metrics),
                "has_regressions": len(regressions) > 0,
                "worst_regression_severity": (
                    max((r["severity"] for r in regressions), key=self._severity_rank)
                    if regressions
                    else None
                ),
            },
            "last_fetched": datetime.utcnow().isoformat(),
        }

    def _severity_rank(self, severity: str) -> int:
        """Map severity to numeric rank for comparison."""
        rank_map = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        return rank_map.get(severity, 0)

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
        return (
            self.settings.SENTRY_ORG
            or self.settings.ORGANIZATION_SLUG
            or None
        )

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

    def _update_status(
        self, current: Dict, source: str, status: str, error: Optional[str] = None
    ) -> Dict:
        """
        Update enrichment status.

        Args:
            current: Current enrichment status
            source: Enrichment source name
            status: New status (completed, failed, pending)
            error: Optional error message

        Returns:
            Updated enrichment status dictionary
        """
        current[source] = {
            "status": status,
            "last_attempt": datetime.utcnow().isoformat(),
            "error": error,
        }
        return current

    async def _mark_failed(self, issue_id: int, error: str):
        """
        Mark enrichment as failed.

        Args:
            issue_id: Database ID of the issue
            error: Error message
        """
        result = await self.db.execute(
            select(SentryIssue).where(SentryIssue.id == issue_id)
        )
        issue = result.scalar_one_or_none()
        if issue:
            await self.db.execute(
                update(SentryIssue)
                .where(SentryIssue.id == issue_id)
                .values(
                    enrichment_status=self._update_status(
                        issue.enrichment_status or {},
                        "measurements",
                        "failed",
                        error=error,
                    )
                )
            )
            await self.db.commit()


async def get_measurements_enrichment_service(
    db: AsyncSession,
) -> MeasurementsEnrichmentService:
    """
    Factory for measurements enrichment service.

    Args:
        db: Database session

    Returns:
        MeasurementsEnrichmentService instance
    """
    settings = get_settings()
    client = MeasurementClient(token=settings.get_sentry_token())
    return MeasurementsEnrichmentService(db, client)
