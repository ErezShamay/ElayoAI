from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.auth.jwt_service import JWTService
from app.services.field_report_module_service import (
    FieldReportModuleService,
)


def _token(
    *,
    user_id: str = "admin-1",
    org_id: str = "org-1",
    role: str = "PLATFORM_ADMIN",
) -> str:
    return JWTService().issue_access_token(
        user_id=user_id,
        org_id=org_id,
        role=role,
        token_id="t-1",
    )


def _headers(token: str, org_id: str = "org-1") -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "X-Organization-ID": org_id,
    }


class FakeModuleRepository:
    def __init__(self) -> None:
        self.records: dict[str, dict] = {}
        self._available = True

    def is_storage_available(self) -> bool:
        return self._available

    def get_by_organization_id(self, organization_id: str) -> dict | None:
        return self.records.get(organization_id)

    def list_all(self) -> list[dict]:
        return list(self.records.values())

    def upsert_status(
        self,
        *,
        organization_id: str,
        is_enabled: bool,
        enabled_by_profile_id: str | None,
    ) -> dict:
        record = {
            "organization_id": organization_id,
            "is_enabled": is_enabled,
            "enabled_at": "2026-06-01T00:00:00+00:00" if is_enabled else None,
            "disabled_at": None if is_enabled else "2026-06-01T01:00:00+00:00",
            "enabled_by_profile_id": enabled_by_profile_id,
        }
        self.records[organization_id] = record
        return record


class FakeOrganizationRepository:
    def get_by_id(self, organization_id: str) -> dict | None:
        if organization_id == "missing":
            return None
        return {
            "id": organization_id,
            "organization_name": "Test Org",
            "contact_email": "test@example.com",
        }

    def get_all_organizations(self) -> list[dict]:
        return [
            {
                "id": "org-1",
                "organization_name": "Org One",
                "contact_email": "one@example.com",
            },
            {
                "id": "org-2",
                "organization_name": "Org Two",
                "contact_email": "two@example.com",
            },
        ]


def test_module_service_enable_and_query():
    service = FieldReportModuleService(
        module_repository=FakeModuleRepository(),
        organization_repository=FakeOrganizationRepository(),
    )

    assert service.is_enabled_for_organization("org-1") is False

    service.set_enabled(
        organization_id="org-1",
        is_enabled=True,
        actor_profile_id="admin-1",
    )

    assert service.is_enabled_for_organization("org-1") is True


def test_field_report_home_requires_enabled_module(monkeypatch):
    fake_repo = FakeModuleRepository()
    service = FieldReportModuleService(
        module_repository=fake_repo,
        organization_repository=FakeOrganizationRepository(),
    )

    monkeypatch.setattr(
        "app.main.field_report_module_service",
        service,
    )

    app.state.field_report_module_service = service
    client = TestClient(app)
    token = _token()

    response = client.get(
        "/field-reports/home",
        headers=_headers(token),
    )
    assert response.status_code == 403

    service.set_enabled(
        organization_id="org-1",
        is_enabled=True,
        actor_profile_id="admin-1",
    )

    response = client.get(
        "/field-reports/home",
        headers=_headers(token),
    )
    assert response.status_code == 200
    assert response.json()["module"] == "field_reports"


def test_admin_module_list_and_toggle(monkeypatch):
    fake_repo = FakeModuleRepository()
    service = FieldReportModuleService(
        module_repository=fake_repo,
        organization_repository=FakeOrganizationRepository(),
    )

    monkeypatch.setattr(
        "app.main.field_report_module_service",
        service,
    )

    client = TestClient(app)
    token = _token()

    list_response = client.get(
        "/admin/field-reports/modules",
        headers=_headers(token),
    )
    assert list_response.status_code == 200
    payload = list_response.json()
    assert payload["total"] == 2
    assert payload["organizations"][0]["is_enabled"] is False

    patch_response = client.patch(
        "/admin/field-reports/modules/org-2",
        headers=_headers(token),
        json={"is_enabled": True},
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["is_enabled"] is True


def test_client_admin_cannot_toggle_module():
    client = TestClient(app)
    token = _token(role="ADMIN")

    response = client.patch(
        "/admin/field-reports/modules/org-1",
        headers=_headers(token),
        json={"is_enabled": True},
    )
    assert response.status_code == 403
