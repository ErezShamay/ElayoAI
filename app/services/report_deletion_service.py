from __future__ import annotations

from typing import Any, Callable

from pydantic import BaseModel

from app.constants.report_deletion import (
    LOCKED_FIELD_VISIT_STATUSES,
    REPORT_DELETE_LOCKED,
    REPORT_DELETE_PDF_EXISTS,
    REPORT_DELETE_PROCESSING_COMPLETE,
    REPORT_DELETE_PUBLISHED_ISSUES,
    REPORT_DELETE_REASON_HE,
)
from app.db.supabase_client import supabase
from app.exceptions.exceptions import ConflictError, NotFoundError
from app.repositories.field_visit_report_line_photo_repository import (
    FieldVisitReportLinePhotoRepository,
)
from app.repositories.field_visit_report_line_repository import (
    FieldVisitReportLineRepository,
)
from app.repositories.field_visit_report_repository import (
    FieldVisitReportRepository,
)
from app.repositories.quality_issue_photo_repository import (
    QualityIssuePhotoRepository,
)
from app.repositories.quality_issue_repository import (
    QualityIssueEventRepository,
    QualityIssueRepository,
)
from app.repositories.weekly_report_repository import WeeklyReportRepository
from app.repositories.workspace_activity_repository import (
    WorkspaceActivityRepository,
)
from app.schemas.quality_issue import IssueVisibility
from app.services.field_visit_report_photo_service import (
    FieldVisitReportPhotoService,
)


class DeletionEligibility(BaseModel):
    deletable: bool
    reason_code: str | None = None
    reason_he: str | None = None
    blocking_issue_count: int = 0


class FieldVisitReportDeletionResult(BaseModel):
    deleted: bool = True
    report_id: str
    deleted_draft_issue_count: int = 0
    deleted_line_count: int = 0


class WeeklyReportDeletionResult(BaseModel):
    deleted: bool = True
    report_id: str
    project_id: str


ActivityRecorder = Callable[..., Any]


