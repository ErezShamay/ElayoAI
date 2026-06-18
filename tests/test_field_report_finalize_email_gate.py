from __future__ import annotations

from pathlib import Path

import pytest

from app.schemas.field_report_finalize import FinalizeEmailStatus
from app.schemas.quality_issue import IssueVisibility
from app.services.field_report_finalize_email_service import (
    EMAIL_FINALIZE_STEP_ORDER,
    FieldReportFinalizeEmailService,
)
from app.services.field_report_finalize_service import (
    FieldReportFinalizeService,
)
from app.services.field_report_finalize_steps import (
    CORE_FINALIZE_STEP_ORDER,
    FieldReportFinalizeSteps,
)
from app.services.field_visit_report_pdf_service import (
    FieldVisitReportPdfService,
)
from app.services.field_visit_report_service import FieldVisitReportService
from app.services.notification_service import NotificationService
from app.services.quality_issue_materialization_service import (
    QualityIssueMaterializationService,
)
from app.services.resident_portal_service import ResidentPortalService
from app.services.workspace_activity_service import WorkspaceActivityService
from tests.quality_issues_test_support import (
    InMemoryQualityIssueEventRepository,
    InMemoryQualityIssueRepository,
)
from tests.test_field_report_finalize_f1_gate import (
    FakeFinalizeRunRepository,
    FAKE_PDF,
)
from tests.field_report_finalize_test_support import (
    StubFinalizeAiService,
    StubFinalizeEmailService,
    StubFinalizeNotificationsService,
)
from tests.test_field_report_finalize_f2_gate import (
    FinalizeProjectRepository,
    _closed_report_with_line,
    _finalize_service as f2_finalize_service,
)
from tests.test_supervisor_project_scope import FakeProfileRepository
from tests.test_field_visit_reports import (
    FakeVisitReportLinePhotoRepository,
    FakeVisitReportLineRepository,
    FakeVisitReportRepository,
)


class FakeProjectApartmentRepository:
    def __init__(self, apartments: list[dict] | None = None) -> None:
        self.apartments = apartments or []

    def list_by_project(self, project_id: str) -> list[dict]:
        return [
            apartment
            for apartment in self.apartments
            if str(apartment.get("project_id")) == project_id
        ]


class RecordingResendSender:
    def __init__(self, *, should_fail: bool = False) -> None:
        self.calls: list[dict] = []
        self.should_fail = should_fail
        self.attempt = 0

    def __call__(self, payload: dict) -> dict:
        self.calls.append(payload)
        self.attempt += 1
        if self.should_fail:
            raise RuntimeError("resend unavailable")
        return {"id": f"email-{self.attempt}"}


def _email_finalize_service(
    *,
    reports: FakeVisitReportRepository,
    lines: FakeVisitReportLineRepository,
    issues: InMemoryQualityIssueRepository,
    events: InMemoryQualityIssueEventRepository,
    runs: FakeFinalizeRunRepository,
    pdf_root: Path,
    apartments: list[dict] | None = None,
    resend_sender: RecordingResendSender | None = None,
    project_repository: FinalizeProjectRepository | None = None,
) -> FieldReportFinalizeService:
    materialization = QualityIssueMaterializationService(
        report_repository=reports,
        line_repository=lines,
        line_photo_repository=FakeVisitReportLinePhotoRepository(),
        issue_repository=issues,
        event_repository=events,
    )
    pdf_service = FieldVisitReportPdfService(pdfs_root=pdf_root)
    project_repo = project_repository or FinalizeProjectRepository()
    visit_service = FieldVisitReportService(
        report_repository=reports,
        line_repository=lines,
        line_photo_repository=FakeVisitReportLinePhotoRepository(),
        project_repository=project_repo,
        materialization_service=materialization,
        pdf_service=pdf_service,
    )
    steps = FieldReportFinalizeSteps(
        visit_report_service=visit_service,
        profile_repository=FakeProfileRepository(
            {
                "supervisor-1": {
                    "id": "supervisor-1",
                    "email": "supervisor@example.com",
                }
            }
        ),
        notification_service=NotificationService(),
        workspace_activity_service=WorkspaceActivityService(),
        resident_portal_service=ResidentPortalService(
            line_repository=lines,
            issue_repository=issues,
            project_repository=project_repo,
        ),
    )
    email_service = FieldReportFinalizeEmailService(
        apartment_repository=FakeProjectApartmentRepository(apartments),
        pdf_service=pdf_service,
        resend_sender=resend_sender,
    )
    return FieldReportFinalizeService(
        run_repository=runs,
        report_repository=reports,
        visit_report_service=visit_service,
        steps=steps,
        email_service=email_service,
        notifications_service=StubFinalizeNotificationsService(),
        ai_service=StubFinalizeAiService(),
    )


