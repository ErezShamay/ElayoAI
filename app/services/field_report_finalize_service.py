from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.exceptions.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.repositories.field_report_finalize_run_repository import (
    FieldReportFinalizeRunRepository,
)
from app.repositories.field_visit_report_repository import (
    FieldVisitReportRepository,
)
from app.schemas.field_report_finalize import (
    FieldReportFinalizeRunStatus,
    FieldReportFinalizeStartResponse,
    FieldReportFinalizeStatusResponse,
    FinalizeRunStatus,
)
from app.services.field_report_finalize_email_service import (
    EMAIL_FINALIZE_STEP_ORDER,
    FieldReportFinalizeEmailService,
)
from app.services.field_report_finalize_ai_service import (
    FieldReportFinalizeAiService,
)
from app.services.field_report_finalize_infrastructure_service import (
    FieldReportFinalizeInfrastructureService,
)
from app.services.field_report_finalize_notifications_service import (
    NOTIFICATIONS_FINALIZE_STEP_ORDER,
    FieldReportFinalizeNotificationsService,
)
from app.services.field_report_finalize_steps import (
    CORE_FINALIZE_STEP_ORDER,
    FieldReportFinalizeSteps,
    FinalizePipelineContext,
)
from app.services.field_visit_report_service import FieldVisitReportService
from app.services.notification_service import NotificationService
from app.services.resident_portal_service import ResidentPortalService
from app.services.workspace_activity_service import WorkspaceActivityService

FINALIZE_TRIGGER_STATUSES = frozenset({"CLOSED", "FINALIZE_FAILED"})
IDEMPOTENT_REPORT_STATUSES = frozenset(
    {"FINALIZING", "FINALIZED"}
)


