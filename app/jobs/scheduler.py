from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import (
    BackgroundScheduler
)

from app.jobs.qc_notification_jobs import (
    run_qc_notification_cycle,
)

ISRAEL_TZ = ZoneInfo("Asia/Jerusalem")

scheduler = (
    BackgroundScheduler()
)


def register_qc_notification_jobs() -> None:
    scheduler.add_job(
        run_qc_notification_cycle,
        "cron",
        hour=8,
        minute=0,
        timezone=ISRAEL_TZ,
        id="qc_notification_cycle",
        replace_existing=True,
        max_instances=1,
    )