class FinalizeProjectWithStakeholderEmails(FinalizeProjectRepository):
    def get_project_by_id(self, project_id: str) -> dict | None:
        project = super().get_project_by_id(project_id)
        if project is None:
            return None
        return {
            **project,
            "developer_email": "developer@example.com",
        }


def test_finalize_email_runs_after_core_steps_with_pdf_attachment(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_email_service.settings.RESEND_API_KEY",
        "test-key",
    )
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    sender = RecordingResendSender()
    apartments = [
        {
            "id": "apt-3",
            "organization_id": "org-1",
            "project_id": "project-1",
            "apartment_number": "3",
            "group_key": "apartment:3",
            "owner_name": "דייר 3",
            "email": "resident3@example.com",
        },
        {
            "id": "apt-9",
            "organization_id": "org-1",
            "project_id": "project-1",
            "apartment_number": "9",
            "group_key": "apartment:9",
            "owner_name": "דייר 9",
            "email": "resident9@example.com",
        },
    ]
    service = _email_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        apartments=apartments,
        resend_sender=sender,
        project_repository=FinalizeProjectWithStakeholderEmails(),
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
        source_filename="visit.pdf",
    )

    run = runs.records[result.finalize_run_id]
    assert reports.records["report-1"]["status"] == "FINALIZED"
    assert run["status"] == "COMPLETED"
    assert set(CORE_FINALIZE_STEP_ORDER) <= set(run["steps_completed"])
    assert set(EMAIL_FINALIZE_STEP_ORDER) <= set(run["steps_completed"])
    core_index = run["steps_completed"].index("C01")
    email_index = run["steps_completed"].index("E01")
    assert core_index < email_index
    assert run["email_status"] == FinalizeEmailStatus.SENT.value
    assert run["email_sent_at"]

    assert len(sender.calls) == 1
    payload = sender.calls[0]
    assert payload["to"] == [
        "resident3@example.com",
        "developer@example.com",
    ]
    assert payload["attachments"][0]["filename"] == "visit.pdf"
    assert payload["attachments"][0]["content"]


def test_finalize_email_failure_keeps_report_finalized_with_retries(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_email_service.settings.RESEND_API_KEY",
        "test-key",
    )
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    sender = RecordingResendSender(should_fail=True)
    apartments = [
        {
            "id": "apt-3",
            "organization_id": "org-1",
            "project_id": "project-1",
            "apartment_number": "3",
            "group_key": "apartment:3",
            "owner_name": "דייר 3",
            "email": "resident3@example.com",
        },
    ]
    service = _email_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        apartments=apartments,
        resend_sender=sender,
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    run = runs.records[result.finalize_run_id]
    assert reports.records["report-1"]["status"] == "FINALIZED"
    assert run["status"] == "PARTIAL"
    assert run["email_status"] == FinalizeEmailStatus.FAILED.value
    assert run["metadata"]["email_attempts"] == 3
    assert len(sender.calls) == 3


def test_finalize_email_queued_when_feature_disabled(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_email_service.settings.FEATURE_FLAGS.enable_email_delivery",
        False,
    )
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    sender = RecordingResendSender()
    service = _email_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        resend_sender=sender,
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    run = runs.records[result.finalize_run_id]
    assert run["email_status"] == FinalizeEmailStatus.QUEUED.value
    assert run["status"] == "COMPLETED"
    assert sender.calls == []


def test_finalize_core_failure_does_not_send_email(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_email_service.settings.RESEND_API_KEY",
        "test-key",
    )
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    sender = RecordingResendSender()

    service = f2_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
    )
    service.email_service = FieldReportFinalizeEmailService(
        apartment_repository=FakeProjectApartmentRepository(
            [
                {
                    "id": "apt-3",
                    "organization_id": "org-1",
                    "project_id": "project-1",
                    "apartment_number": "3",
                    "group_key": "apartment:3",
                    "owner_name": "דייר 3",
                    "email": "resident3@example.com",
                }
            ]
        ),
        resend_sender=sender,
    )

    def failing_materialization(ctx):
        raise RuntimeError("materialization failed")

    service.steps._handlers["C04"] = failing_materialization

    service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    assert reports.records["report-1"]["status"] == "FINALIZE_FAILED"
    assert sender.calls == []
    run = runs.records[next(iter(runs.records))]
    assert "E01" not in run.get("steps_completed", [])
    assert run.get("email_status") is None
