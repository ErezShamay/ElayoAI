from __future__ import annotations

import pytest

from app.exceptions.exceptions import ConflictError, NotFoundError
from app.schemas.quality_issue import IssueVisibility
from app.services.report_deletion_service import ReportDeletionService
from tests.quality_issues_test_support import (
    InMemoryQualityIssueEventRepository,
    InMemoryQualityIssuePhotoRepository,
    InMemoryQualityIssueRepository,
    qc_create_request,
)
from tests.test_field_visit_reports import (
    FakeVisitReportLinePhotoRepository,
    FakeVisitReportLineRepository,
    FakeVisitReportRepository,
)


class FakeWeeklyReportRepository:
    def __init__(self) -> None:
        self.records: dict[str, dict] = {}
        self._counter = 0

    def create(self, *, project_id: str, **kwargs) -> dict:
        self._counter += 1
        report_id = f"weekly-{self._counter}"
        record = {
            "id": report_id,
            "project_id": project_id,
            **kwargs,
        }
        self.records[report_id] = record
        return record

    def get_by_id(self, report_id: str) -> dict | None:
        return self.records.get(report_id)

    def get_for_project(
        self,
        *,
        project_id: str,
        report_id: str,
    ) -> dict | None:
        record = self.get_by_id(report_id)
        if record is None:
            return None
        if str(record.get("project_id")) != str(project_id):
            return None
        return record

    def delete(self, report_id: str) -> bool:
        return self.records.pop(report_id, None) is not None


class FakePhotoService:
    def __init__(self) -> None:
        self.deleted_paths: list[str] = []

    def delete_photo(self, storage_path: str) -> None:
        self.deleted_paths.append(storage_path)


def build_service(
    *,
    reports: FakeVisitReportRepository | None = None,
    lines: FakeVisitReportLineRepository | None = None,
    photos: FakeVisitReportLinePhotoRepository | None = None,
    issues: InMemoryQualityIssueRepository | None = None,
    events: InMemoryQualityIssueEventRepository | None = None,
    weekly_reports: FakeWeeklyReportRepository | None = None,
    activities: list[dict] | None = None,
    supabase_client: _FakeSupabaseClient | None = None,
) -> ReportDeletionService:
    activity_log = activities if activities is not None else []

    def record_activity(**kwargs):
        activity_log.append(kwargs)
        return [{"id": f"activity-{len(activity_log)}"}]

    return ReportDeletionService(
        field_visit_report_repository=reports or FakeVisitReportRepository(),
        line_repository=lines or FakeVisitReportLineRepository(),
        line_photo_repository=photos or FakeVisitReportLinePhotoRepository(),
        photo_service=FakePhotoService(),
        issue_repository=issues or InMemoryQualityIssueRepository(),
        issue_event_repository=events or InMemoryQualityIssueEventRepository(),
        issue_photo_repository=InMemoryQualityIssuePhotoRepository(),
        weekly_report_repository=weekly_reports or FakeWeeklyReportRepository(),
        activity_recorder=record_activity,
        supabase_client=supabase_client,
    )


def test_delete_field_visit_report_in_progress_success() -> None:
    reports = FakeVisitReportRepository()
    lines = FakeVisitReportLineRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="IN_PROGRESS",
    )
    report_id = str(report["id"])
    lines.create(
        {
            "report_id": report_id,
            "organization_id": "org-1",
            "sort_order": 0,
            "description": "שורה",
        }
    )
    activities: list[dict] = []
    service = build_service(reports=reports, lines=lines, activities=activities)

    result = service.delete_field_visit_report(
        organization_id="org-1",
        report_id=report_id,
        actor_id="user-1",
    )

    assert result.deleted is True
    assert result.deleted_line_count == 1
    assert reports.get_by_id(report_id) is None
    assert activities[0]["activity_type"] == "REPORT_DELETED"


def test_delete_field_visit_report_closed_without_pdf_success() -> None:
    reports = FakeVisitReportRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="CLOSED",
    )
    report_id = str(report["id"])
    service = build_service(reports=reports)

    result = service.delete_field_visit_report(
        organization_id="org-1",
        report_id=report_id,
    )

    assert result.deleted is True
    assert reports.get_by_id(report_id) is None


def test_delete_field_visit_report_removes_draft_issues() -> None:
    reports = FakeVisitReportRepository()
    issues = InMemoryQualityIssueRepository()
    events = InMemoryQualityIssueEventRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="IN_PROGRESS",
    )
    report_id = str(report["id"])
    issue = issues.create(
        organization_id="org-1",
        project_id="project-1",
        request=qc_create_request(
            first_seen_report_id=report_id,
            last_seen_report_id=report_id,
            visibility=IssueVisibility.DRAFT,
        ),
    )
    events.create(
        issue_id=str(issue["id"]),
        event_type="CREATED_FROM_FIELD",
        report_id=report_id,
    )
    service = build_service(
        reports=reports,
        issues=issues,
        events=events,
    )

    result = service.delete_field_visit_report(
        organization_id="org-1",
        report_id=report_id,
    )

    assert result.deleted_draft_issue_count == 1
    assert issues.get_by_id(str(issue["id"])) is None


