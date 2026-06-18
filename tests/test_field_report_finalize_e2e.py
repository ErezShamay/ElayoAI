"""Gate F7 — E2E finalize pipeline (§17)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth.jwt_service import JWTService
from app.config.settings import FeatureFlags
from app.schemas.quality_issue import IssueVisibility
from app.services.field_report_finalize_registry import (
    EXPECTED_FINALIZE_COMPONENTS,
)
from tests.test_field_report_finalize_coverage_gate import (
    _full_stack_finalize_service,
)
from tests.test_field_report_finalize_email_gate import RecordingResendSender
from tests.test_field_report_finalize_f1_gate import (
    FakeFinalizeRunRepository,
    FAKE_PDF,
)
from tests.test_field_report_finalize_f2_gate import (
    _closed_report_with_line,
    _finalize_service,
    _setup_client,
)
from tests.test_field_visit_reports import (
    _headers,
)


def _token(
    *,
    user_id: str = "supervisor-1",
    org_id: str = "org-1",
    role: str = "SUPERVISOR",
) -> str:
    return JWTService().issue_access_token(
        user_id=user_id,
        org_id=org_id,
        role=role,
        token_id="t-finalize-e2e",
    )


def _published_issues_for_group(
    issues,
    *,
    group_key: str,
) -> list[dict]:
    return [
        issue
        for issue in issues.records.values()
        if str(issue.get("visibility") or "") == IssueVisibility.PUBLISHED.value
        and str(issue.get("group_key") or "") == group_key
    ]


def _published_lines_for_group(
    lines,
    *,
    report_id: str,
    group_key: str,
) -> list[dict]:
    return [
        line
        for line in lines.list_by_report(report_id)
        if str(line.get("visibility") or "") == IssueVisibility.PUBLISHED.value
        and str(line.get("group_key") or "") == group_key
    ]


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


def test_finalize_e2e_supervisor_flow_through_full_pipeline(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    """§17 E2E: close → PDF → finalize → portal + email + coverage."""
    reports, lines, issues, events = _closed_report_with_line()
    sender = RecordingResendSender()
    service = _full_stack_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=FakeFinalizeRunRepository(),
        pdf_root=tmp_path / "pdfs",
        resend_sender=sender,
    )
    client = _setup_client(monkeypatch, finalize_service=service)

    response = client.post(
        "/field-reports/visits/report-1/finalize",
        headers=_headers(_token(role="SUPERVISOR")),
        files={"file": ("visit.pdf", FAKE_PDF, "application/pdf")},
    )
    assert response.status_code == 202

    status = client.get(
        "/field-reports/visits/report-1/finalize-status",
        headers=_headers(_token(role="SUPERVISOR")),
    )
    assert status.status_code == 200
    payload = status.json()
    assert payload["status"] == "FINALIZED"

    finalize_run = payload["finalize_run"]
    assert finalize_run["status"] == "COMPLETED"
    assert EXPECTED_FINALIZE_COMPONENTS <= set(
        finalize_run["steps_completed"]
    )
    assert finalize_run["materialization"]["created_count"] == 1

    report = reports.records["report-1"]
    assert report.get("pdf_storage_path")
    published_line = lines.list_by_report("report-1")[0]
    assert published_line["visibility"] == IssueVisibility.PUBLISHED.value
    assert len(issues.records) == 1

    assert _published_lines_for_group(
        lines,
        report_id="report-1",
        group_key="apartment:3",
    )
    assert _published_issues_for_group(issues, group_key="apartment:3")

    assert len(sender.calls) == 1
    email_payload = sender.calls[0]
    assert email_payload["to"] == [
        "resident3@example.com",
        "developer@example.com",
    ]
    assert email_payload["attachments"][0]["filename"] == "visit.pdf"


def test_finalize_e2e_rejects_in_progress_report(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    reports.records["report-1"]["status"] = "IN_PROGRESS"
    service = _finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        pdf_root=tmp_path / "pdfs",
    )
    client = _setup_client(monkeypatch, finalize_service=service)

    response = client.post(
        "/field-reports/visits/report-1/finalize",
        headers=_headers(_token(role="SUPERVISOR")),
        files={"file": ("visit.pdf", FAKE_PDF, "application/pdf")},
    )
    assert response.status_code == 409


def test_finalize_e2e_rejects_missing_pdf(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    service = _finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        pdf_root=tmp_path / "pdfs",
    )
    client = _setup_client(monkeypatch, finalize_service=service)

    response = client.post(
        "/field-reports/visits/report-1/finalize",
        headers=_headers(_token(role="SUPERVISOR")),
        files={"file": ("visit.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 400


def test_finalize_e2e_resident_does_not_see_draft_before_finalize(
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    assert not _published_lines_for_group(
        lines,
        report_id="report-1",
        group_key="apartment:3",
    )
    assert _published_issues_for_group(issues, group_key="apartment:3") == []

    service = _full_stack_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=FakeFinalizeRunRepository(),
        pdf_root=tmp_path / "pdfs",
        resend_sender=RecordingResendSender(),
    )
    service.start_finalize(
        organization_id="org-1",
        report_id="report-1",
        actor_id="supervisor-1",
        source_content=FAKE_PDF,
    )

    assert _published_lines_for_group(
        lines,
        report_id="report-1",
        group_key="apartment:3",
    )
    assert _published_issues_for_group(issues, group_key="apartment:3")


def test_finalize_e2e_core_failure_does_not_send_email(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    sender = RecordingResendSender()

    class FailingSteps:
        def run_core_steps(self, ctx):
            raise RuntimeError("core step failed")

    service = _full_stack_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=FakeFinalizeRunRepository(),
        pdf_root=tmp_path / "pdfs",
        resend_sender=sender,
    )
    service.steps = FailingSteps()  # type: ignore[assignment]
    client = _setup_client(monkeypatch, finalize_service=service)

    response = client.post(
        "/field-reports/visits/report-1/finalize",
        headers=_headers(_token(role="SUPERVISOR")),
        files={"file": ("visit.pdf", FAKE_PDF, "application/pdf")},
    )
    assert response.status_code == 202

    status = client.get(
        "/field-reports/visits/report-1/finalize-status",
        headers=_headers(_token(role="SUPERVISOR")),
    )
    payload = status.json()
    assert payload["status"] == "FINALIZE_FAILED"
    assert payload["finalize_run"]["status"] == "FAILED"
    assert not sender.calls
    assert "E01" not in payload["finalize_run"]["steps_completed"]


def test_finalize_e2e_idempotent_on_finalized_report(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    reports, lines, issues, events = _closed_report_with_line()
    service = _full_stack_finalize_service(
        reports=reports,
        lines=lines,
        issues=issues,
        events=events,
        runs=FakeFinalizeRunRepository(),
        pdf_root=tmp_path / "pdfs",
        resend_sender=RecordingResendSender(),
    )
    client = _setup_client(monkeypatch, finalize_service=service)
    headers = _headers(_token(role="SUPERVISOR"))
    files = {"file": ("visit.pdf", FAKE_PDF, "application/pdf")}

    first = client.post(
        "/field-reports/visits/report-1/finalize",
        headers=headers,
        files=files,
    )
    second = client.post(
        "/field-reports/visits/report-1/finalize",
        headers=headers,
        files=files,
    )

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["finalize_run_id"] == second.json()["finalize_run_id"]
    assert len(issues.records) == 1
