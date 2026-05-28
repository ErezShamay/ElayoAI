from datetime import datetime
from datetime import timezone

from app.services.automation_dependency_graph_service import (
    AutomationDependencyGraphService,
)


class DynamicAutomationBuilderService:
    def __init__(self):
        self._dependency_graph = AutomationDependencyGraphService()
        self._workflows: dict[str, dict] = {}

    def build_workflow(
        self,
        workflow_name: str,
        steps: list[dict],
        created_by: str,
    ):
        self._validate_steps(steps)
        graph = self._dependency_graph.build_graph(
            [
                {
                    "name": step["id"],
                    "depends_on": step.get("depends_on", []),
                }
                for step in steps
            ]
        )
        if graph["has_cycle"]:
            raise ValueError("Workflow steps contain dependency cycle")

        workflow = {
            "workflow_name": workflow_name,
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "steps": steps,
            "execution_order": graph["execution_order"],
            "version": 1,
            "status": "DRAFT",
        }
        self._workflows[workflow_name] = workflow
        return workflow

    def get_workflow(
        self,
        workflow_name: str,
    ):
        return self._workflows.get(workflow_name)

    def _validate_steps(
        self,
        steps: list[dict],
    ):
        if not steps:
            raise ValueError("Workflow must include at least one step")

        ids = [step.get("id") for step in steps]
        if any(step_id is None or step_id == "" for step_id in ids):
            raise ValueError("Each step must include a non-empty id")
        if len(ids) != len(set(ids)):
            raise ValueError("Step ids must be unique")

        known = set(ids)
        for step in steps:
            for dependency in step.get("depends_on", []):
                if dependency not in known:
                    raise ValueError(
                        f"Unknown dependency '{dependency}' for step '{step['id']}'"
                    )
