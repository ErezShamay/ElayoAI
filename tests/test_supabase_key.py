from __future__ import annotations

import base64
import json

import pytest
from pydantic import AnyHttpUrl

from app.config.supabase_key import supabase_key_jwt_role
from app.services.user_management_service import UserManagementService
from supabase_auth.errors import AuthApiError


def _jwt_with_role(role: str) -> str:
    header = (
        base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}')
        .decode()
        .rstrip("=")
    )
    payload = (
        base64.urlsafe_b64encode(json.dumps({"role": role}).encode())
        .decode()
        .rstrip("=")
    )
    return f"{header}.{payload}.signature"


def test_supabase_key_jwt_role_reads_role_claim():
    assert supabase_key_jwt_role(_jwt_with_role("service_role")) == "service_role"
    assert supabase_key_jwt_role(_jwt_with_role("anon")) == "anon"
    assert supabase_key_jwt_role("not-a-jwt") is None


def test_password_setup_redirect_avoids_double_slash(monkeypatch):
    monkeypatch.setattr(
        "app.services.user_management_service.settings.FRONTEND_URL",
        AnyHttpUrl("http://localhost:3000/"),
    )

    assert UserManagementService._password_setup_redirect() == (
        "http://localhost:3000/auth/callback?next=/auth/set-password"
    )


def test_auth_admin_error_maps_user_not_allowed():
    error = UserManagementService._auth_admin_error(
        AuthApiError("User not allowed", 403, "not_admin")
    )

    assert "service_role" in error.message
    assert error.details.get("config_key") == "SUPABASE_KEY"
