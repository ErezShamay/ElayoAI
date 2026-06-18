"""Gate F7 — coverage gate: every §9 component ID appears in finalize run log."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.config.settings import FeatureFlags
from app.services.field_report_finalize_registry import (
    EXPECTED_FINALIZE_COMPONENTS,
    FINALIZE_STEP_EXECUTION_ORDER,
    INFRASTRUCTURE_POST_STEP_ORDER,
    INFRASTRUCTURE_PRE_STEP_ORDER,
)
from app.services.field_report_finalize_service import (
    FieldReportFinalizeService,
)
from app.services.field_report_finalize_email_service import (
    EMAIL_FINALIZE_STEP_ORDER,
    FieldReportFinalizeEmailService,
)
from app.services.field_report_finalize_ai_service import AI_FINALIZE_STEP_ORDER
from app.services.automation_job_queue_service import AutomationJobQueueService
from app.services.automation_rules_engine import AutomationRulesEngine
from app.services.field_report_finalize_notifications_service import (
    NOTIFICATIONS_FINALIZE_STEP_ORDER,
    FieldReportFinalizeNotificationsService,
)
from app.services.field_report_finalize_steps import (
    CORE_FINALIZE_STEP_ORDER,
    FieldReportFinalizeSteps,
)
from app.services.field_visit_report_pdf_service import FieldVisitReportPdfService
from app.services.field_visit_report_service import FieldVisitReportService
from app.services.notification_service import NotificationService
from app.services.qc_notification_service import QcNotificationService
from app.services.quality_issue_materialization_service import (
    QualityIssueMaterializationService,
)
from app.services.resident_portal_service import ResidentPortalService
from app.services.workspace_activity_service import WorkspaceActivityService
from tests.field_report_finalize_test_support import (
    StubFinalizeAiService,
)
from tests.quality_issues_test_support import (
    InMemoryQualityIssueEventRepository,
    InMemoryQualityIssueRepository,
)
from tests.test_field_report_finalize_email_gate import (
    FakeProjectApartmentRepository,
    FinalizeProjectWithStakeholderEmails,
    RecordingResendSender,
)
from tests.test_field_report_finalize_f1_gate import (
    FakeFinalizeRunRepository,
    FAKE_PDF,
)
from tests.test_field_report_finalize_f2_gate import (
    FinalizeProjectRepository,
    _closed_report_with_line,
)
from tests.test_field_report_finalize_f4_gate import RecordingNotificationTool
from tests.test_supervisor_project_scope import FakeProfileRepository
from tests.test_field_visit_reports import (
    FakeVisitReportLinePhotoRepository,
    FakeVisitReportLineRepository,
    FakeVisitReportRepository,
)


EXPECTED_FINALIZE_COMPONENTS_LIST = [
    "C01",
    "C02",
    "C03",
    "C04",
    "C05",
    "C06",
    "C07",
    "C08",
    "C09",
    "C10",
    "C11",
    "C12",
    "C13",
    "C14",
    "N01",
    "N02",
    "N03",
    "N04",
    "N05",
    "N06",
    "N07",
    "N08",
    "N09",
    "A01",
    "A02",
    "A03",
    "A04",
    "E01",
    "E02",
    "E03",
    "E04",
    "E05",
    "T01",
    "T02",
    "T03",
    "T04",
    "T05",
    "T06",
]


def test_expected_finalize_components_match_spec_registry() -> None:
    assert set(EXPECTED_FINALIZE_COMPONENTS_LIST) == set(
        EXPECTED_FINALIZE_COMPONENTS
    )


def test_finalize_step_execution_order_includes_all_components() -> None:
    assert set(FINALIZE_STEP_EXECUTION_ORDER) == EXPECTED_FINALIZE_COMPONENTS
    pre_end = len(INFRASTRUCTURE_PRE_STEP_ORDER)
    core_end = pre_end + len(CORE_FINALIZE_STEP_ORDER)
    email_end = core_end + len(EMAIL_FINALIZE_STEP_ORDER)
    notifications_end = email_end + len(NOTIFICATIONS_FINALIZE_STEP_ORDER)
    ai_end = notifications_end + len(AI_FINALIZE_STEP_ORDER)

    assert FINALIZE_STEP_EXECUTION_ORDER[:pre_end] == INFRASTRUCTURE_PRE_STEP_ORDER
    assert list(FINALIZE_STEP_EXECUTION_ORDER[pre_end:core_end]) == list(
        CORE_FINALIZE_STEP_ORDER
    )
    assert list(FINALIZE_STEP_EXECUTION_ORDER[core_end:email_end]) == list(
        EMAIL_FINALIZE_STEP_ORDER
    )
    assert list(
        FINALIZE_STEP_EXECUTION_ORDER[email_end:notifications_end]
    ) == list(NOTIFICATIONS_FINALIZE_STEP_ORDER)
    assert list(
        FINALIZE_STEP_EXECUTION_ORDER[notifications_end:ai_end]
    ) == list(AI_FINALIZE_STEP_ORDER)
    assert list(FINALIZE_STEP_EXECUTION_ORDER[ai_end:]) == list(
        INFRASTRUCTURE_POST_STEP_ORDER
    )


def _full_stack_finalize_service(
    *,
    reports: FakeVisitReportRepository,
    lines: FakeVisitReportLineRepository,
    issues: InMemoryQualityIssueRepository,
    events: InMemoryQualityIssueEventRepository,
    runs: FakeFinalizeRunRepository,
    pdf_root: Path,
    resend_sender: RecordingResendSender,
) -> FieldReportFinalizeService:
    project_repo = FinalizeProjectWithStakeholderEmails()
    tool = RecordingNotificationTool()
    queue = AutomationJobQueueService()
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
        notifications_service=notifications_service,
        ai_service=StubFinalizeAiService(),
    )


@pytest.fixture(autouse=True)
def _enable_finalize_feature_flags(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_email_service.settings.RESEND_API_KEY",
        "test-key",
    )
    monkeypatch.setattr(
        "app.services.field_report_finalize_notifications_service.settings.FEATURE_FLAGS",
        FeatureFlags(
            enable_notifications=True,
            enable_automation=True,
            enable_ai_review=True,
            enable_email_delivery=True,
        ),
    )


def test_finalize_run_touches_all_registered_components(
    tmp_path: Path,
) -> None:
    """כל רכיב ב-registry חייב להופיע ב-finalize run log."""
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    service = _full_stack_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        resend_sender=RecordingResendSender(),
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
        source_filename="visit.pdf",
    )

    run = runs.records[result.finalize_run_id]
    completed = set(run["steps_completed"])
    missing = EXPECTED_FINALIZE_COMPONENTS - completed
    assert not missing, f"Missing finalize components: {sorted(missing)}"
    assert run["status"] == "COMPLETED"

    summaries = (run.get("metadata") or {}).get("step_summaries") or {}
    for component_id in EXPECTED_FINALIZE_COMPONENTS:
        assert component_id in summaries, (
            f"Missing step summary for {component_id}"
        )
