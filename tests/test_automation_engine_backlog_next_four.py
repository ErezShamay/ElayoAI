from app.services.automation_dependency_graph_service import AutomationDependencyGraphService
from app.services.automation_monitoring_service import AutomationMonitoringService
from app.services.automation_rules_engine import AutomationRulesEngine
from app.services.workflow_orchestration_service import WorkflowOrchestrationService


class FakeAutomationRunRepository:
    def __init__(self):
        self.saved = []

    def create_run(self, run):
        payload = run.model_dump(mode="json")
        self.saved.append(payload)
        return payload


class FakeAIExecutionLogRepository:
    def __init__(self, failed, dead):
        self.failed = failed
        self.dead = dead

    def get_failed_executions(self):
        return self.failed

    def get_dead_letters(self):
        return self.dead


def test_workflow_orchestration_engine_executes_and_persists_run():
    repository = FakeAutomationRunRepository()
    service = WorkflowOrchestrationService(repository)
    result = service.execute_workflow(
        "CHECK_MISSING_REPORTS",
        {"missing_projects": ["p1"], "items": ["p1"]},
    )
    assert result["status"] == "COMPLETED"
    assert repository.saved[0]["job_name"] == "CHECK_MISSING_REPORTS"
    assert repository.saved[0]["status"] == "COMPLETED"


def test_automation_rules_engine_blocks_empty_reminders():
    engine = AutomationRulesEngine()
    evaluation = engine.evaluate("SEND_REMINDERS", {"reminders": []})
    assert evaluation["should_execute"] is False
    assert "SEND_REMINDER_MESSAGES" in evaluation["actions"]


def test_automation_retries_dashboard_aggregates_retry_distribution():
    service = AutomationMonitoringService.__new__(AutomationMonitoringService)
    service.ai_execution_log_repository = FakeAIExecutionLogRepository(
        failed=[
            {"id": "e1", "retry_count": 1},
            {"id": "e2", "retry_count": 2},
            {"id": "e3", "retry_count": 2},
        ],
        dead=[{"id": "d1"}],
    )
    dashboard = service.get_automation_retries_dashboard()
    assert dashboard["summary"]["queued_retries"] == 3
    assert dashboard["summary"]["dead_letters"] == 1
    assert dashboard["summary"]["retry_count_distribution"]["2"] == 2


def test_automation_dependency_graph_builds_execution_order():
    service = AutomationDependencyGraphService()
    graph = service.build_graph(
        [
            {"name": "enqueue_jobs", "depends_on": []},
            {"name": "run_workers", "depends_on": ["enqueue_jobs"]},
            {"name": "aggregate_metrics", "depends_on": ["run_workers"]},
        ]
    )
    assert graph["has_cycle"] is False
    assert graph["execution_order"][0] == "enqueue_jobs"
    assert "aggregate_metrics" in graph["execution_order"]
