from datetime import datetime
from datetime import timezone

from app.services.automation_governance_service import (
    AutomationGovernanceService,
)
from app.services.automation_job_queue_service import (
    AutomationJobQueueService,
)
from app.services.automation_retry_policy_service import (
    AutomationRetryPolicyService,
)
from app.services.automation_scheduler_guard_service import (
    AutomationSchedulerGuardService,
)
from app.services.automation_worker_service import (
    AutomationWorkerService,
)
from app.services.dynamic_automation_builder_service import (
    DynamicAutomationBuilderService,
)
from app.services.workflow_execution_log_service import (
    WorkflowExecutionLogService,
)
from app.services.workflow_versioning_service import (
    WorkflowVersioningService,
)


def test_job_queue_system_enqueues_and_dequeues_by_priority():
    queue = AutomationJobQueueService()
    queue.enqueue("job_low", {"k": 1}, priority=1)
    queue.enqueue("job_high", {"k": 2}, priority=10)

    item = queue.dequeue()

    assert item["job_name"] == "job_high"
    assert item["status"] == "PROCESSING"


def test_async_worker_architecture_processes_next_job():
    queue = AutomationJobQueueService()
    retry = AutomationRetryPolicyService()
    worker = AutomationWorkerService(queue, retry)
    worker.register_worker("w-1")

    queue.enqueue("demo", {"value": 123})
    result = worker.process_next(
        worker_id="w-1",
        handlers={"demo": lambda payload: {"ok": payload["value"] == 123}},
    )

    assert result["status"] == "COMPLETED"
    completed = queue.list_items(status="COMPLETED")
    assert len(completed) == 1


def test_retry_policies_requeue_on_failure_until_limit():
    queue = AutomationJobQueueService()
    retry = AutomationRetryPolicyService()
    retry.set_policy("unstable", max_attempts=2, backoff_seconds=1, multiplier=1)
    worker = AutomationWorkerService(queue, retry)
    worker.register_worker("w-1")

    queue.enqueue("unstable", {"x": 1})
    first = worker.process_next(
        worker_id="w-1",
        handlers={"unstable": lambda payload: (_ for _ in ()).throw(ValueError("boom"))},
    )

    assert first["status"] == "RETRYING"
    queued = queue.list_items(status="QUEUED")
    assert len(queued) == 1


def test_duplicate_automation_prevention_by_idempotency_key():
    queue = AutomationJobQueueService()
    first = queue.enqueue("job", {}, idempotency_key="unique-1")
    second = queue.enqueue("job", {}, idempotency_key="unique-1")

    assert first["id"] == second["id"]
    assert second["duplicate"] is True


def test_scheduler_race_condition_protection_claims_once_per_window():
    guard = AutomationSchedulerGuardService()
    scheduled_at = datetime.now(timezone.utc)
    first = guard.claim_tick("sla_monitoring", scheduled_at=scheduled_at)
    second = guard.claim_tick("sla_monitoring", scheduled_at=scheduled_at)

    assert first["acquired"] is True
    assert second["acquired"] is False


def test_automation_governance_requires_manual_approval_for_restricted_job():
    governance = AutomationGovernanceService()
    decision = governance.evaluate("DELETE_PROJECT", payload={"items": ["a"]})

    assert decision["approved"] is False
    assert decision["requires_manual_approval"] is True
    assert "JOB_RESTRICTED" in decision["reasons"]


def test_workflow_versioning_tracks_active_version():
    service = WorkflowVersioningService()
    first = service.create_version("wf_a", {"steps": [1]}, published_by="alice")
    second = service.create_version("wf_a", {"steps": [1, 2]}, published_by="alice")
    active = service.get_active_version("wf_a")

    assert first["version"] == 1
    assert second["version"] == 2
    assert active["version"] == 2


def test_workflow_execution_logs_store_ordered_entries():
    service = WorkflowExecutionLogService()
    entry1 = service.append_log("run-1", "info", "started")
    entry2 = service.append_log("run-1", "error", "failed")

    entries = service.list_logs("run-1")
    assert entry1["sequence"] == 1
    assert entry2["sequence"] == 2
    assert [item["message"] for item in entries] == ["started", "failed"]


def test_dynamic_automation_builder_creates_execution_order():
    service = DynamicAutomationBuilderService()
    workflow = service.build_workflow(
        workflow_name="wf_dynamic",
        created_by="alice",
        steps=[
            {"id": "collect", "depends_on": []},
            {"id": "analyze", "depends_on": ["collect"]},
            {"id": "notify", "depends_on": ["analyze"]},
        ],
    )

    assert workflow["status"] == "DRAFT"
    assert workflow["execution_order"][0] == "collect"
    assert workflow["execution_order"][-1] == "notify"
