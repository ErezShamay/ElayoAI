from apscheduler.schedulers.background import BackgroundScheduler

from app.services.automation_cron_management_service import (
    AutomationCronManagementService,
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
    scheduler.add_job(
        lambda: None,
        "interval",
        minutes=3,
        id="ai_recovery",
        replace_existing=True,
    )
    scheduler.start(paused=True)
    return scheduler


def test_cron_management_lists_registered_jobs():
    scheduler = _build_scheduler()
    service = AutomationCronManagementService(scheduler)

    jobs = service.list_job_schedules()

    assert len(jobs) == 3
    assert jobs[0]["job_id"] == "ai_automation"
    assert jobs[0]["registered"] is True
    assert jobs[0]["trigger_type"] == "interval"
    assert jobs[0]["schedule"]["seconds"] == 900

    scheduler.shutdown(wait=False)


def test_cron_management_updates_job_cron_and_disables_job():
    scheduler = _build_scheduler()
    service = AutomationCronManagementService(scheduler)

    updated = service.set_job_cron(
        job_id="ai_recovery",
        cron_expression="*/10 * * * *",
        enabled=False,
    )

    assert updated["job_id"] == "ai_recovery"
    assert updated["trigger_type"] == "cron"
    assert updated["schedule"] == "*/10 * * * *"
    assert updated["enabled"] is False
    assert updated["next_run_at"] is None

    scheduler.shutdown(wait=False)


def test_cron_management_rejects_invalid_cron_expression():
    scheduler = _build_scheduler()
    service = AutomationCronManagementService(scheduler)

    try:
        service.set_job_cron(
            job_id="sla_monitoring",
            cron_expression="not-a-valid-cron",
        )
    except ValueError as exc:
        assert "Wrong number of fields" in str(exc)
    else:
        raise AssertionError("Expected ValueError for invalid cron expression")

    scheduler.shutdown(wait=False)


def test_cron_management_rejects_unknown_job_id():
    scheduler = _build_scheduler()
    service = AutomationCronManagementService(scheduler)

    try:
        service.set_job_enabled(
            job_id="unknown_job",
            enabled=False,
        )
    except KeyError as exc:
        assert "Unknown automation job" in str(exc)
    else:
        raise AssertionError("Expected KeyError for unknown automation job")

    scheduler.shutdown(wait=False)