class ReportDeletionService:
    def __init__(
        self,
        *,
        field_visit_report_repository:
            FieldVisitReportRepository | None = None,
        line_repository:
            FieldVisitReportLineRepository | None = None,
        line_photo_repository:
            FieldVisitReportLinePhotoRepository | None = None,
        photo_service: FieldVisitReportPhotoService | None = None,
        issue_repository: QualityIssueRepository | None = None,
        issue_event_repository: QualityIssueEventRepository | None = None,
        issue_photo_repository: QualityIssuePhotoRepository | None = None,
        weekly_report_repository: WeeklyReportRepository | None = None,
        activity_recorder: ActivityRecorder | None = None,
        supabase_client: Any | None = None,
    ) -> None:
        self.field_visit_report_repository = (
            field_visit_report_repository or FieldVisitReportRepository()
        )
        self.line_repository = (
            line_repository or FieldVisitReportLineRepository()
        )
        self.line_photo_repository = (
            line_photo_repository or FieldVisitReportLinePhotoRepository()
        )
        self.photo_service = photo_service or FieldVisitReportPhotoService()
        self.issue_repository = issue_repository or QualityIssueRepository()
        self.issue_event_repository = (
            issue_event_repository or QualityIssueEventRepository()
        )
        self.issue_photo_repository = (
            issue_photo_repository or QualityIssuePhotoRepository()
        )
        self.weekly_report_repository = (
            weekly_report_repository or WeeklyReportRepository()
        )
        self.activity_recorder = (
            activity_recorder or WorkspaceActivityRepository.create_activity
        )
        self.supabase_client = supabase_client or supabase

    def check_field_visit_report_deletable(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> DeletionEligibility:
        record = self._get_field_visit_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        return self._field_visit_eligibility(record, report_id=report_id)

    def delete_field_visit_report(
        self,
        *,
        organization_id: str,
        report_id: str,
        actor_id: str | None = None,
    ) -> FieldVisitReportDeletionResult:
        record = self._get_field_visit_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        eligibility = self._field_visit_eligibility(record, report_id=report_id)
        if not eligibility.deletable:
            raise ConflictError(
                message=eligibility.reason_he or "לא ניתן למחוק את הדוח",
                details={"error_code": eligibility.reason_code},
            )

        linked_issues = self._collect_field_visit_linked_issues(report_id)
        draft_issues = [
            issue
            for issue in linked_issues
            if self._issue_visibility(issue) == IssueVisibility.DRAFT.value
        ]
        published_issues = [
            issue
            for issue in linked_issues
            if self._issue_visibility(issue) != IssueVisibility.DRAFT.value
        ]
        if published_issues:
            raise ConflictError(
                message=REPORT_DELETE_REASON_HE[REPORT_DELETE_PUBLISHED_ISSUES],
                details={
                    "error_code": REPORT_DELETE_PUBLISHED_ISSUES,
                    "blocking_issue_count": len(published_issues),
                },
            )

        deleted_draft_issue_count = 0
        for issue in draft_issues:
            issue_id = str(issue.get("id") or "")
            if issue_id:
                self._delete_quality_issue(issue_id)
                deleted_draft_issue_count += 1

        deleted_line_count = 0
        if self.line_repository.is_storage_available():
            for line in self.line_repository.list_by_report(report_id):
                self._delete_line_photos(line)
                line_id = str(line.get("id") or "")
                if line_id and self.line_repository.delete(line_id):
                    deleted_line_count += 1

        if not self.field_visit_report_repository.delete(report_id):
            raise NotFoundError(
                message="Field visit report not found",
                resource_type="field_visit_report",
                resource_id=report_id,
            )

        self._record_activity(
            project_id=str(record.get("project_id") or ""),
            report_id=report_id,
            report_kind="field_visit",
            actor_id=actor_id,
            deleted_draft_issue_count=deleted_draft_issue_count,
        )

        return FieldVisitReportDeletionResult(
            report_id=report_id,
            deleted_draft_issue_count=deleted_draft_issue_count,
            deleted_line_count=deleted_line_count,
        )

    def check_weekly_report_deletable(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
    ) -> DeletionEligibility:
        self._get_weekly_report(
            organization_id=organization_id,
            project_id=project_id,
            report_id=report_id,
        )
        return self._weekly_eligibility(
            organization_id=organization_id,
            report_id=report_id,
        )

    def delete_weekly_report(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        actor_id: str | None = None,
    ) -> WeeklyReportDeletionResult:
        record = self._get_weekly_report(
            organization_id=organization_id,
            project_id=project_id,
            report_id=report_id,
        )
        eligibility = self._weekly_eligibility(
            organization_id=organization_id,
            report_id=report_id,
        )
        if not eligibility.deletable:
            raise ConflictError(
                message=eligibility.reason_he or "לא ניתן למחוק את הדוח",
                details={"error_code": eligibility.reason_code},
            )

        if not self.weekly_report_repository.delete(report_id):
            raise NotFoundError(
                message="Weekly report not found",
                resource_type="weekly_report",
                resource_id=report_id,
            )

        self._record_activity(
            project_id=str(record.get("project_id") or project_id),
            report_id=report_id,
            report_kind="weekly_upload",
            actor_id=actor_id,
            deleted_draft_issue_count=0,
        )

        return WeeklyReportDeletionResult(
            report_id=report_id,
            project_id=project_id,
        )

    def _get_field_visit_report(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> dict:
        record = self.field_visit_report_repository.get_by_id(report_id)
        if record is None or str(record.get("organization_id")) != organization_id:
            raise NotFoundError(
                message="Field visit report not found",
                resource_type="field_visit_report",
                resource_id=report_id,
            )
        return record

    def _get_weekly_report(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
    ) -> dict:
        record = self.weekly_report_repository.get_for_project(
            project_id=project_id,
            report_id=report_id,
        )
        if record is None:
            raise NotFoundError(
                message="Weekly report not found",
                resource_type="weekly_report",
                resource_id=report_id,
            )

        project_response = (
            self.supabase_client.table("projects")
            .select("organization_id")
            .eq("id", project_id)
            .limit(1)
            .execute()
        )
        project = (
            project_response.data[0]
            if project_response.data
            else None
        )
        if (
            project is None
            or str(project.get("organization_id")) != organization_id
        ):
            raise NotFoundError(
                message="Weekly report not found",
                resource_type="weekly_report",
                resource_id=report_id,
            )
        return record

    def _field_visit_eligibility(
        self,
        record: dict,
        *,
        report_id: str,
    ) -> DeletionEligibility:
        if str(record.get("pdf_storage_path") or "").strip():
            return DeletionEligibility(
                deletable=False,
                reason_code=REPORT_DELETE_PDF_EXISTS,
                reason_he=REPORT_DELETE_REASON_HE[REPORT_DELETE_PDF_EXISTS],
            )

        status = str(record.get("status") or "")
        if status in LOCKED_FIELD_VISIT_STATUSES:
            return DeletionEligibility(
                deletable=False,
                reason_code=REPORT_DELETE_LOCKED,
                reason_he=REPORT_DELETE_REASON_HE[REPORT_DELETE_LOCKED],
            )

        linked_issues = self._collect_field_visit_linked_issues(report_id)
        published_issues = [
            issue
            for issue in linked_issues
            if self._issue_visibility(issue) != IssueVisibility.DRAFT.value
        ]
        if published_issues:
            return DeletionEligibility(
                deletable=False,
                reason_code=REPORT_DELETE_PUBLISHED_ISSUES,
                reason_he=REPORT_DELETE_REASON_HE[
                    REPORT_DELETE_PUBLISHED_ISSUES
                ],
                blocking_issue_count=len(published_issues),
            )

        return DeletionEligibility(deletable=True)

    def _weekly_eligibility(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> DeletionEligibility:
        if self._weekly_report_has_processing_artifacts(
            organization_id=organization_id,
            report_id=report_id,
        ):
            return DeletionEligibility(
                deletable=False,
                reason_code=REPORT_DELETE_PROCESSING_COMPLETE,
                reason_he=REPORT_DELETE_REASON_HE[
                    REPORT_DELETE_PROCESSING_COMPLETE
                ],
            )
        return DeletionEligibility(deletable=True)

    def _weekly_report_has_processing_artifacts(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> bool:
        findings_response = (
            self.supabase_client.table("findings")
            .select("id")
            .eq("report_id", report_id)
            .limit(1)
            .execute()
        )
        if findings_response.data:
            return True

        issues = self.issue_repository.list_by_materialization_prefix(
            organization_id=organization_id,
            report_id=report_id,
        )
        if issues:
            return True

        interpretations_response = (
            self.supabase_client.table("ai_interpretations")
            .select("id")
            .eq("report_id", report_id)
            .limit(1)
            .execute()
        )
        return bool(interpretations_response.data)

    def _collect_field_visit_linked_issues(
        self,
        report_id: str,
    ) -> list[dict]:
        merged: dict[str, dict] = {}
        for issue in self.issue_repository.list_linked_to_field_visit_report(
            report_id
        ):
            issue_id = str(issue.get("id") or "")
            if issue_id:
                merged[issue_id] = issue

        if self.issue_event_repository.is_storage_available():
            for event in self.issue_event_repository.list_by_report_id(
                report_id
            ):
                issue_id = str(event.get("issue_id") or "")
                if not issue_id or issue_id in merged:
                    continue
                issue = self.issue_repository.get_by_id(issue_id)
                if issue is not None:
                    merged[issue_id] = issue

        return list(merged.values())

    @staticmethod
    def _issue_visibility(issue: dict) -> str:
        return str(issue.get("visibility") or IssueVisibility.DRAFT.value)

    def _delete_quality_issue(self, issue_id: str) -> None:
        self.issue_event_repository.delete_by_issue_id(issue_id)
        self.issue_photo_repository.delete_by_issue_id(issue_id)
        self.issue_repository.delete(issue_id)

    def _delete_line_photos(self, line: dict) -> None:
        line_id = str(line.get("id") or "")
        if not line_id:
            return

        if self.line_photo_repository.is_storage_available():
            for photo in self.line_photo_repository.list_by_line(line_id):
                storage_path = photo.get("storage_path")
                if storage_path:
                    self.photo_service.delete_photo(str(storage_path))
            self.line_photo_repository.delete_by_line(line_id)
            return

        storage_path = line.get("photo_storage_path")
        if storage_path:
            self.photo_service.delete_photo(str(storage_path))

    def _record_activity(
        self,
        *,
        project_id: str,
        report_id: str,
        report_kind: str,
        actor_id: str | None,
        deleted_draft_issue_count: int,
    ) -> None:
        if not project_id:
            return

        metadata: dict[str, Any] = {
            "report_id": report_id,
            "report_kind": report_kind,
            "deleted_draft_issue_count": deleted_draft_issue_count,
        }
        if actor_id:
            metadata["actor_id"] = actor_id

        self.activity_recorder(
            project_id=project_id,
            activity_type="REPORT_DELETED",
            title="דוח נמחק",
            description=f"Report {report_id} deleted",
            metadata=metadata,
        )
