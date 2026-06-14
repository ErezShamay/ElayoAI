"""Portfolio KPI helpers — published-only regression (Gate F→G)."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.schemas.quality_issue import IssueVisibility, QualityPortfolioProjectSummary
from app.services.quality_issue_portfolio_kpi import (
    filter_published_portfolio_issues,
    is_published_portfolio_issue,
    rank_portfolio_projects_by_supervision_pressure,
    resolve_latest_published_report_at,
)
from app.services.quality_issue_service import QualityIssueService
from tests.quality_issues_test_support import (
    FakeFieldVisitReportRepository,
    FakeProjectRepository,
    InMemoryQualityIssueEventRepository,
    InMemoryQualityIssueRepository,
    qc_create_request,
    qc_published_create_request,
)


def test_is_published_portfolio_issue() -> None:
    assert is_published_portfolio_issue(
        {"visibility": IssueVisibility.PUBLISHED.value}
    )
    assert not is_published_portfolio_issue(
        {"visibility": IssueVisibility.DRAFT.value}
    )
    assert not is_published_portfolio_issue({})


def test_filter_published_portfolio_issues() -> None:
    filtered = filter_published_portfolio_issues(
        [
            {"visibility": IssueVisibility.PUBLISHED.value, "status": "OPEN"},
            {"visibility": IssueVisibility.DRAFT.value, "status": "OPEN"},
        ]
    )

    assert len(filtered) == 1
    assert filtered[0]["visibility"] == IssueVisibility.PUBLISHED.value


def test_resolve_latest_published_report_at() -> None:
    latest = resolve_latest_published_report_at(
        [
            {
                "visit_date": "2026-06-01",
                "locked_at": "2026-06-02T10:00:00+00:00",
            },
            {
                "visit_date": "2026-06-10",
                "closed_at": "2026-06-11T08:00:00+00:00",
            },
        ]
    )

    assert latest == datetime(2026, 6, 11, 8, 0, tzinfo=UTC)


def test_rank_portfolio_projects_by_supervision_pressure() -> None:
    ranked = rank_portfolio_projects_by_supervision_pressure(
        [
            QualityPortfolioProjectSummary(
                project_id="proj-a",
                open_total=1,
                open_critical=0,
            ),
            QualityPortfolioProjectSummary(
                project_id="proj-b",
                open_total=2,
                open_critical=1,
            ),
        ]
    )

    assert ranked[0].project_id == "proj-b"


@pytest.fixture
def portfolio_service() -> QualityIssueService:
    return QualityIssueService(
        issue_repository=InMemoryQualityIssueRepository(),
        event_repository=InMemoryQualityIssueEventRepository(),
        project_repository=FakeProjectRepository(),
        report_repository=FakeFieldVisitReportRepository(),
    )


def test_portfolio_summary_excludes_draft_issues(
    portfolio_service: QualityIssueService,
) -> None:
    service = portfolio_service

    service.create_issue(
        organization_id="org-1",
        project_id="proj-1",
        request=qc_published_create_request(
            title="published",
            materialization_key="k-published",
        ),
        actor_role="SUPERVISOR",
    )
    service.create_issue(
        organization_id="org-1",
        project_id="proj-1",
        request=qc_create_request(
            title="draft",
            visibility=IssueVisibility.DRAFT,
            materialization_key="k-draft",
        ),
        actor_role="SUPERVISOR",
    )

    summary = service.get_portfolio_quality_summary(
        organization_id="org-1",
        actor_role="SUPERVISOR",
    )

    assert summary.total_open == 1
    assert summary.projects[0].open_total == 1
