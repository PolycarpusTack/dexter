"""
Alert Health Scheduler - Manages scheduled background analysis tasks.

This module provides functionality for scheduling and managing periodic
alert health analysis tasks.
"""

import logging
from dataclasses import dataclass

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.services.alert_health_service import AlertHealthService
from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)


@dataclass
class ScheduledTask:
    """Represents a scheduled analysis task."""

    task_id: str
    name: str
    description: str
    schedule_type: str  # 'interval' or 'cron'
    schedule_config: Dict[str, Any]
    enabled: bool
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    last_result: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "task_id": self.task_id,
            "name": self.name,
            "description": self.description,
            "schedule_type": self.schedule_type,
            "schedule_config": self.schedule_config,
            "enabled": self.enabled,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat() if self.next_run else None,
            "last_result": self.last_result,
        }


class AlertHealthScheduler:
    """Scheduler for periodic alert health analysis tasks."""

    def __init__(
        self, alert_health_service: AlertHealthService, cache_service: Optional[CacheService] = None
    ):
        """Initialize the scheduler."""
        self.alert_health_service = alert_health_service
        self.cache_service = cache_service
        self.scheduler = AsyncIOScheduler()
        self.tasks: Dict[str, ScheduledTask] = {}

        # Define default tasks
        self._initialize_default_tasks()

    def _initialize_default_tasks(self):
        """Initialize default scheduled tasks."""
        # Daily health metrics analysis
        self.tasks["daily_health_analysis"] = ScheduledTask(
            task_id="daily_health_analysis",
            name="Daily Health Analysis",
            description="Analyze alert health metrics for all rules daily",
            schedule_type="cron",
            schedule_config={"hour": 2, "minute": 0},  # Run at 2 AM
            enabled=True,
        )

        # Hourly storm detection
        self.tasks["hourly_storm_detection"] = ScheduledTask(
            task_id="hourly_storm_detection",
            name="Hourly Storm Detection",
            description="Detect alert storms every hour",
            schedule_type="interval",
            schedule_config={"hours": 1},
            enabled=True,
        )

        # Weekly threshold optimization
        self.tasks["weekly_threshold_optimization"] = ScheduledTask(
            task_id="weekly_threshold_optimization",
            name="Weekly Threshold Optimization",
            description="Generate threshold recommendations weekly",
            schedule_type="cron",
            schedule_config={"day_of_week": 0, "hour": 3, "minute": 0},  # Sunday 3 AM
            enabled=True,
        )

        # Daily noise analysis
        self.tasks["daily_noise_analysis"] = ScheduledTask(
            task_id="daily_noise_analysis",
            name="Daily Noise Analysis",
            description="Analyze alert noise patterns daily",
            schedule_type="cron",
            schedule_config={"hour": 4, "minute": 0},  # Run at 4 AM
            enabled=True,
        )

    def start(self):
        """Start the scheduler and all enabled tasks."""
        try:
            # Add all enabled tasks to scheduler
            for task_id, task in self.tasks.items():
                if task.enabled:
                    self._schedule_task(task)

            # Start the scheduler
            self.scheduler.start()
            logger.info("Alert health scheduler started successfully")

        except Exception as e:
            logger.error(f"Failed to start scheduler: {str(e)}")
            raise

    def stop(self):
        """Stop the scheduler gracefully."""
        try:
            self.scheduler.shutdown()
            logger.info("Alert health scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping scheduler: {str(e)}")

    def _schedule_task(self, task: ScheduledTask):
        """Schedule a task based on its configuration."""
        try:
            if task.schedule_type == "interval":
                trigger = IntervalTrigger(**task.schedule_config)
            elif task.schedule_type == "cron":
                trigger = CronTrigger(**task.schedule_config)
            else:
                logger.error(f"Unknown schedule type: {task.schedule_type}")
                return

            # Get the appropriate task function
            task_func = self._get_task_function(task.task_id)

            # Schedule the job
            job = self.scheduler.add_job(
                func=task_func,
                trigger=trigger,
                id=task.task_id,
                name=task.name,
                replace_existing=True,
                coalesce=True,
                max_instances=1,
            )

            # Update next run time
            task.next_run = job.next_run_time

            logger.info(f"Scheduled task: {task.name}")

        except Exception as e:
            logger.error(f"Failed to schedule task {task.task_id}: {str(e)}")

    def _get_task_function(self, task_id: str) -> Callable:
        """Get the appropriate function for a task ID."""
        task_functions = {
            "daily_health_analysis": self._run_daily_health_analysis,
            "hourly_storm_detection": self._run_hourly_storm_detection,
            "weekly_threshold_optimization": self._run_weekly_threshold_optimization,
            "daily_noise_analysis": self._run_daily_noise_analysis,
        }

        return task_functions.get(task_id, self._run_generic_task)

    async def _run_daily_health_analysis(self):
        """Run daily health analysis for all alert rules."""
        task = self.tasks.get("daily_health_analysis")
        if not task:
            return

        logger.info("Starting daily health analysis")

        try:
            # Get all alert metrics with cache refresh
            result = await self.alert_health_service.get_alert_rule_metrics(refresh_cache=True)

            # Store results
            if result.get("success", False):
                task.last_result = {
                    "success": True,
                    "metrics_analyzed": len(result.get("data", {}).get("metrics", [])),
                    "summary": result.get("data", {}).get("summary", {}),
                }

                # Cache the results for dashboard
                if self.cache_service:
                    await self.cache_service.set(
                        "daily_health_analysis:latest", result, ttl=86400  # 24 hours
                    )
            else:
                task.last_result = {"success": False, "error": result.get("error", "Unknown error")}

            task.last_run = datetime.now()
            logger.info("Completed daily health analysis")

        except Exception as e:
            logger.error(f"Error in daily health analysis: {str(e)}")
            task.last_result = {"success": False, "error": str(e)}

    async def _run_hourly_storm_detection(self):
        """Run hourly storm detection."""
        task = self.tasks.get("hourly_storm_detection")
        if not task:
            return

        logger.info("Starting hourly storm detection")

        try:
            # Detect storms in the last 2 hours (overlap for safety)
            result = await self.alert_health_service.detect_alert_storms(days=0.083)  # 2 hours

            if result.get("success", False):
                storms_found = len(result.get("data", {}).get("storms", []))
                task.last_result = {
                    "success": True,
                    "storms_detected": storms_found,
                    "summary": result.get("data", {}).get("summary", {}),
                }

                # If storms detected, send notifications
                if storms_found > 0:
                    await self._notify_storm_detected(result.get("data", {}))

                # Cache results
                if self.cache_service:
                    await self.cache_service.set(
                        "storm_detection:latest", result, ttl=3600  # 1 hour
                    )
            else:
                task.last_result = {"success": False, "error": result.get("error", "Unknown error")}

            task.last_run = datetime.now()
            logger.info("Completed hourly storm detection")

        except Exception as e:
            logger.error(f"Error in storm detection: {str(e)}")
            task.last_result = {"success": False, "error": str(e)}

    async def _run_weekly_threshold_optimization(self):
        """Run weekly threshold optimization analysis."""
        task = self.tasks.get("weekly_threshold_optimization")
        if not task:
            return

        logger.info("Starting weekly threshold optimization")

        try:
            # Get all rules
            rules_result = await self.alert_health_service.get_alert_rule_metrics()

            if not rules_result.get("success", False):
                task.last_result = {"success": False, "error": "Failed to fetch rules"}
                return

            # Generate recommendations for each rule
            recommendations = []
            rules = rules_result.get("data", {}).get("metrics", [])

            for rule_metric in rules:
                rule_id = rule_metric.get("rule_id")
                if rule_id:
                    rec_result = await self.alert_health_service.get_threshold_recommendations(
                        rule_id=rule_id
                    )
                    if rec_result.get("success", False):
                        recommendations.append(rec_result.get("data", {}))

            task.last_result = {
                "success": True,
                "rules_analyzed": len(rules),
                "recommendations_generated": len(recommendations),
            }

            # Cache recommendations
            if self.cache_service and recommendations:
                await self.cache_service.set(
                    "threshold_recommendations:latest",
                    {"recommendations": recommendations},
                    ttl=604800,  # 7 days
                )

            task.last_run = datetime.now()
            logger.info("Completed weekly threshold optimization")

        except Exception as e:
            logger.error(f"Error in threshold optimization: {str(e)}")
            task.last_result = {"success": False, "error": str(e)}

    async def _run_daily_noise_analysis(self):
        """Run daily noise analysis."""
        task = self.tasks.get("daily_noise_analysis")
        if not task:
            return

        logger.info("Starting daily noise analysis")

        try:
            # Get metrics and analyze noise patterns
            result = await self.alert_health_service.get_alert_rule_metrics()

            if result.get("success", False):
                metrics = result.get("data", {}).get("metrics", [])

                # Analyze noise patterns
                noisy_rules = [m for m in metrics if m.get("is_noisy", False)]
                noise_analysis = {
                    "total_rules": len(metrics),
                    "noisy_rules": len(noisy_rules),
                    "noise_percentage": (len(noisy_rules) / len(metrics) * 100) if metrics else 0,
                    "top_noisy_rules": sorted(
                        noisy_rules, key=lambda x: x.get("trigger_frequency", 0), reverse=True
                    )[:10],
                }

                task.last_result = {"success": True, "analysis": noise_analysis}

                # Generate noise report
                if self.cache_service:
                    await self.cache_service.set(
                        "noise_analysis:latest", noise_analysis, ttl=86400  # 24 hours
                    )
            else:
                task.last_result = {"success": False, "error": result.get("error", "Unknown error")}

            task.last_run = datetime.now()
            logger.info("Completed daily noise analysis")

        except Exception as e:
            logger.error(f"Error in noise analysis: {str(e)}")
            task.last_result = {"success": False, "error": str(e)}

    async def _run_generic_task(self):
        """Generic task runner for custom tasks."""
        logger.info("Running generic task")

    async def _notify_storm_detected(self, storm_data: Dict[str, Any]):
        """Send notifications when storms are detected."""
        # In a real implementation, this would send notifications
        # via email, Slack, PagerDuty, etc.
        logger.warning(f"Storm detected: {storm_data.get('summary', {})}")

    # Admin API methods

    def get_task_status(self, task_id: Optional[str] = None) -> Dict[str, Any]:
        """Get status of scheduled tasks."""
        if task_id:
            task = self.tasks.get(task_id)
            if task:
                return {"success": True, "task": task.to_dict()}
            else:
                return {"success": False, "error": f"Task {task_id} not found"}
        else:
            # Return all tasks
            return {
                "success": True,
                "tasks": {task_id: task.to_dict() for task_id, task in self.tasks.items()},
            }

    def enable_task(self, task_id: str) -> Dict[str, Any]:
        """Enable a scheduled task."""
        task = self.tasks.get(task_id)
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}

        try:
            task.enabled = True
            self._schedule_task(task)

            return {"success": True, "message": f"Task {task_id} enabled"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def disable_task(self, task_id: str) -> Dict[str, Any]:
        """Disable a scheduled task."""
        task = self.tasks.get(task_id)
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}

        try:
            task.enabled = False

            # Remove from scheduler if running
            if self.scheduler.get_job(task_id):
                self.scheduler.remove_job(task_id)

            return {"success": True, "message": f"Task {task_id} disabled"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_task_schedule(self, task_id: str, schedule_config: Dict[str, Any]) -> Dict[str, Any]:
        """Update the schedule for a task."""
        task = self.tasks.get(task_id)
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}

        try:
            # Update schedule config
            task.schedule_config = schedule_config

            # Reschedule if enabled
            if task.enabled:
                self.scheduler.remove_job(task_id)
                self._schedule_task(task)

            return {"success": True, "message": f"Task {task_id} schedule updated"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def run_task_now(self, task_id: str) -> Dict[str, Any]:
        """Run a task immediately."""
        task = self.tasks.get(task_)
        if not task:
            return {"success": False, "error": f"Task {task_id} not found"}

        try:
            # Get task function and run it
            task_func = self._get_task_function(task_id)
            await task_func()

            return {
                "success": True,
                "message": f"Task {task_id} executed",
                "result": task.last_result,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
