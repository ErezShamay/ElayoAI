"""Finalize pipeline notifications + automation steps (N01–N09)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from app.config.settings import settings
from app.repositories.quality_issue_repository import (
    OPEN_ISSUE_STATUSES,
    QualityIssueRepository,
)
from app.services.alert_dedup_store import CriticalAlertDedupStore
from app.services.automation_job_queue_service import (
    AutomationJobQueueService,
)
from app.services.automation_rules_engine import AutomationRulesEngine
from app.services.predictive_risk_service import PredictiveRiskService
from app.services.qc_notification_service import QcNotificationService
from app.services.workspace_activity_service import WorkspaceActivityService

NOTIFICATIONS_FINALIZE_STEP_ORDER: tuple[str, ...] = (
    "N01",
    "N02",
    "N03",
    "N04",
    "N05",
    "N06",
    "N07",
    "N08",
    "N09",
)

EXPECTED_NOTIFICATIONS_FINALIZE_STEPS: frozenset[str] = frozenset(
    NOTIFICATIONS_FINALIZE_STEP_ORDER
)


@dataclass(frozen=True)
class FinalizeNotificationsDispatchResult:
    steps_completed: list[str]
    step_summaries: dict[str, dict[str, Any]]


class FieldReportFinalizeNotificationsService:
    def __init__(
        self,
        *,
        qc_notification_service: QcNotificationService | None = None,
        rules_engine: AutomationRulesEngine | None = None,
        job_queue_service: AutomationJobQueueService | None = None,
        predictive_risk_service: PredictiveRiskService | None = None,
        issue_repository: QualityIssueRepository | None = None,
        critical_dedup_store: CriticalAlertDedupStore | None = None,
        workspace_activity_service: WorkspaceActivityService | None = None,
    ) -> None:
        self.qc_notification_service = (
            qc_notification_service or QcNotificationService()
        )
        self.rules_engine = rules_engine or AutomationRulesEngine()
        self.job_queue_service = (
            job_queue_service or AutomationJobQueueService()
        )
        self.predictive_risk_service = (
            predictive_risk_service or PredictiveRiskService()
        )
        self.issue_repository = issue_repository or QualityIssueRepository()
        self.critical_dedup_store = (
            critical_dedup_store or CriticalAlertDedupStore()
        )
        self.workspace_activity_service = (
            workspace_activity_service or WorkspaceActivityService()
        )

    def dispatch_after_email(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        actor_id: str,
        finalize_run_id: str,
        materialization: dict[str, Any] | None = None,
        send_email: bool = True,
    ) -> FinalizeNotificationsDispatchResult:
        """Run N01–N09 after email dispatch — async side-effects, non-blocking."""
        flags = settings.FEATURE_FLAGS
        created_issue_ids = list(
            (materialization or {}).get("created_issue_ids") or []
        )
        summaries: dict[str, dict[str, Any]] = {}
        completed: list[str] = []

        for step_id in NOTIFICATIONS_FINALIZE_STEP_ORDER:
            try:
                summary = self._run_step(
                    step_id=step_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    report_id=report_id,
                    actor_id=actor_id,
                    finalize_run_id=finalize_run_id,
                    created_issue_ids=created_issue_ids,
                    notifications_enabled=flags.enable_notifications,
                    automation_enabled=flags.enable_automation,
                    send_email=send_email,
                )
            except Exception as error:
                summary = {
                    "status": "FAILED",
                    "error": str(error),
                    "error_type": type(error).__name__,
                }
            summaries[step_id] = summary
            completed.append(step_id)

        return FinalizeNotificationsDispatchResult(
            steps_completed=completed,
            step_summaries=summaries,
        )

    def _run_step(
        self,
        *,
        step_id: str,
        organization_id: str,
        project_id: str,
        report_id: str,
        actor_id: str,
        finalize_run_id: str,
        created_issue_ids: list[str],
        notifications_enabled: bool,
        automation_enabled: bool,
        send_email: bool,
    ) -> dict[str, Any]:
        if step_id == "N01":
            return self._step_n01_qc_evaluate(
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
                created_issue_ids=created_issue_ids,
                enabled=notifications_enabled,
                send_email=send_email,
            )
        if step_id == "N02":
            return self._step_n02_critical_alerts(
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
                created_issue_ids=created_issue_ids,
                enabled=notifications_enabled,
                send_email=send_email,
            )
        if step_id == "N03":
            return self._step_n03_open_report_resolve(
                report_id=report_id,
                enabled=notifications_enabled,
            )
        if step_id == "N04":
            return self._step_n04_notification_payloads(
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
                created_issue_ids=created_issue_ids,
                enabled=notifications_enabled,
            )
        if step_id == "N05":
            return self._step_n05_automation_rules(
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
                actor_id=actor_id,
                finalize_run_id=finalize_run_id,
                enabled=automation_enabled,
            )
        if step_id == "N06":
            return self._step_n06_automation_enqueue(
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
                actor_id=actor_id,
                finalize_run_id=finalize_run_id,
                enabled=automation_enabled,
            )
        if step_id == "N07":
            return self._step_n07_automation_activity(
                project_id=project_id,
                report_id=report_id,
                enabled=automation_enabled,
            )
        if step_id == "N08":
            return self._step_n08_risk_evaluate(
                organization_id=organization_id,
                project_id=project_id,
                enabled=notifications_enabled,
            )
        if step_id == "N09":
            return self._step_n09_alert_dedup(
                created_issue_ids=created_issue_ids,
                enabled=notifications_enabled,
            )
        raise ValueError(f"Unknown finalize notification step: {step_id}")

    def _step_n01_qc_evaluate(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        created_issue_ids: list[str],
        enabled: bool,
        send_email: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_NOTIFICATIONS_OFF"}
        result = self.qc_notification_service.run_for_report(
            organization_id=organization_id,
            report_id=report_id,
            project_id=project_id,
            created_issue_ids=created_issue_ids,
            send_email=send_email,
        )
        return {
            "status": "COMPLETED",
            "alerts_evaluated": result.alerts_evaluated,
            "open_report_resolved": result.open_report_resolved,
            "critical_new_issue_count": result.critical_new_issue_count,
        }

    def _step_n02_critical_alerts(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        created_issue_ids: list[str],
        enabled: bool,
        send_email: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_NOTIFICATIONS_OFF"}
        result = (
            self.qc_notification_service.critical_alert_service
            .run_for_new_critical_issues(
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
                issue_ids=created_issue_ids,
                send_email=send_email,
            )
        )
        return {
            "status": "COMPLETED",
            "critical_alerts_sent": sum(
                1
                for delivery in result.deliveries
                if delivery.status == "SENT"
            ),
            "critical_issue_count": result.critical_issue_count,
            "digest_count": result.digest_count,
            "skipped_issue_ids": result.skipped_issue_ids,
        }

    def _step_n03_open_report_resolve(
        self,
        *,
        report_id: str,
        enabled: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_NOTIFICATIONS_OFF"}
        result = self.qc_notification_service.open_report_service.resolve_for_report(
            report_id=report_id,
        )
        return {
            "status": "COMPLETED",
            "resolved": result.get("resolved"),
            "report_id": report_id,
        }

    def _step_n04_notification_payloads(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        created_issue_ids: list[str],
        enabled: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_NOTIFICATIONS_OFF"}
        tool = self.qc_notification_service.notification_tool
        critical_issues = self._load_critical_issues(created_issue_ids)
        project = (
            self.qc_notification_service.critical_alert_service
            .project_repository.get_project_by_id(project_id)
            or {}
        )
        from app.services.quality_issue_critical_alert_service import (
            build_supervisor_digests,
        )

        digests = build_supervisor_digests(
            critical_issues,
            projects_by_id={project_id: project},
            now=datetime.now(UTC),
        )
        payloads = tool.build_new_critical_issue_messages(
            digests,
            report_id=report_id,
        )
        return {
            "status": "COMPLETED",
            "payload_count": len(payloads),
            "payload_subjects": [
                payload.get("subject") for payload in payloads
            ],
            "organization_id": organization_id,
        }

    def _step_n05_automation_rules(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        actor_id: str,
        finalize_run_id: str,
        enabled: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_AUTOMATION_OFF"}
        payload = {
            "organization_id": organization_id,
            "project_id": project_id,
            "report_id": report_id,
            "actor_id": actor_id,
            "finalize_run_id": finalize_run_id,
        }
        evaluation = self.rules_engine.evaluate(
            "FIELD_REPORT_FINALIZED",
            payload,
        )
        return {
            "status": "COMPLETED",
            "automation_triggered": evaluation.get("should_execute"),
            "workflow_type": evaluation.get("workflow_type"),
            "actions": evaluation.get("actions"),
            "flags": evaluation.get("flags"),
        }

    def _step_n06_automation_enqueue(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        actor_id: str,
        finalize_run_id: str,
        enabled: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_AUTOMATION_OFF"}
        payload = {
            "organization_id": organization_id,
            "project_id": project_id,
            "report_id": report_id,
            "actor_id": actor_id,
            "finalize_run_id": finalize_run_id,
        }
        job = self.job_queue_service.enqueue(
            "FIELD_REPORT_FINALIZED",
            payload,
            priority=6,
            idempotency_key=f"finalize:{report_id}",
        )
        return {
            "status": "COMPLETED",
            "job_id": job.get("id"),
            "duplicate": bool(job.get("duplicate")),
            "job_status": job.get("status"),
        }

    def _step_n07_automation_activity(
        self,
        *,
        project_id: str,
        report_id: str,
        enabled: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_AUTOMATION_OFF"}
        activity = self.workspace_activity_service.create_activity(
            project_id,
            activity_type="AUTOMATION_FIELD_REPORT_FINALIZED",
            title="אוטומציה: דוח ביקור הושלם",
            description=(
                f"מנוע האוטומציה זיהה Finalize לדוח {report_id}"
            ),
            metadata={"report_id": report_id},
        )
        return {
            "status": "COMPLETED",
            "activity_type": "AUTOMATION_FIELD_REPORT_FINALIZED",
            "activity_id": activity.get("id"),
            "project_id": project_id,
            "report_id": report_id,
        }

    def _step_n08_risk_evaluate(
        self,
        *,
        organization_id: str,
        project_id: str,
        enabled: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_NOTIFICATIONS_OFF"}
        issues = self.issue_repository.list_by_project(
            organization_id=organization_id,
            project_id=project_id,
        )
        open_issues = [
            issue
            for issue in issues
            if issue.get("status") in OPEN_ISSUE_STATUSES
        ]
        critical_count = sum(
            1
            for issue in open_issues
            if str(issue.get("severity") or "").upper() == "CRITICAL"
        )
        workspace = {
            "health": {"score": max(20, 100 - critical_count * 15)},
            "summary": {
                "escalations_count": critical_count,
                "actions_count": len(open_issues),
            },
        }
        risk = self.predictive_risk_service.predict_project_risk(workspace)
        return {
            "status": "COMPLETED",
            "prediction": risk.get("prediction"),
            "risk_score": risk.get("risk_score"),
            "open_issue_count": len(open_issues),
            "open_critical_count": critical_count,
        }

    def _step_n09_alert_dedup(
        self,
        *,
        created_issue_ids: list[str],
        enabled: bool,
    ) -> dict[str, Any]:
        if not enabled:
            return {"status": "SKIPPED", "reason": "FEATURE_NOTIFICATIONS_OFF"}
        deduped_ids: list[str] = []
        for issue_id in created_issue_ids:
            if not issue_id:
                continue
            if not self.critical_dedup_store.should_notify_once(issue_id):
                deduped_ids.append(issue_id)
        return {
            "status": "COMPLETED",
            "dedup_checked_count": len(created_issue_ids),
            "already_notified_issue_ids": deduped_ids,
        }

    def _load_critical_issues(
        self,
        issue_ids: list[str],
    ) -> list[dict[str, Any]]:
        issues: list[dict[str, Any]] = []
        for issue_id in issue_ids:
            issue = self.issue_repository.get_by_id(issue_id)
            if issue is None:
                continue
            if str(issue.get("severity") or "").upper() != "CRITICAL":
                continue
            if issue.get("status") not in OPEN_ISSUE_STATUSES:
                continue
            issues.append(issue)
        return issues
