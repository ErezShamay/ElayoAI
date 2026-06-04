from __future__ import annotations

from pathlib import Path

import pytest

from app.db.schema_registry import MIGRATION_SCRIPTS
from app.exceptions.exceptions import ConflictError, ValidationError
from app.lib.field_report_client_ids import (
    normalize_client_line_uuid,
    normalize_client_report_uuid,
)
from app.services.field_visit_report_service import FieldVisitReportService
from tests.test_field_visit_reports import (
    FakeProjectRepository,
    FakeVisitReportLinePhotoRepository,
    FakeVisitReportLineRepository,
    FakeVisitReportRepository,
)

CLIENT_REPORT_UUID = "a1111111-1111-4111-8111-111111111111"
CLIENT_LINE_UUID = "b2222222-2222-4222-8222-222222222222"
ORG_ID = "org-1"


def _service(
    *,
    reports: FakeVisitReportRepository | None = None,
    lines: FakeVisitReportLineRepository | None = None,
) -> FieldVisitReportService:
    return FieldVisitReportService(
        report_repository=reports or FakeVisitReportRepository(),
        line_repository=lines or FakeVisitReportLineRepository(),
        line_photo_repository=FakeVisitReportLinePhotoRepository(),
        project_repository=FakeProjectRepository(),
    )


def test_migration_sql_adds_client_uuid_columns():
    migration_path = (
        Path(__file__).resolve().parents[1]
        / "db/migrations/2026060304_field_visit_report_client_uuids.sql"
    )
    sql = migration_path.read_text(encoding="utf-8")

    assert "client_report_uuid" in sql
    assert "client_line_uuid" in sql
    assert "field_visit_reports_client_report_uuid_uniq" in sql
    assert "field_visit_report_lines_client_line_uuid_uniq" in sql


def test_migration_registered_in_schema_registry():
    entry = next(
        script
        for script in MIGRATION_SCRIPTS
        if script["version"] == "2026060304"
    )
    assert entry["name"] == "field_visit_report_client_uuids"
    assert "field_visit_reports" in entry["tables"]
    assert "field_visit_report_lines" in entry["tables"]


def test_normalize_client_uuids_accepts_valid_and_rejects_invalid():
    assert (
        normalize_client_report_uuid(CLIENT_REPORT_UUID)
        == CLIENT_REPORT_UUID
    )
    assert (
        normalize_client_line_uuid(CLIENT_LINE_UUID)
        == CLIENT_LINE_UUID
    )
    assert normalize_client_report_uuid(None) is None
    assert normalize_client_report_uuid("  ") is None

    with pytest.raises(ValidationError):
        normalize_client_report_uuid("not-a-uuid")


def test_create_report_persists_client_report_uuid():
    reports = FakeVisitReportRepository()
    service = _service(reports=reports)

    created = service.create_report(
        organization_id=ORG_ID,
        actor_profile_id="supervisor-1",
        project_id="project-1",
        visit_type="STRUCTURE_SITE",
        visit_date="2026-06-03",
        client_report_uuid=CLIENT_REPORT_UUID,
        snapshot_organization_profile=False,
    )

    assert created["client_report_uuid"] == CLIENT_REPORT_UUID
    stored = reports.get_by_client_report_uuid(CLIENT_REPORT_UUID)
    assert stored is not None
    assert str(stored["id"]) == created["id"]


def test_create_report_rejects_duplicate_client_report_uuid():
    reports = FakeVisitReportRepository()
    reports.create(
        organization_id=ORG_ID,
        project_id="project-1",
        created_by_profile_id="supervisor-1",
        visit_type="STRUCTURE_SITE",
        visit_date="2026-06-03",
        status="CLOSED",
        client_report_uuid=CLIENT_REPORT_UUID,
    )
    service = _service(reports=reports)

    with pytest.raises(ConflictError):
        service.create_report(
            organization_id=ORG_ID,
            actor_profile_id="supervisor-1",
            project_id="project-1",
            visit_type="STRUCTURE_SITE",
            visit_date="2026-06-04",
            client_report_uuid=CLIENT_REPORT_UUID,
            snapshot_organization_profile=False,
        )


def test_create_line_persists_client_line_uuid():
    reports = FakeVisitReportRepository()
    lines = FakeVisitReportLineRepository()
    report = reports.create(
        organization_id=ORG_ID,
        project_id="project-1",
        created_by_profile_id="supervisor-1",
        visit_type="STRUCTURE_SITE",
        visit_date="2026-06-03",
    )
    service = _service(reports=reports, lines=lines)

    line = service.create_line(
        organization_id=ORG_ID,
        report_id=str(report["id"]),
        payload={
            "description": "ממצא",
            "client_line_uuid": CLIENT_LINE_UUID,
        },
    )

    assert line["client_line_uuid"] == CLIENT_LINE_UUID
    stored = lines.get_by_client_line_uuid(CLIENT_LINE_UUID)
    assert stored is not None
    assert str(stored["id"]) == line["id"]
