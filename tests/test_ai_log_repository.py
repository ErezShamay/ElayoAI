from types import SimpleNamespace

from app.repositories import ai_log_repository as repo_module
from app.repositories.ai_log_repository import AILogRepository


def test_create_log_falls_back_to_legacy_columns_on_schema_mismatch(monkeypatch):
    calls: list[dict] = []

    def fake_insert(payload):
        calls.append(payload)
        if "replay_token" in payload:
            raise Exception(
                "Could not find the 'replay_token' column of 'ai_logs' in the schema cache"
            )
        return SimpleNamespace(execute=lambda: None)

    monkeypatch.setattr(
        repo_module,
        "supabase",
        SimpleNamespace(
            table=lambda name: SimpleNamespace(insert=fake_insert),
        ),
    )

    AILogRepository.create_log({
        "provider": "openai",
        "model_name": "gpt-4o",
        "prompt_name": "project_operational_summary",
        "prompt": "hello",
        "response": "world",
        "success": True,
        "duration_ms": 12,
        "replay_token": "token-1",
        "confidence_score": 90,
    })

    assert len(calls) == 2
    assert "replay_token" in calls[0]
    assert "replay_token" not in calls[1]
    assert calls[1]["provider"] == "openai"


def test_create_log_does_not_raise_on_unrelated_errors(monkeypatch):
    def fake_insert(_payload):
        raise RuntimeError("network down")

    monkeypatch.setattr(
        repo_module,
        "supabase",
        SimpleNamespace(
            table=lambda name: SimpleNamespace(insert=fake_insert),
        ),
    )

    AILogRepository.create_log({
        "provider": "openai",
        "model_name": "gpt-4o",
        "prompt": "hello",
        "response": "world",
        "success": True,
    })