class FieldReportFinalizeService:
    def __init__(
        self,
        *,
        run_repository: FieldReportFinalizeRunRepository | None = None,
        report_repository: FieldVisitReportRepository | None = None,
        visit_report_service: FieldVisitReportService | None = None,
        steps: FieldReportFinalizeSteps | None = None,
        notification_service: NotificationService | None = None,
        workspace_activity_service: WorkspaceActivityService | None = None,
        resident_portal_service: ResidentPortalService | None = None,
        email_service: FieldReportFinalizeEmailService | None = None,
        notifications_service: (
            FieldReportFinalizeNotificationsService | None
        ) = None,
        ai_service: FieldReportFinalizeAiService | None = None,
        infrastructure_service: (
            FieldReportFinalizeInfrastructureService | None
        ) = None,
    ) -> None:
        self.run_repository = (
            run_repository or FieldReportFinalizeRunRepository()
        )
        self.report_repository = (
            report_repository or FieldVisitReportRepository()
        )
        self.visit_report_service = (
            visit_report_service or FieldVisitReportService()
        )
        if report_repository is not None:
            self.visit_report_service.report_repository = report_repository
        self.notification_service = notification_service
        self.workspace_activity_service = workspace_activity_service
        self.resident_portal_service = resident_portal_service
        self.steps = steps or FieldReportFinalizeSteps(
            visit_report_service=self.visit_report_service,
            notification_service=notification_service,
            workspace_activity_service=workspace_activity_service,
            resident_portal_service=resident_portal_service,
        )
        self.email_service = (
            email_service
            or FieldReportFinalizeEmailService(
                pdf_service=self.visit_report_service.pdf_service,
            )
        )
        self.notifications_service = (
            notifications_service or FieldReportFinalizeNotificationsService()
        )
        self.ai_service = ai_service or FieldReportFinalizeAiService(
            run_repository=self.run_repository,
        )
        self.infrastructure_service = (
            infrastructure_service or FieldReportFinalizeInfrastructureService()
        )

    def start_finalize(
        self,
        *,
        organization_id: str,
        report_id: str,
        actor_id: str,
        source_content: bytes,
        source_filename: str | None = None,
        idempotency_key: str | None = None,
        client_report_uuid: str | None = None,
    ) -> FieldReportFinalizeStartResponse:
        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        resolved_key = self._resolve_idempotency_key(
            report_id,
            idempotency_key,
        )

        existing = self._find_existing_run(
            organization_id=organization_id,
            report_id=report_id,
            idempotency_key=resolved_key,
        )
        if existing is not None:
            if self._should_execute_pipeline(existing):
                existing = self._execute_core_pipeline(
                    run=existing,
                    organization_id=organization_id,
                    report_id=report_id,
                    actor_id=actor_id,
                    source_content=source_content,
                    source_filename=source_filename
                    or f"{report_id}.pdf",
                )
            return self._build_start_response(report_id, existing)

        status = str(record.get("status") or "")
        if status in IDEMPOTENT_REPORT_STATUSES:
            latest = self.run_repository.get_latest_by_report_id(report_id)
            if latest is not None:
                if self._should_execute_pipeline(latest):
                    latest = self._execute_core_pipeline(
                        run=latest,
                        organization_id=organization_id,
                        report_id=report_id,
                        actor_id=actor_id,
                        source_content=source_content,
                        source_filename=source_filename
                        or f"{report_id}.pdf",
                    )
                return self._build_start_response(report_id, latest)

        if status not in FINALIZE_TRIGGER_STATUSES:
            raise ConflictError(
                message="ניתן להפעיל Finalize רק על דוח סגור",
                details={"status": status},
            )

        if not source_content:
            raise ValidationError(
                message="קובץ PDF נדרש להפעלת Finalize",
            )

        now = datetime.now(UTC).isoformat()
        run = self.run_repository.create(
            {
                "id": str(uuid4()),
                "organization_id": organization_id,
                "report_id": report_id,
                "actor_id": actor_id,
                "status": FinalizeRunStatus.PENDING.value,
                "idempotency_key": resolved_key,
                "client_report_uuid": client_report_uuid,
                "steps_completed": [],
                "steps_failed": [],
                "created_at": now,
                "updated_at": now,
                "metadata": {
                    "source_filename": source_filename
                    or f"{report_id}.pdf",
                    "source_bytes": len(source_content),
                },
            }
        )

        updated = self.report_repository.update(
            report_id,
            {"status": "FINALIZING"},
        )
        if not updated:
            raise NotFoundError(
                message="Field visit report not found",
                resource_type="field_visit_report",
                resource_id=report_id,
            )

        run = self._execute_core_pipeline(
            run=run,
            organization_id=organization_id,
            report_id=report_id,
            actor_id=actor_id,
            source_content=source_content,
            source_filename=source_filename or f"{report_id}.pdf",
        )
        return self._build_start_response(report_id, run)

    def get_finalize_status(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> FieldReportFinalizeStatusResponse:
        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        latest = self.run_repository.get_latest_by_report_id(report_id)
        finalize_run = (
            self._serialize_run_status(latest) if latest else None
        )
        return FieldReportFinalizeStatusResponse(
            report_id=report_id,
            status=str(record.get("status") or ""),
            finalize_run=finalize_run,
        )

    def _execute_core_pipeline(
        self,
        *,
        run: dict,
        organization_id: str,
        report_id: str,
        actor_id: str,
        source_content: bytes,
        source_filename: str,
    ) -> dict:
        run_id = str(run["id"])
        record = self.report_repository.get_by_id(report_id)
        if record is None:
            raise NotFoundError(
                message="Field visit report not found",
                resource_type="field_visit_report",
                resource_id=report_id,
            )

        self.run_repository.update(
            run_id,
            {"status": FinalizeRunStatus.RUNNING.value},
        )

        ctx = FinalizePipelineContext(
            organization_id=organization_id,
            report_id=report_id,
            project_id=str(record["project_id"]),
            actor_id=actor_id,
            run_id=run_id,
            source_content=source_content,
            source_filename=source_filename,
            record=record,
        )

        completed_steps: list[str] = []
        failed_steps: list[str] = []
        step_summaries: dict[str, dict] = {}

        pre_infra = self.infrastructure_service.record_pre_pipeline(
            actor_id=actor_id,
            organization_id=organization_id,
            idempotency_key=str(run.get("idempotency_key") or ""),
        )
        completed_steps.extend(pre_infra.steps_completed)
        step_summaries.update(pre_infra.step_summaries)

        try:
            core_completed, failed_steps, core_summaries = (
                self.steps.run_core_steps(ctx)
            )
            completed_steps.extend(core_completed)
            step_summaries.update(core_summaries)
            materialization = (
                ctx.materialization.model_dump(mode="json")
                if ctx.materialization is not None
                else None
            )

            email_record = dict(ctx.record)
            project = (
                self.visit_report_service.project_repository.get_project_by_id(
                    ctx.project_id,
                )
            )
            if project is not None:
                email_record["_project"] = project
            line_group_keys = self._line_group_keys_for_report(ctx.report_id)
            email_record["_finding_count"] = len(
                self.visit_report_service.line_repository.list_by_report(
                    ctx.report_id,
                )
            )

            email_result = self.email_service.dispatch_after_core_steps(
                organization_id=organization_id,
                project_id=ctx.project_id,
                report_id=report_id,
                record=email_record,
                source_content=source_content,
                source_filename=source_filename,
                line_group_keys=line_group_keys,
            )
            completed_steps = [
                *completed_steps,
                *email_result.steps_completed,
            ]
            step_summaries = {
                **step_summaries,
                **email_result.step_summaries,
            }

            notifications_result = (
                self.notifications_service.dispatch_after_email(
                    organization_id=organization_id,
                    project_id=ctx.project_id,
                    report_id=report_id,
                    actor_id=actor_id,
                    finalize_run_id=run_id,
                    materialization=materialization,
                    send_email=email_result.email_status.value != "QUEUED",
                )
            )
            completed_steps = [
                *completed_steps,
                *notifications_result.steps_completed,
            ]
            step_summaries = {
                **step_summaries,
                **notifications_result.step_summaries,
            }

            ai_result = self.ai_service.schedule_after_email_and_notifications(
                organization_id=organization_id,
                project_id=ctx.project_id,
                report_id=report_id,
                finalize_run_id=run_id,
                materialization=materialization,
            )
            completed_steps = [
                *completed_steps,
                *ai_result.steps_completed,
            ]
            step_summaries = {
                **step_summaries,
                **ai_result.step_summaries,
            }

            post_infra = self.infrastructure_service.record_post_pipeline_success(
                project_id=ctx.project_id,
                report_id=report_id,
                run_id=run_id,
                workspace_activity_id=(
                    ctx.step_summaries.get("C13", {}).get("activity_id")
                ),
            )
            completed_steps.extend(post_infra.steps_completed)
            step_summaries.update(post_infra.step_summaries)

            run_status = FinalizeRunStatus.COMPLETED.value
            if email_result.email_status.value == "FAILED":
                run_status = FinalizeRunStatus.PARTIAL.value

            updated_run = self.run_repository.update(
                run_id,
                {
                    "status": run_status,
                    "steps_completed": completed_steps,
                    "steps_failed": failed_steps,
                    "materialization": materialization,
                    "email_status": email_result.email_status.value,
                    "email_sent_at": email_result.email_sent_at,
                    "metadata": {
                        **(run.get("metadata") or {}),
                        "step_summaries": step_summaries,
                        "email_recipients": email_result.recipients,
                        "email_attempts": email_result.attempts,
                        **(
                            {"email_error": email_result.error_message}
                            if email_result.error_message
                            else {}
                        ),
                    },
                },
            )
            return updated_run or {
                **run,
                "status": run_status,
                "steps_completed": completed_steps,
                "steps_failed": failed_steps,
                "materialization": materialization,
                "email_status": email_result.email_status.value,
                "email_sent_at": email_result.email_sent_at,
            }
        except Exception as error:
            completed_steps = [
                *pre_infra.steps_completed,
                *list(ctx.step_summaries.keys()),
            ]
            step_summaries.update(ctx.step_summaries)
            post_infra = (
                self.infrastructure_service.record_post_pipeline_failure(
                    project_id=ctx.project_id,
                    report_id=report_id,
                    run_id=run_id,
                    error=error,
                )
            )
            completed_steps.extend(post_infra.steps_completed)
            step_summaries.update(post_infra.step_summaries)
            self.report_repository.update(
                report_id,
                {"status": "FINALIZE_FAILED"},
            )
            failed_step = next(
                (
                    step_id
                    for step_id in CORE_FINALIZE_STEP_ORDER
                    if step_id not in completed_steps
                ),
                None,
            )
            failed_steps = [failed_step] if failed_step else failed_steps
            updated_run = self.run_repository.update(
                run_id,
                {
                    "status": FinalizeRunStatus.FAILED.value,
                    "steps_completed": completed_steps,
                    "steps_failed": failed_steps,
                    "error_message": str(error),
                    "metadata": {
                        **(run.get("metadata") or {}),
                        "step_summaries": step_summaries,
                    },
                },
            )
            return updated_run or {
                **run,
                "status": FinalizeRunStatus.FAILED.value,
                "steps_completed": completed_steps,
                "steps_failed": failed_steps,
                "error_message": str(error),
            }

    def _line_group_keys_for_report(self, report_id: str) -> set[str]:
        lines = self.visit_report_service.line_repository.list_by_report(
            report_id,
        )
        return {
            str(line.get("group_key") or "").strip() for line in lines
        }

    @staticmethod
    def _should_execute_pipeline(run: dict) -> bool:
        status = str(run.get("status") or "")
        completed = list(run.get("steps_completed") or [])
        return status in {
            FinalizeRunStatus.PENDING.value,
            FinalizeRunStatus.FAILED.value,
        } and len(completed) < len(CORE_FINALIZE_STEP_ORDER)

    def _get_org_report(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> dict:
        record = self.report_repository.get_by_id(report_id)
        if not record or record.get("organization_id") != organization_id:
            raise NotFoundError(
                message="Field visit report not found",
                resource_type="field_visit_report",
                resource_id=report_id,
            )
        return record

    def _resolve_idempotency_key(
        self,
        report_id: str,
        provided: str | None,
    ) -> str:
        if provided and provided.strip():
            return provided.strip()
        return f"finalize:{report_id}"

    def _find_existing_run(
        self,
        *,
        organization_id: str,
        report_id: str,
        idempotency_key: str,
    ) -> dict | None:
        by_key = self.run_repository.get_by_idempotency_key(
            organization_id=organization_id,
            idempotency_key=idempotency_key,
        )
        if by_key is not None:
            return by_key
        return self.run_repository.get_active_by_report_id(report_id)

    @staticmethod
    def _build_start_response(
        report_id: str,
        run: dict,
    ) -> FieldReportFinalizeStartResponse:
        return FieldReportFinalizeStartResponse(
            report_id=report_id,
            finalize_run_id=str(run["id"]),
            status="FINALIZING",
        )

    @staticmethod
    def _serialize_run_status(
        run: dict,
    ) -> FieldReportFinalizeRunStatus:
        return FieldReportFinalizeRunStatus(
            id=str(run["id"]),
            status=FinalizeRunStatus(str(run.get("status") or "PENDING")),
            steps_completed=list(run.get("steps_completed") or []),
            steps_failed=list(run.get("steps_failed") or []),
            email_status=run.get("email_status"),
            email_sent_at=run.get("email_sent_at"),
            materialization=run.get("materialization"),
        )
