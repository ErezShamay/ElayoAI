from apscheduler.schedulers.background import BackgroundScheduler

from app.services.automation_control_service import (
    AutomationControlService,
)


def _build_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        lambda: None,
        "interval",
        minutes=5,
        id="sla_monitoring",
        replace_existing=True,
    )
    scheduler.add_job(
        lambda: None,
        "interval",
        minutes=15,
        id="ai_automation",
        replace_existing=True,
    )
    scheduler.start()
    return scheduler


def test_pause_returns_scheduler_with_paused_jobs():
    scheduler = _build_scheduler()
    service = AutomationControlService(scheduler)

    payload = service.pause()

    assert payload["status"] == "paused"
    assert payload["scheduler_running"] is True
    assert payload["is_paused"] is True
    assert payload["paused_jobs"] == [
        "ai_automation",
        "sla_monitoring",
    ]

    scheduler.shutdown(wait=False)


def test_resume_reactivates_jobs_after_pause():
    scheduler = _build_scheduler()
    service = AutomationControlService(scheduler)
    service.pause()

    payload = service.resume()

    assert payload["status"] == "running"
    assert payload["scheduler_running"] is True
    assert payload["is_paused"] is False
    assert payload["active_jobs"] == [
        "ai_automation",
        "sla_monitoring",
    ]

    scheduler.shutdown(wait=False)


def test_status_handles_scheduler_without_jobs():
    scheduler = BackgroundScheduler()
    scheduler.start()
    service = AutomationControlService(scheduler)

    payload = service.get_status()

    assert payload["total_jobs"] == 0
    assert payload["active_jobs"] == []
    assert payload["paused_jobs"] == []
    assert payload["is_paused"] is False

    scheduler.shutdown(wait=False)