def test_delete_field_visit_report_rejects_pdf() -> None:
    reports = FakeVisitReportRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="CLOSED",
        pdf_storage_path="org-1/project-1/report-1/file.pdf",
    )
    service = build_service(reports=reports)

    with pytest.raises(ConflictError) as exc_info:
        service.delete_field_visit_report(
            organization_id="org-1",
            report_id=str(report["id"]),
        )

    assert exc_info.value.details["error_code"] == "REPORT_DELETE_PDF_EXISTS"


def test_delete_field_visit_report_rejects_locked() -> None:
    reports = FakeVisitReportRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="LOCKED",
    )
    service = build_service(reports=reports)

    with pytest.raises(ConflictError) as exc_info:
        service.delete_field_visit_report(
            organization_id="org-1",
            report_id=str(report["id"]),
        )

    assert exc_info.value.details["error_code"] == "REPORT_DELETE_LOCKED"


def test_delete_field_visit_report_rejects_published_issue() -> None:
    reports = FakeVisitReportRepository()
    issues = InMemoryQualityIssueRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="IN_PROGRESS",
    )
    report_id = str(report["id"])
    issues.create(
        organization_id="org-1",
        project_id="project-1",
        request=qc_create_request(
            first_seen_report_id=report_id,
            visibility=IssueVisibility.PUBLISHED,
        ),
    )
    service = build_service(reports=reports, issues=issues)

    with pytest.raises(ConflictError) as exc_info:
        service.delete_field_visit_report(
            organization_id="org-1",
            report_id=report_id,
        )

    assert exc_info.value.details["error_code"] == "REPORT_DELETE_PUBLISHED_ISSUES"


def test_delete_field_visit_report_tenant_isolation() -> None:
    reports = FakeVisitReportRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="IN_PROGRESS",
    )
    service = build_service(reports=reports)

    with pytest.raises(NotFoundError):
        service.delete_field_visit_report(
            organization_id="org-2",
            report_id=str(report["id"]),
        )


def test_field_visit_delete_eligibility() -> None:
    reports = FakeVisitReportRepository()
    report = reports.create(
        organization_id="org-1",
        project_id="project-1",
        status="IN_PROGRESS",
    )
    service = build_service(reports=reports)

    eligibility = service.check_field_visit_report_deletable(
        organization_id="org-1",
        report_id=str(report["id"]),
    )

    assert eligibility.deletable is True


def test_delete_weekly_report_success() -> None:
    weekly_reports = FakeWeeklyReportRepository()
    report = weekly_reports.create(project_id="project-1")
    report_id = str(report["id"])
    activities: list[dict] = []
    service = build_service(
        weekly_reports=weekly_reports,
        activities=activities,
        supabase_client=_FakeSupabaseClient(
            projects=[{"organization_id": "org-1"}],
            findings=[],
            interpretations=[],
        ),
    )

    result = service.delete_weekly_report(
        organization_id="org-1",
        project_id="project-1",
        report_id=report_id,
        actor_id="user-1",
    )

    assert result.deleted is True
    assert weekly_reports.get_by_id(report_id) is None
    assert activities[0]["activity_type"] == "REPORT_DELETED"


def test_delete_weekly_report_rejects_processed() -> None:
    weekly_reports = FakeWeeklyReportRepository()
    report = weekly_reports.create(project_id="project-1")
    report_id = str(report["id"])
    service = build_service(
        weekly_reports=weekly_reports,
        supabase_client=_FakeSupabaseClient(
            projects=[{"organization_id": "org-1"}],
            findings=[{"id": "finding-1"}],
            interpretations=[],
        ),
    )

    with pytest.raises(ConflictError) as exc_info:
        service.delete_weekly_report(
            organization_id="org-1",
            project_id="project-1",
            report_id=report_id,
        )

    assert exc_info.value.details["error_code"] == "REPORT_DELETE_PROCESSING_COMPLETE"


class _FakeSupabaseClient:
    def __init__(
        self,
        *,
        projects: list[dict],
        findings: list[dict],
        interpretations: list[dict],
    ) -> None:
        self.projects = projects
        self.findings = findings
        self.interpretations = interpretations

    def table(self, name: str) -> _FakeSupabaseTable:
        if name == "projects":
            return _FakeSupabaseTable(rows=self.projects, field="id")
        if name == "findings":
            return _FakeSupabaseTable(rows=self.findings, field="report_id")
        if name == "ai_interpretations":
            return _FakeSupabaseTable(
                rows=self.interpretations,
                field="report_id",
            )
        return _FakeSupabaseTable(rows=[], field="id")


class _FakeSupabaseResponse:
    def __init__(self, data: list[dict]) -> None:
        self.data = data


class _FakeSupabaseTable:
    def __init__(self, *, rows: list[dict], field: str) -> None:
        self.rows = rows
        self.field = field

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, field, _value):
        self.field = field
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def execute(self):
        return _FakeSupabaseResponse(self.rows)
