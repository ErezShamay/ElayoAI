from __future__ import annotations

from fastapi.testclient import TestClient

from app.auth.jwt_service import JWTService
from app.main import app


def _build_access_token(
    *,
    user_id: str = "admin-1",
    org_id: str = "org-1",
    role: str = "ADMIN",
) -> str:
    return JWTService().issue_access_token(
        user_id=user_id,
        org_id=org_id,
        role=role,
        token_id="token-admin",
    )


def test_password_policy_is_public():
    client = TestClient(app)

    response = client.get("/auth/password-policy")

    assert response.status_code == 200
    assert response.json()["min_length"] == 8


def test_admin_users_endpoints_require_admin_permission():
    client = TestClient(app)
    token = _build_access_token(role="VIEWER")

    response = client.get(
        "/admin/users",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Organization-ID": "org-1",
        },
    )

    assert response.status_code == 403


def test_admin_user_actions_require_write_permission():
    client = TestClient(app)
    token = _build_access_token(role="MANAGER")

    response = client.post(
        "/admin/users/user-1/resend-invite",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Organization-ID": "org-1",
        },
    )

    assert response.status_code == 403

