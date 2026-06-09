from types import SimpleNamespace

from app.agent.llm_adapter import LLMAdapter, _parse_json_output


def test_parse_json_output_strips_markdown_fence():
    raw = '```json\n{"intents": ["FIND_REPORT"], "confidence": 0.9}\n```'
    assert _parse_json_output(raw) == {
        "intents": ["FIND_REPORT"],
        "confidence": 0.9,
    }


def test_classify_intent_uses_openai_when_response_is_fenced_json(monkeypatch):
    adapter = LLMAdapter()
    monkeypatch.setattr(adapter, "_should_use_openai", lambda: True)

    def fake_create(*, model, input):
        return SimpleNamespace(
            output_text=(
                '```json\n'
                '{"intents": ["FIND_REPORT"], "confidence": 0.9, "source": "OPENAI"}\n'
                '```'
            )
        )

    monkeypatch.setattr(
        "openai.OpenAI",
        lambda api_key: SimpleNamespace(
            responses=SimpleNamespace(create=fake_create)
        ),
    )

    result = adapter.classify_intent("תביא לי דוח מהשבוע")

    assert result["source"] == "OPENAI"
    assert result["intents"] == ["FIND_REPORT"]
    assert result["confidence"] == 0.9
