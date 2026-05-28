from app.services.automation_replay_service import (
    AutomationReplayService,
)


class FakeAutomationRunRepository:
    def __init__(
        self,
        run_by_id: dict | None = None,
        latest_runs: list[dict] | None = None,
    ):
        self.run_by_id = run_by_id
        self.latest_runs = latest_runs or []
        self.latest_calls = 0

    def get_run_by_id(
        self,
        run_id: str,
    ):
        if self.run_by_id and self.run_by_id.get("id") == run_id:
            return self.run_by_id
        return None

    def get_latest_run(
        self,
        job_name: str,
    ):
        self.latest_calls += 1
        if self.latest_calls <= len(self.latest_runs):
            return self.latest_runs[self.latest_calls - 1]
        if self.latest_runs:
            return self.latest_runs[-1]
        return None


def test_replay_run_replays_known_job_handler():
    calls = []
    repository = FakeAutomationRunRepository(
        run_by_id={
            "id": "run-1",
            "job_name": "sla_monitoring",
        },
        latest_runs=[
            {"id": "run-1", "job_name": "sla_monitoring"},
            {"id": "run-2", "job_name": "sla_monitoring"},
        ],
    )
    service = AutomationReplayService(
        automation_run_repository=repository,
        handlers={
            "sla_monitoring": lambda: calls.append("replayed"),
        },
    )

    payload = service.replay_run("run-1")

    assert calls == ["replayed"]
    assert payload["status"] == "REPLAYED"
    assert payload["source_run_id"] == "run-1"
    assert payload["replayed"] is True
    assert payload["replay_run_id"] == "run-2"


def test_replay_run_returns_not_found_for_unknown_run():
    service = AutomationReplayService(
        automation_run_repository=FakeAutomationRunRepository(
            run_by_id=None,
        ),
        handlers={
            "sla_monitoring": lambda: None,
        },
    )

    try:
        service.replay_run("missing-run")
    except LookupError as exc:
        assert "not found" in str(exc)
    else:
        raise AssertionError("Expected LookupError for unknown run")


def test_replay_run_returns_validation_error_for_unknown_handler():
    repository = FakeAutomationRunRepository(
        run_by_id={
            "id": "run-1",
            "job_name": "job_without_handler",
        },
    )
    service = AutomationReplayService(
        automation_run_repository=repository,
        handlers={},
    )

    try:
        service.replay_run("run-1")
    except ValueError as exc:
        assert "No replay handler configured" in str(exc)
    else:
        raise AssertionError("Expected ValueError for unknown handler")
