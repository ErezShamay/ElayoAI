from collections.abc import Callable

from app.automation.jobs import (
    run_ai_automation,
    run_ai_recovery,
    run_sla_monitoring,
)
from app.repositories.automation_run_repository import (
    AutomationRunRepository,
)


class AutomationReplayService:
    def __init__(
        self,
        automation_run_repository: AutomationRunRepository | None = None,
        handlers: dict[str, Callable[[], None]] | None = None,
    ):
        self.automation_run_repository = (
            automation_run_repository
            or AutomationRunRepository()
        )
        self.handlers = handlers or {
            "sla_monitoring": run_sla_monitoring,
            "ai_automation": run_ai_automation,
            "ai_recovery": run_ai_recovery,
        }

    def replay_run(
        self,
        run_id: str,
    ):
        source_run = (
            self.automation_run_repository
            .get_run_by_id(run_id)
        )

        if not source_run:
            raise LookupError(
                f"Automation run '{run_id}' not found"
            )

        job_name = source_run.get("job_name")

        handler = (
            self.handlers.get(job_name)
            if job_name
            else None
        )

        if not handler:
            raise ValueError(
                f"No replay handler configured for job '{job_name}'"
            )

        previous_latest = (
            self.automation_run_repository
            .get_latest_run(job_name)
        )
        previous_latest_id = (
            previous_latest.get("id")
            if previous_latest
            else None
        )

        handler()

        replay_run = (
            self.automation_run_repository
            .get_latest_run(job_name)
        )
        replay_run_id = (
            replay_run.get("id")
            if replay_run
            else None
        )

        return {
            "status": "REPLAYED",
            "source_run_id": run_id,
            "job_name": job_name,
            "replayed": bool(replay_run_id and replay_run_id != previous_latest_id),
            "replay_run_id": replay_run_id,
        }
