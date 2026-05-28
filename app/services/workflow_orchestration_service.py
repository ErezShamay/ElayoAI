from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.automation_run import AutomationRun
from app.services.automation_rules_engine import AutomationRulesEngine


class WorkflowOrchestrationService:
    def __init__(self, automation_run_repository):
        self.automation_run_repository = automation_run_repository
        self.rules_engine = AutomationRulesEngine()

    def execute_workflow(self, workflow_type: str, payload: dict) -> dict:
        run_id = str(uuid4())
        started_at = datetime.now(timezone.utc)
        rule_evaluation = self.rules_engine.evaluate(workflow_type, payload)
        if not rule_evaluation["should_execute"]:
            run = AutomationRun(
                id=run_id,
                job_name=workflow_type,
                started_at=started_at,
                completed_at=datetime.now(timezone.utc),
                status="SKIPPED",
                processed_count=0,
                error_count=0,
                metadata={
                    "rule_evaluation": rule_evaluation,
                    "reason": "RULES_BLOCKED_EXECUTION",
                },
            )
            persisted = self.automation_run_repository.create_run(run)
            return {
                "run": persisted,
                "workflow_type": workflow_type,
                "status": "SKIPPED",
                "rule_evaluation": rule_evaluation,
            }

        processed_count = len(payload.get("items", []))
        run = AutomationRun(
            id=run_id,
            job_name=workflow_type,
            started_at=started_at,
            completed_at=datetime.now(timezone.utc),
            status="COMPLETED",
            processed_count=processed_count,
            error_count=0,
            metadata={
                "rule_evaluation": rule_evaluation,
            },
        )
        persisted = self.automation_run_repository.create_run(run)
        return {
            "run": persisted,
            "workflow_type": workflow_type,
            "status": "COMPLETED",
            "rule_evaluation": rule_evaluation,
        }
