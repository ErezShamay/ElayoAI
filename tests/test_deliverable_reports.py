from __future__ import annotations

from datetime import date

import pytest

from app.exceptions.exceptions import ForbiddenError, ValidationError
from app.services.deliverable_report_classification import (
    classify_deliverable_report,
)
from app.services.deliverable_reports_service import DeliverableReportsService


class FakeProjectRepository:
    def get_projects_by_organization(self, organization_id: str):
        return [
            {
                "id": "p1",
                "project_name": "מגדלי הצפון",
                "status": "ACTIVE",
            },
            {
                "id": "p2",
                "project_name": "פארק הים",
                "status": "ACTIVE",
            },
        ]


class FakeFieldVisitReportRepository:
    def is_storage_available(self) -> bool:
        return True

    def list_pdf_deliverables_by_organization(self, organization_id: str):
        return [
            {
                "id": "fv-1",
                "project_id": "p1",
                "visit_type": "STRUCTURE_SITE",
                "status": "LOCKED",
                "locked_at": "2026-06-02T10:00:00+00:00",
                "closed_at": None,
                "visit_date": "2026-06-01",
                "pdf_filename": "weekly-report-p1.pdf",
                "pdf_storage_path": "org/p1/fv-1.pdf",
                "created_at": "2026-06-01T08:00:00+00:00",
            },
            {
                "id": "fv-published",
                "project_id": "p1",
                "visit_type": "STRUCTURE_SITE",
                "status": "CLOSED",
                "locked_at": None,
                "closed_at": "2026-06-11T09:00:00+00:00",
                "visit_date": "2026-06-10",
                "pdf_filename": "דוח-מפקח-פרסום.pdf",
                "pdf_storage_path": "org/p1/fv-published.pdf",
                "created_at": "2026-06-10T08:00:00+00:00",
            },
            {
                "id": "fv-2",
                "project_id": "p1",
                "visit_type": "FINISHING_APARTMENTS",
                "status": "LOCKED",
                "locked_at": "2026-06-10T12:00:00+00:00",
                "closed_at": None,
                "visit_date": "2026-06-09",
                "pdf_filename": "פרוטוקול מסירה דירה 12.pdf",
                "pdf_storage_path": "org/p1/fv-2.pdf",
                "created_at": "2026-06-09T08:00:00+00:00",
            },
            {
                "id": "fv-3",
                "project_id": "p2",
                "visit_type": "MIXED",
                "status": "LOCKED",
                "locked_at": "2026-06-03T12:00:00+00:00",
                "closed_at": None,
                "visit_date": "2026-06-03",
                "pdf_filename": "דוח שבועי פארק הים.pdf",
                "pdf_storage_path": "org/p2/fv-3.pdf",
                "created_at": "2026-06-03T08:00:00+00:00",
            },
        ]

    def list_by_organization(self, organization_id: str, *, status: str | None = None):
        return self.list_pdf_deliverables_by_organization(organization_id)


class FakeWeeklyReportRepository:
    def list_by_project_ids(self, project_ids: list[str]):
        return [
            {
                "id": "wr-1",
                "project_id": "p2",
                "email_subject": "דוח שנת בדק 2025",
                "reported_at": "2026-06-08",
                "created_at": "2026-06-08T08:00:00+00:00",
            }
        ]


def test_classify_deliverable_report_keywords():
    assert classify_deliverable_report(title="פרוטוקול מסירה דירה 3") == (
        "handover_protocol"
    )
    assert classify_deliverable_report(title="דוח שנת בדק 2025") == "annual_bedek"
    assert classify_deliverable_report(title="בדק בית דירה 7") == "home_bedek"
    assert classify_deliverable_report(title="דוח שבועי 23") == "weekly"
    assert classify_deliverable_report(
        title="site visit",
        default_weekly=True,
    ) == "weekly"


def test_deliverable_reports_dashboard_aggregates_and_compliance():
    service = DeliverableReportsService(
        project_repository=FakeProjectRepository(),
        field_visit_report_repository=FakeFieldVisitReportRepository(),
        weekly_report_repository=FakeWeeklyReportRepository(),
    )

    payload = service.get_dashboard(
        organization_id="org-1",
        actor_role="SUPERVISOR",
        period_start=date(2026, 6, 1),
        period_end=date(2026, 6, 15),
    )

    assert payload.total_deliverables == 5
    assert payload.by_type[0].report_type == "weekly"
    assert payload.by_type[0].count == 3
    assert payload.by_type[1].count == 1
    assert payload.by_type[2].count == 1

    missing = {
        (cell.project_id, cell.iso_year, cell.iso_week)
        for cell in payload.missing_weekly_reports
    }
    assert ("p1", 2026, 23) not in missing
    assert ("p2", 2026, 23) not in missing
    assert ("p1", 2026, 24) not in missing
    assert ("p1", 2026, 25) in missing
    assert ("p2", 2026, 24) in missing
    assert payload.weekly_compliance.total_missing >= 2


def test_deliverable_reports_includes_published_closed_visit_with_pdf() -> None:
    service = DeliverableReportsService(
        project_repository=FakeProjectRepository(),
        field_visit_report_repository=FakeFieldVisitReportRepository(),
        weekly_report_repository=FakeWeeklyReportRepository(),
    )

    payload = service.get_dashboard(
        organization_id="org-1",
        actor_role="ADMIN",
        period_start=date(2026, 6, 1),
        period_end=date(2026, 6, 15),
    )

    published = next(
        item for item in payload.reports if item.id == "fv-published"
    )
    assert published.origin == "field_visit"
    assert published.title == "דוח-מפקח-פרסום.pdf"
    assert published.sent_date == date(2026, 6, 11)


def test_deliverable_reports_requires_permission():
    service = DeliverableReportsService(
        project_repository=FakeProjectRepository(),
        field_visit_report_repository=FakeFieldVisitReportRepository(),
        weekly_report_repository=FakeWeeklyReportRepository(),
    )

    with pytest.raises(ForbiddenError):
        service.get_dashboard(
            organization_id="org-1",
            actor_role="CONTRACTOR",
            period_start=date(2026, 6, 1),
            period_end=date(2026, 6, 15),
        )


def test_deliverable_reports_rejects_invalid_range():
    service = DeliverableReportsService(
        project_repository=FakeProjectRepository(),
        field_visit_report_repository=FakeFieldVisitReportRepository(),
        weekly_report_repository=FakeWeeklyReportRepository(),
    )

    with pytest.raises(ValidationError):
        service.get_dashboard(
            organization_id="org-1",
            actor_role="SUPERVISOR",
            period_start=date(2026, 6, 15),
            period_end=date(2026, 6, 1),
        )
