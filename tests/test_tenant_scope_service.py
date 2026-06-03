from app.services.tenant_scope_service import (
    TenantScopeService,
)


def test_action_belongs_to_organization_rejects_foreign_project(
    monkeypatch,
):
    scope = TenantScopeService.__new__(TenantScopeService)

    action = {
        "id": "a-1",
        "organization_id": "org-client",
        "project_id": "foreign-project",
    }

    assert scope.action_belongs_to_organization(
        action,
        "org-client",
        {"project-a"},
    ) is False


def test_action_belongs_to_organization_accepts_matching_project(
    monkeypatch,
):
    scope = TenantScopeService.__new__(TenantScopeService)

    action = {
        "id": "a-1",
        "organization_id": "org-client",
        "project_id": "project-a",
    }

    assert scope.action_belongs_to_organization(
        action,
        "org-client",
        {"project-a"},
    ) is True
