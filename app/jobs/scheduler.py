from apscheduler.schedulers.background import (
    BackgroundScheduler
)

from app.services.action_escalation_service import (
    ActionEscalationService
)


scheduler = (
    BackgroundScheduler()
)


def run_escalations_job():

    print(
        "\nRUNNING AUTO ESCALATIONS\n"
    )

    result = (
        ActionEscalationService()
        .escalate_overdue_actions()
    )

    print(result)


def start_scheduler():

    scheduler.add_job(

        run_escalations_job,

        trigger="interval",

        minutes=30,
    )

    scheduler.start()

    print(
        "\nSCHEDULER STARTED\n"
    )