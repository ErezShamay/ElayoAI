from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest

from app.config.settings import FeatureFlags
from app.schemas.quality_issue import IssueVisibility
from app.services.automation_job_queue_service import AutomationJobQueueService
from app.services.automation_rules_engine import AutomationRulesEngine
from app.services.field_report_finalize_notifications_service import (
    EXPECTED_NOTIFICATIONS_FINALIZE_STEPS,
    NOTIFICATIONS_FINALIZE_STEP_ORDER,
    FieldReportFinalizeNotificationsService,
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
from app.services.qc_notification_service import QcNotificationService
from app.services.quality_issue_materialization_service import (
    QualityIssueMaterializationService,
)
from app.services.resident_portal_service import ResidentPortalService
from app.services.workspace_activity_service import WorkspaceActivityService
from app.tools.notification_tool import NotificationTool
from tests.field_report_finalize_test_support import (
    StubFinalizeAiService,
    StubFinalizeEmailService,
)
from tests.quality_issues_test_support import (
    InMemoryQualityIssueEventRepository,
    InMemoryQualityIssueRepository,
    qc_create_request,
)
from tests.test_field_report_finalize_f1_gate import (
    FakeFinalizeRunRepository,
    FAKE_PDF,
)
from tests.test_field_report_finalize_f2_gate import (
    FinalizeProjectRepository,
    _closed_report_with_line,
)
from tests.test_supervisor_project_scope import FakeProfileRepository
from tests.test_field_visit_reports import (
    FakeVisitReportLinePhotoRepository,
    FakeVisitReportLineRepository,
    FakeVisitReportRepository,
)


class RecordingNotificationTool(NotificationTool):
    def __init__(self) -> None:
        self.reminders_sent: list[dict] = []
        self.built_payloads: list[dict] = []

    def build_new_critical_issue_messages(self, digests, *, report_id: str):
        payloads = super().build_new_critical_issue_messages(
            digests,
            report_id=report_id,
        )
        self.built_payloads.extend(payloads)
        return payloads

    def send_reminders(self, reminders):
        self.reminders_sent.extend(reminders)
        return [
            {"to": reminder.get("to"), "status": "SENT"}
            for reminder in reminders
        ]


def _critical_closed_report(
    *,
    report_id: str = "report-1",
) -> tuple[
    FakeVisitReportRepository,
    FakeVisitReportLineRepository,
    InMemoryQualityIssueRepository,
    InMemoryQualityIssueEventRepository,
]:
    reports, lines, issues, events = _closed_report_with_line(
        report_id=report_id,
        line_description="ליקוי קריטי בקיר",
    )
    line = lines.list_by_report(report_id)[0]
    lines.update(
        str(line["id"]),
        {"severity": "CRITICAL"},
    )
    return reports, lines, issues, events


def _f4_finalize_service(
    *,
    reports: FakeVisitReportRepository,
    lines: FakeVisitReportLineRepository,
    issues: InMemoryQualityIssueRepository,
    events: InMemoryQualityIssueEventRepository,
    runs: FakeFinalizeRunRepository,
    pdf_root: Path,
    notification_tool: RecordingNotificationTool | None = None,
    job_queue: AutomationJobQueueService | None = None,
) -> FieldReportFinalizeService:
    tool = notification_tool or RecordingNotificationTool()
    queue = job_queue or AutomationJobQueueService()
    project_repo = FinalizeProjectRepository()
    qc_service = QcNotificationService(notification_tool=tool)
    qc_service.critical_alert_service.issue_repository = issues
    qc_service.critical_alert_service.project_repository = project_repo
    qc_service.open_report_service.report_repository = reports
    qc_service.open_report_service.project_repository = project_repo
    notifications_service = FieldReportFinalizeNotificationsService(
        qc_notification_service=qc_service,
        rules_engine=AutomationRulesEngine(),
        job_queue_service=queue,
        issue_repository=issues,
        workspace_activity_service=WorkspaceActivityService(),
    )

    materialization = QualityIssueMaterializationService(
        report_repository=reports,
        line_repository=lines,
        line_photo_repository=FakeVisitReportLinePhotoRepository(),
        issue_repository=issues,
        event_repository=events,
    )
    pdf_service = FieldVisitReportPdfService(pdfs_root=pdf_root)
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
    return FieldReportFinalizeService(
        run_repository=runs,
        report_repository=reports,
        visit_report_service=visit_service,
        steps=steps,
        email_service=StubFinalizeEmailService(),
        notifications_service=notifications_service,
        ai_service=StubFinalizeAiService(),
    )


@pytest.fixture(autouse=True)
def _enable_finalize_feature_flags(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_notifications_service.settings.FEATURE_FLAGS",
        FeatureFlags(
            enable_notifications=True,
            enable_automation=True,
            enable_ai_review=True,
            enable_email_delivery=True,
        ),
    )


def test_feature_flags_default_on_for_pilot() -> None:
    flags = FeatureFlags.from_env()
    assert flags.enable_notifications is True
    assert flags.enable_automation is True


def test_finalize_registers_n01_through_n09_after_email(
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _critical_closed_report()
    runs = FakeFinalizeRunRepository()
    tool = RecordingNotificationTool()
    queue = AutomationJobQueueService()
    service = _f4_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        notification_tool=tool,
        job_queue=queue,
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
        source_filename="visit.pdf",
    )

    run = runs.records[result.finalize_run_id]
    completed = run["steps_completed"]
    assert run["status"] == "COMPLETED"
    assert EXPECTED_NOTIFICATIONS_FINALIZE_STEPS <= set(completed)

    notification_start = completed.index("N01")
    assert completed[
        notification_start : notification_start + len(NOTIFICATIONS_FINALIZE_STEP_ORDER)
    ] == list(NOTIFICATIONS_FINALIZE_STEP_ORDER)

    summaries = (run.get("metadata") or {}).get("step_summaries") or {}
    assert summaries["N01"]["alerts_evaluated"] is True
    assert summaries["N01"]["critical_new_issue_count"] >= 1
    assert summaries["N05"]["automation_triggered"] is True
    assert summaries["N05"]["workflow_type"] == "FIELD_REPORT_FINALIZED"
    assert summaries["N06"]["job_id"]
    assert queue.list_items(status="QUEUED")


def test_finalize_notification_steps_run_after_email_not_before(
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _critical_closed_report()
    runs = FakeFinalizeRunRepository()
    service = _f4_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    completed = runs.records[result.finalize_run_id]["steps_completed"]
    email_index = completed.index("E01")
    n01_index = completed.index("N01")
    assert email_index < n01_index


def test_finalize_skips_notification_steps_when_flags_off(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_notifications_service.settings.FEATURE_FLAGS",
        FeatureFlags(
            enable_notifications=False,
            enable_automation=False,
            enable_ai_review=True,
            enable_email_delivery=True,
        ),
    )
    reports, lines, issues, events = _critical_closed_report()
    runs = FakeFinalizeRunRepository()
    service = _f4_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    summaries = (
        runs.records[result.finalize_run_id]
        .get("metadata", {})
        .get("step_summaries", {})
    )
    assert summaries["N01"]["status"] == "SKIPPED"
    assert summaries["N05"]["status"] == "SKIPPED"
    assert summaries["N06"]["status"] == "SKIPPED"


def test_critical_new_issue_alert_uses_notification_tool(
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _critical_closed_report()
    runs = FakeFinalizeRunRepository()
    tool = RecordingNotificationTool()
    service = _f4_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        notification_tool=tool,
    )

    service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    assert tool.built_payloads
    assert tool.reminders_sent
    assert any(
        "ליקוי קריטי חדש" in str(payload.get("subject") or "")
        for payload in tool.built_payloads
    )


def test_automation_rules_engine_field_report_finalized() -> None:
    engine = AutomationRulesEngine()
    result = engine.evaluate(
        "FIELD_REPORT_FINALIZED",
        {
            "organization_id": "org-1",
            "project_id": "project-1",
            "report_id": "report-1",
        },
    )
    assert result["should_execute"] is True
    assert result["actions"] == ["FIELD_REPORT_FINALIZE_SIDE_EFFECTS"]


def test_qc_notification_run_for_report_evaluates_per_report() -> None:
    issues = InMemoryQualityIssueRepository()
    created = issues.create(
        organization_id="org-1",
        project_id="project-1",
        request=qc_create_request(
            severity="CRITICAL",
            materialization_key="report-1:line-1",
        ),
    )
    tool = MagicMock(spec=NotificationTool)
    service = QcNotificationService(notification_tool=tool)
    service.critical_alert_service.issue_repository = issues

    result = service.run_for_report(
        organization_id="org-1",
        report_id="report-1",
        project_id="project-1",
        created_issue_ids=[str(created["id"])],
        send_email=False,
    )

    assert result.alerts_evaluated is True
    assert result.critical_new_issue_count == 1
