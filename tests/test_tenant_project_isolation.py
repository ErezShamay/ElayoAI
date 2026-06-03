from fastapi.testclient import TestClient

import app.main as main_module
from app.auth.jwt_service import JWTService
from app.main import app


class FakeProjectService:
    def __init__(self):
        self.projects = {
            "demo-project": {
                "id": "demo-project",
                "project_name": "Demo Tower",
                "status": "ACTIVE",
                "organization_id": "org-demo",
            },
            "client-project": {
                "id": "client-project",
                "project_name": "Client Site",
                "status": "ACTIVE",
                "organization_id": "org-client",
            },
        }

    def filter_projects(
        self,
        *,
        status=None,
        owner_id=None,
        tag=None,
        organization_id=None,
    ):
        results = list(self.projects.values())
        if organization_id:
            results = [
                project
                for project in results
                if project.get("organization_id") == organization_id
            ]
        return results

    def search_projects(
        self,
        query: str,
        *,
        organization_id=None,
    ):
        return self.filter_projects(organization_id=organization_id)


def _auth_headers(org_id: str):
    token = JWTService().issue_access_token(
        user_id="client-admin",
        org_id=org_id,
        role="ADMIN",
        token_id="tenant-isolation-test",
    )
    return {
        "Authorization": f"Bearer {token}",
        "X-Organization-ID": org_id,
    }


def test_projects_list_is_scoped_to_token_organization(monkeypatch):
    monkeypatch.setattr(main_module, "project_service", FakeProjectService())
    client = TestClient(app)

    response = client.get(
        "/projects",
        headers=_auth_headers("org-client"),
    )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == "client-project"


def test_projects_list_requires_authentication(monkeypatch):
    monkeypatch.setattr(main_module, "project_service", FakeProjectService())
    client = TestClient(app)

    response = client.get("/projects")

    assert response.status_code == 401
