"""Finalize pipeline infrastructure steps (T01–T06)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable

from app.services.field_report_finalize_registry import (
    INFRASTRUCTURE_POST_STEP_ORDER,
    INFRASTRUCTURE_PRE_STEP_ORDER,
)

WorkspaceActivityBroadcaster = Callable[[str, dict[str, Any]], None]


@dataclass(frozen=True)
class FinalizeInfrastructureResult:
    steps_completed: list[str]
    step_summaries: dict[str, dict[str, Any]]


class FieldReportFinalizeInfrastructureService:
    def __init__(
        self,
        *,
        workspace_broadcaster: WorkspaceActivityBroadcaster | None = None,
    ) -> None:
        self.workspace_broadcaster = workspace_broadcaster

    def record_pre_pipeline(
        self,
        *,
        actor_id: str,
        organization_id: str,
        idempotency_key: str,
        permission: str = "field_reports:finalize",
    ) -> FinalizeInfrastructureResult:
        now = datetime.now(UTC).isoformat()
        summaries = {
            "T01": {
                "permission": permission,
                "role_scope": "SUPERVISOR",
                "status": "VERIFIED",
            },
            "T02": {
                "idempotency_key": idempotency_key,
                "status": "RESOLVED",
            },
            "T03": {
                "actor_id": actor_id,
                "organization_id": organization_id,
                "recorded_at": now,
                "status": "AUDITED",
            },
        }
        return FinalizeInfrastructureResult(
            steps_completed=list(INFRASTRUCTURE_PRE_STEP_ORDER),
            step_summaries=summaries,
        )

    def record_post_pipeline_success(
        self,
        *,
        project_id: str,
        report_id: str,
        run_id: str,
        workspace_activity_id: str | None = None,
    ) -> FinalizeInfrastructureResult:
        activity_payload = (
            {
                "id": workspace_activity_id,
                "project_id": project_id,
                "activity_type": "FIELD_REPORT_FINALIZED",
                "metadata": {
                    "report_id": report_id,
                    "finalize_run_id": run_id,
                },
            }
            if workspace_activity_id
            else None
        )
        websocket_summary = self._step_t06_websocket(
            project_id=project_id,
            activity=activity_payload,
        )
        summaries = {
            "T04": {
                "status": "NO_ERROR",
                "pipeline_outcome": "SUCCESS",
            },
            "T05": {
                "status": "CONSISTENT",
                "report_id": report_id,
                "finalize_run_id": run_id,
            },
            "T06": websocket_summary,
        }
        return FinalizeInfrastructureResult(
            steps_completed=list(INFRASTRUCTURE_POST_STEP_ORDER),
            step_summaries=summaries,
        )

    def record_post_pipeline_failure(
        self,
        *,
        project_id: str,
        report_id: str,
        run_id: str,
        error: Exception,
    ) -> FinalizeInfrastructureResult:
        summaries = {
            "T04": {
                "status": "HANDLED",
                "pipeline_outcome": "FAILED",
                "error": str(error),
                "error_type": type(error).__name__,
            },
            "T05": {
                "status": "COMPENSATED",
                "report_status": "FINALIZE_FAILED",
                "report_id": report_id,
                "finalize_run_id": run_id,
            },
            "T06": {
                "status": "SKIPPED",
                "reason": "pipeline_failed",
                "project_id": project_id,
            },
        }
        return FinalizeInfrastructureResult(
            steps_completed=list(INFRASTRUCTURE_POST_STEP_ORDER),
            step_summaries=summaries,
        )

    def _step_t06_websocket(
        self,
        *,
        project_id: str,
        activity: dict[str, Any] | None,
    ) -> dict[str, Any]:
        if activity is None:
            return {
                "status": "SKIPPED",
                "reason": "no_workspace_activity",
                "channel": "/projects/{project_id}/workspace/stream",
            }

        if self.workspace_broadcaster is not None:
            self.workspace_broadcaster(project_id, activity)
            return {
                "status": "BROADCAST",
                "channel": "/projects/{project_id}/workspace/stream",
                "activity_id": activity.get("id"),
            }

        return {
            "status": "DEFERRED",
            "channel": "/projects/{project_id}/workspace/stream",
            "activity_id": activity.get("id"),
        }
