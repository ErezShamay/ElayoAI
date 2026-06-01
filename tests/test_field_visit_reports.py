from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.auth.jwt_service import JWTService
from app.services.field_report_module_service import (
    FieldReportModuleService,
)
from app.services.field_report_organization_profile_service import (
    FieldReportOrganizationProfileService,
)
from app.services.field_visit_report_service import (
    FieldVisitReportService,
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
        token_id="t-visit-1",
    )


def _headers(token: str, org_id: str = "org-1") -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "X-Organization-ID": org_id,
    }


class FakeVisitReportLineRepository:
    def __init__(self) -> None:
        self.records: dict[str, dict] = {}
        self._counter = 0

    def is_storage_available(self) -> bool:
        return True

    def list_by_report(self, report_id: str) -> list[dict]:
        lines = [
            record
            for record in self.records.values()
            if record["report_id"] == report_id
        ]
        return sorted(lines, key=lambda line: line["sort_order"])

    def get_by_id(self, line_id: str) -> dict | None:
        return self.records.get(line_id)

    def next_sort_order(self, report_id: str) -> int:
        lines = self.list_by_report(report_id)
        if not lines:
            return 0
        return max(int(line["sort_order"]) for line in lines) + 1

    def create(self, payload: dict) -> dict:
        self._counter += 1
        line_id = f"line-{self._counter}"
        record = {"id": line_id, **payload}
        self.records[line_id] = record
        return record

    def update(self, line_id: str, payload: dict) -> dict | None:
        record = self.records.get(line_id)
        if not record:
            return None
        record.update(payload)
        return record

    def delete(self, line_id: str) -> bool:
        return self.records.pop(line_id, None) is not None


class FakeVisitReportRepository:
    def __init__(self) -> None:
        self.records: dict[str, dict] = {}
        self._counter = 0

    def is_storage_available(self) -> bool:
        return True

    def list_by_organization(
        self,
        organization_id: str,
        *,
        status: str | None = None,
    ) -> list[dict]:
        items = [
            record
            for record in self.records.values()
            if record["organization_id"] == organization_id
        ]

        if status:
            items = [
                record for record in items if record["status"] == status
            ]

        return sorted(
            items,
            key=lambda record: record["updated_at"],
            reverse=True,
        )

    def get_by_id(self, report_id: str) -> dict | None:
        return self.records.get(report_id)

    def get_open_for_project(
        self,
        *,
        organization_id: str,
        project_id: str,
    ) -> dict | None:
        for record in self.records.values():
            if (
                record["organization_id"] == organization_id
                and record["project_id"] == project_id
                and record["status"] == "IN_PROGRESS"
            ):
                return record
        return None

    def create(self, **kwargs) -> dict:
        self._counter += 1
        report_id = f"report-{self._counter}"
        record = {
            "id": report_id,
            "status": "IN_PROGRESS",
            "updated_at": "2026-06-01T12:00:00+00:00",
            "created_at": "2026-06-01T12:00:00+00:00",
            **kwargs,
        }
        self.records[report_id] = record
        return record

    def update(self, report_id: str, payload: dict) -> dict | None:
        record = self.records.get(report_id)
        if not record:
            return None
        record.update(payload)
        return record


class FakeProjectRepository:
    def get_project_by_id(self, project_id: str) -> dict | None:
        if project_id == "missing":
            return None
        return {
            "id": project_id,
            "organization_id": "org-1",
            "project_name": "פרויקט בדיקה",
        }

    def get_projects_by_organization(
        self,
        organization_id: str,
    ) -> list[dict]:
        return [
            {
                "id": "project-1",
                "organization_id": organization_id,
                "project_name": "פרויקט בדיקה",
            }
        ]


class FakeModuleRepository:
    def __init__(self) -> None:
        self.records: dict[str, dict] = {
            "org-1": {
                "organization_id": "org-1",
                "is_enabled": True,
            }
        }

    def is_storage_available(self) -> bool:
        return True

    def get_by_organization_id(self, organization_id: str) -> dict | None:
        return self.records.get(organization_id)

    def list_all(self) -> list[dict]:
        return list(self.records.values())

    def upsert_status(self, **kwargs) -> dict:
        org_id = kwargs["organization_id"]
        self.records[org_id] = kwargs
        return kwargs


class FakeOrganizationRepository:
    def get_by_id(self, organization_id: str) -> dict | None:
        return {
            "id": organization_id,
            "organization_name": "Org",
        }


