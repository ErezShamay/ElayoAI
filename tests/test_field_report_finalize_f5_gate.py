from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import pytest

from app.config.settings import FeatureFlags
from app.schemas.ai_interpretation import AIInterpretation
from app.schemas.quality_issue import IssueVisibility
from app.services.field_report_finalize_ai_service import (
    AI_FINALIZE_STEP_ORDER,
    EXPECTED_AI_FINALIZE_STEPS,
    FieldReportFinalizeAiService,
)
from app.services.field_report_finalize_email_service import (
    EMAIL_FINALIZE_STEP_ORDER,
)
from app.services.field_report_finalize_notifications_service import (
    NOTIFICATIONS_FINALIZE_STEP_ORDER,
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
from tests.field_report_finalize_test_support import (
    StubFinalizeEmailService,
    StubFinalizeNotificationsService,
)
from tests.quality_issues_test_support import (
    InMemoryQualityIssueEventRepository,
    InMemoryQualityIssueRepository,
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


class InMemoryAIInterpretationRepository:
    def __init__(self) -> None:
        self.records: list[dict[str, Any]] = []

    def create_interpretation(self, interpretation: AIInterpretation | dict) -> dict:
        if isinstance(interpretation, dict):
            payload = dict(interpretation)
        else:
            payload = interpretation.model_dump(exclude_none=True)
        payload.setdefault("id", f"ai-{len(self.records) + 1}")
        self.records.append(payload)
        return payload

    def get_pending_reviews(self) -> list[dict]:
        return [
            record
            for record in self.records
            if str(record.get("review_status") or "").upper() == "PENDING"
        ]


class StubFindingEnrichmentWorkflow:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self._delay_event: threading.Event | None = None

    def with_delay_until(self, event: threading.Event) -> StubFindingEnrichmentWorkflow:
        self._delay_event = event
        return self

    def execute(self, finding, model_name: str) -> AIInterpretation:
        if self._delay_event is not None:
            self._delay_event.wait(timeout=5)
        self.calls.append(
            {
                "finding_id": finding.id,
                "model_name": model_name,
                "summary": finding.summary,
            }
        )
        return AIInterpretation(
            finding_id=finding.id,
            model_name=model_name,
            business_impact="השפעה עסקית לבדיקה",
            tenant_risk="בינוני",
            recommended_action="לבצע תיקון",
            raw_response='{"business_impact":"השפעה עסקית לבדיקה"}',
            review_status="PENDING",
        )


class StubAIReviewService:
    def __init__(self, interpretation_repository: InMemoryAIInterpretationRepository):
        self.interpretation_repository = interpretation_repository

    def get_pending_reviews(self, organization_id: str | None = None) -> list[dict]:
        _ = organization_id
        return self.interpretation_repository.get_pending_reviews()


def _f5_finalize_service(
    *,
    reports: FakeVisitReportRepository,
    lines: FakeVisitReportLineRepository,
    issues: InMemoryQualityIssueRepository,
    events: InMemoryQualityIssueEventRepository,
    runs: FakeFinalizeRunRepository,
    pdf_root: Path,
    interpretation_repository: InMemoryAIInterpretationRepository,
    enrichment_workflow: StubFindingEnrichmentWorkflow | None = None,
    ai_run_inline: bool = True,
    background_runner=None,
) -> FieldReportFinalizeService:
    workflow = enrichment_workflow or StubFindingEnrichmentWorkflow()
    review_service = StubAIReviewService(interpretation_repository)
    ai_service = FieldReportFinalizeAiService(
        enrichment_workflow=workflow,
        review_service=review_service,
        interpretation_repository=interpretation_repository,
        issue_repository=issues,
        line_repository=lines,
        run_repository=runs,
        run_inline=ai_run_inline,
        background_runner=background_runner,
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
        project_repository=FinalizeProjectRepository(),
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
            project_repository=FinalizeProjectRepository(),
        ),
    )
    return FieldReportFinalizeService(
        run_repository=runs,
        report_repository=reports,
        visit_report_service=visit_service,
        steps=steps,
        email_service=StubFinalizeEmailService(),
        notifications_service=StubFinalizeNotificationsService(),
        ai_service=ai_service,
    )


@pytest.fixture(autouse=True)
def _enable_finalize_ai_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_ai_service.settings.FEATURE_FLAGS",
        FeatureFlags(
            enable_notifications=True,
            enable_automation=True,
            enable_ai_review=True,
            enable_email_delivery=True,
        ),
    )


