from __future__ import annotations

import base64
import json

import pytest

from app.config.settings import load_settings
from app.exceptions.exceptions import ConfigurationError


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


def test_load_settings_rejects_anon_supabase_key_outside_test(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "local")
    monkeypatch.setenv("FRONTEND_URL", "http://localhost:3000")
    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setenv("DEFAULT_AI_MODEL", "mistral")
    monkeypatch.setenv("AI_MAX_RETRIES", "2")
    monkeypatch.setenv("ORG_FLOW_LLM_MODE", "mock")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.5")
    monkeypatch.setenv("LOG_LEVEL", "INFO")
    monkeypatch.setenv("EMAIL_PROVIDER", "gmail")
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", _jwt_with_role("anon"))

    with pytest.raises(ConfigurationError) as exc_info:
        load_settings()

    assert "service_role" in str(exc_info.value.details.get("errors", ""))