def _setup_client(monkeypatch) -> TestClient:
    module_service = FieldReportModuleService(
        module_repository=FakeModuleRepository(),
        organization_repository=FakeOrganizationRepository(),
    )
    organization_profile_service = FieldReportOrganizationProfileService(
        organization_repository=FakeOrganizationRepository(),
        module_service=module_service,
    )
    visit_service = FieldVisitReportService(
        report_repository=FakeVisitReportRepository(),
        line_repository=FakeVisitReportLineRepository(),
        project_repository=FakeProjectRepository(),
        organization_profile_service=organization_profile_service,
    )

    monkeypatch.setattr(
        "app.main.field_report_module_service",
        module_service,
    )
    monkeypatch.setattr(
        "app.main.field_visit_report_service",
        visit_service,
    )
    monkeypatch.setattr(
        "app.main.project_repository",
        FakeProjectRepository(),
    )

    app.state.field_report_module_service = module_service

    return TestClient(app)


def test_visit_types_and_create_list(monkeypatch):
    client = _setup_client(monkeypatch)
    token = _token()

    types_response = client.get(
        "/field-reports/visit-types",
        headers=_headers(token),
    )
    assert types_response.status_code == 200
    types = types_response.json()["visit_types"]
    assert len(types) == 2
    codes = {item["code"] for item in types}
    assert codes == {"STRUCTURE_SITE", "FINISHING_APARTMENTS"}

    create_response = client.post(
        "/field-reports/visits",
        headers=_headers(token),
        json={
            "project_id": "project-1",
            "visit_type": "STRUCTURE_SITE",
            "visit_date": "2026-06-01",
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["status"] == "IN_PROGRESS"
    assert created["visit_type_label_he"] == "שלד / אתר"

    duplicate_response = client.post(
        "/field-reports/visits",
        headers=_headers(token),
        json={
            "project_id": "project-1",
            "visit_type": "FINISHING_APARTMENTS",
            "visit_date": "2026-06-02",
        },
    )
    assert duplicate_response.status_code == 409

    list_response = client.get(
        "/field-reports/visits",
        headers=_headers(token),
    )
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1


def test_viewer_cannot_create_visit_report(monkeypatch):
    client = _setup_client(monkeypatch)
    token = _token(role="VIEWER")

    response = client.post(
        "/field-reports/visits",
        headers=_headers(token),
        json={
            "project_id": "project-1",
            "visit_type": "STRUCTURE_SITE",
            "visit_date": "2026-06-01",
        },
    )
    assert response.status_code == 403


def test_create_line_from_catalog_and_free_text(monkeypatch):
    client = _setup_client(monkeypatch)
    token = _token()

    create_response = client.post(
        "/field-reports/visits",
        headers=_headers(token),
        json={
            "project_id": "project-1",
            "visit_type": "STRUCTURE_SITE",
            "visit_date": "2026-06-01",
        },
    )
    report_id = create_response.json()["id"]

    catalog_line = client.post(
        f"/field-reports/visits/{report_id}/lines",
        headers=_headers(token),
        json={"issue_id": "STR-02-001"},
    )
    assert catalog_line.status_code == 200
    catalog_payload = catalog_line.json()
    assert catalog_payload["issue_id"] == "STR-02-001"
    assert catalog_payload["standard_ref"]
    assert catalog_payload["has_catalog_issue"] is True

    free_line = client.post(
        f"/field-reports/visits/{report_id}/lines",
        headers=_headers(token),
        json={
            "description": "ממצא חופשי לבדיקה",
            "location": "קומה 3",
        },
    )
    assert free_line.status_code == 200
    assert free_line.json()["issue_id"] is None

    detail = client.get(
        f"/field-reports/visits/{report_id}",
        headers=_headers(token),
    )
    assert detail.status_code == 200
    assert detail.json()["line_count"] == 2


def test_catalog_endpoint_filters_structure_site(monkeypatch):
    client = _setup_client(monkeypatch)
    token = _token()

    response = client.get(
        "/field-reports/catalog?visit_type=STRUCTURE_SITE",
        headers=_headers(token),
    )
    assert response.status_code == 200
    payload = response.json()
    families = {issue["top_family"] for issue in payload["issues"]}
    assert "STRUCTURAL_WORKS" in families
    assert "FINISHING_WORKS" not in families