def test_feature_ai_review_default_on_for_pilot() -> None:
    flags = FeatureFlags.from_env()
    assert flags.enable_ai_review is True


def test_finalize_registers_a01_through_a04_after_notifications(
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    interpretations = InMemoryAIInterpretationRepository()
    workflow = StubFindingEnrichmentWorkflow()
    service = _f5_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        interpretation_repository=interpretations,
        enrichment_workflow=workflow,
        ai_run_inline=True,
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    run = runs.records[result.finalize_run_id]
    completed = run["steps_completed"]
    assert run["status"] == "COMPLETED"
    assert EXPECTED_AI_FINALIZE_STEPS <= set(completed)

    prefix_len = completed.index("A01")
    assert completed[prefix_len : prefix_len + len(AI_FINALIZE_STEP_ORDER)] == list(
        AI_FINALIZE_STEP_ORDER
    )

    summaries = (run.get("metadata") or {}).get("step_summaries") or {}
    assert summaries["A01"]["enriched_count"] == 1
    assert summaries["A02"]["queued_count"] == 1
    assert summaries["A03"]["ai_logs_written"] == 1
    assert summaries["A04"]["prompt_version"] == "v1"
    assert len(interpretations.records) == 1
    assert interpretations.records[0]["review_status"] == "PENDING"
    assert workflow.calls


def test_finalize_email_dispatched_before_ai_completes(
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    interpretations = InMemoryAIInterpretationRepository()
    pending_jobs: list[tuple] = []

    def capture_runner(target, args, kwargs) -> None:
        pending_jobs.append((target, kwargs))

    workflow = StubFindingEnrichmentWorkflow()
    service = _f5_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        interpretation_repository=interpretations,
        enrichment_workflow=workflow,
        ai_run_inline=False,
        background_runner=capture_runner,
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    run = runs.records[result.finalize_run_id]
    assert run["email_status"] == "SENT"
    assert "E01" in run["steps_completed"]
    assert set(AI_FINALIZE_STEP_ORDER) <= set(run["steps_completed"])
    assert len(interpretations.records) == 0
    assert len(pending_jobs) == 1

    target, kwargs = pending_jobs[0]
    target(**kwargs)

    updated = runs.records[result.finalize_run_id]
    summaries = (updated.get("metadata") or {}).get("step_summaries") or {}
    assert summaries["A01"]["enriched_count"] == 1
    assert len(interpretations.records) == 1


def test_finalize_ai_steps_run_after_email_not_before(
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    interpretations = InMemoryAIInterpretationRepository()
    service = _f5_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        interpretation_repository=interpretations,
        ai_run_inline=True,
    )

    result = service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    completed = runs.records[result.finalize_run_id]["steps_completed"]
    email_index = completed.index("E01")
    a01_index = completed.index("A01")
    assert email_index < a01_index


def test_finalize_skips_ai_steps_when_flag_off(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.field_report_finalize_ai_service.settings.FEATURE_FLAGS",
        FeatureFlags(
            enable_notifications=True,
            enable_automation=True,
            enable_ai_review=False,
            enable_email_delivery=True,
        ),
    )
    reports, lines, issues, events = _closed_report_with_line()
    runs = FakeFinalizeRunRepository()
    interpretations = InMemoryAIInterpretationRepository()
    service = _f5_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=runs,
        pdf_root=tmp_path / "pdfs",
        interpretation_repository=interpretations,
        ai_run_inline=True,
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
    assert summaries["A01"]["status"] == "SKIPPED"
    assert summaries["A04"]["reason"] == "FEATURE_AI_REVIEW_OFF"
    assert interpretations.records == []
