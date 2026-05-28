from app.automation.scheduler import scheduler
from apscheduler.schedulers.base import (
    STATE_PAUSED,
)


class AutomationControlService:
    def __init__(self, scheduler_instance=None):
        self.scheduler = scheduler_instance or scheduler

    def get_status(self):
        jobs = self.scheduler.get_jobs()
        paused_jobs = [
            job.id
            for job in jobs
            if job.next_run_time is None
        ]
        active_jobs = [
            job.id
            for job in jobs
            if job.next_run_time is not None
        ]

        if self.scheduler.state == STATE_PAUSED:
            paused_jobs = [job.id for job in jobs]
            active_jobs = []

        return {
            "scheduler_running": bool(self.scheduler.running),
            "total_jobs": len(jobs),
            "active_jobs": sorted(active_jobs),
            "paused_jobs": sorted(paused_jobs),
            "is_paused": self.scheduler.state == STATE_PAUSED,
        }

    def pause(self):
        if self.scheduler.running:
            self.scheduler.pause()

        payload = self.get_status()
        payload["status"] = "paused"
        return payload

    def resume(self):
        if self.scheduler.running:
            self.scheduler.resume()

        payload = self.get_status()
        payload["status"] = "running" if payload["scheduler_running"] else "stopped"
        return payload
