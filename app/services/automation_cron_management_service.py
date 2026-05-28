from apscheduler.jobstores.base import JobLookupError
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.automation.scheduler import scheduler


class AutomationCronManagementService:
    def __init__(self, scheduler_instance=None):
        self.scheduler = scheduler_instance or scheduler
        self._managed_jobs = {
            "sla_monitoring": {
                "name": "SLA Monitoring",
                "description": "Monitors SLA breaches and escalations",
            },
            "ai_automation": {
                "name": "AI Automation",
                "description": "Runs AI analysis and action generation",
            },
            "ai_recovery": {
                "name": "AI Recovery",
                "description": "Retries failed AI executions",
            },
        }

    def list_job_schedules(self):
        jobs = []

        for job_id, metadata in self._managed_jobs.items():
            job = self.scheduler.get_job(job_id)
            jobs.append(self._serialize_job(job_id, metadata, job))

        return sorted(jobs, key=lambda item: item["job_id"])

    def set_job_cron(
        self,
        job_id: str,
        cron_expression: str,
        enabled: bool = True,
    ):
        self._ensure_managed_job(job_id)
        self._ensure_registered_job(job_id)

        trigger = CronTrigger.from_crontab(cron_expression)
        self.scheduler.reschedule_job(job_id, trigger=trigger)
        self._set_job_enabled(job_id, enabled)

        return self._serialize_job(
            job_id,
            self._managed_jobs[job_id],
            self.scheduler.get_job(job_id),
        )

    def set_job_enabled(
        self,
        job_id: str,
        enabled: bool,
    ):
        self._ensure_managed_job(job_id)
        self._ensure_registered_job(job_id)
        self._set_job_enabled(job_id, enabled)

        return self._serialize_job(
            job_id,
            self._managed_jobs[job_id],
            self.scheduler.get_job(job_id),
        )

    def _set_job_enabled(
        self,
        job_id: str,
        enabled: bool,
    ):
        if enabled:
            try:
                self.scheduler.resume_job(job_id)
            except JobLookupError as exc:
                raise LookupError(f"Automation job '{job_id}' is not registered") from exc
        else:
            try:
                self.scheduler.pause_job(job_id)
            except JobLookupError as exc:
                raise LookupError(f"Automation job '{job_id}' is not registered") from exc

    def _ensure_managed_job(
        self,
        job_id: str,
    ):
        if job_id not in self._managed_jobs:
            raise KeyError(f"Unknown automation job '{job_id}'")

    def _ensure_registered_job(
        self,
        job_id: str,
    ):
        if not self.scheduler.get_job(job_id):
            raise LookupError(f"Automation job '{job_id}' is not registered")

    def _serialize_job(
        self,
        job_id: str,
        metadata: dict,
        job,
    ):
        if not job:
            return {
                "job_id": job_id,
                "name": metadata["name"],
                "description": metadata["description"],
                "registered": False,
                "enabled": False,
                "trigger_type": None,
                "schedule": None,
                "next_run_at": None,
            }

        trigger_type = None
        schedule = None

        if isinstance(job.trigger, CronTrigger):
            trigger_type = "cron"
            schedule = self._cron_trigger_to_expression(job.trigger)
        elif isinstance(job.trigger, IntervalTrigger):
            trigger_type = "interval"
            interval_seconds = int(job.trigger.interval.total_seconds())
            schedule = {"seconds": interval_seconds}

        next_run_at = (
            job.next_run_time.isoformat()
            if job.next_run_time
            else None
        )

        return {
            "job_id": job_id,
            "name": metadata["name"],
            "description": metadata["description"],
            "registered": True,
            "enabled": bool(job.next_run_time),
            "trigger_type": trigger_type,
            "schedule": schedule,
            "next_run_at": next_run_at,
        }

    def _cron_trigger_to_expression(
        self,
        trigger: CronTrigger,
    ):
        fields = trigger.fields
        # APScheduler stores fields ordered as:
        # year, month, day, week, day_of_week, hour, minute, second.
        minute = str(fields[6])
        hour = str(fields[5])
        day = str(fields[2])
        month = str(fields[1])
        day_of_week = str(fields[4])
        return f"{minute} {hour} {day} {month} {day_of_week}"
