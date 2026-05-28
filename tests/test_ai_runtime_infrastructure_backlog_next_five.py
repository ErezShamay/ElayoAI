import sys
import types

from app.ai.ai_client import AIClient
from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.base_provider import ProviderResponse
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.openai_provider import OpenAIProvider
from app.config.settings import settings


def test_multi_provider_ai_support_resolves_provider_chain(monkeypatch):
    monkeypatch.setattr(
        settings.__class__,
        "get_ai_provider_chain",
        lambda self: ["ollama", "openai"],
    )
    client = AIClient()
    provider_chain = client._resolve_provider_chain(prompt_name="any")
    assert [provider_name for provider_name, _ in provider_chain] == ["ollama", "openai"]


def test_openai_provider_returns_provider_response(monkeypatch):
    class FakeUsage:
        input_tokens = 12
        output_tokens = 8

    class FakeResponse:
        output_text = "openai-result"
        model = "gpt-test"
        usage = FakeUsage()

    class FakeResponses:
        @staticmethod
        def create(model, input):
            assert model == "gpt-test"
            assert input == "hello"
            return FakeResponse()

    class FakeClient:
        def __init__(self, api_key):
            assert api_key == "test-key"
            self.responses = FakeResponses()

    monkeypatch.setattr(settings, "OPENAI_MODEL", "gpt-test")
    monkeypatch.setattr(
        settings.__class__,
        "get_active_openai_api_key",
        lambda self: "test-key",
    )
    monkeypatch.setitem(sys.modules, "openai", types.SimpleNamespace(OpenAI=FakeClient))

    response = OpenAIProvider().generate("hello")
    assert response == ProviderResponse(
        content="openai-result",
        model_name="gpt-test",
        prompt_tokens=12,
        completion_tokens=8,
    )


def test_anthropic_provider_returns_provider_response(monkeypatch):
    class FakeUsage:
        input_tokens = 5
        output_tokens = 3

    class FakeContent:
        text = "anthropic-result"

    class FakeResponse:
        model = "claude-test"
        content = [FakeContent()]
        usage = FakeUsage()

    class FakeMessages:
        @staticmethod
        def create(**kwargs):
            assert kwargs["model"] == "claude-test"
            return FakeResponse()

    class FakeAnthropicClient:
        def __init__(self, api_key):
            assert api_key == "anthropic-key"
            self.messages = FakeMessages()

    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "anthropic-key")
    monkeypatch.setitem(sys.modules, "anthropic", types.SimpleNamespace(Anthropic=FakeAnthropicClient))

    response = AnthropicProvider(model_name="claude-test").generate("hello")
    assert response == ProviderResponse(
        content="anthropic-result",
        model_name="claude-test",
        prompt_tokens=5,
        completion_tokens=3,
    )


def test_gemini_provider_returns_provider_response(monkeypatch):
    class FakeUsage:
        prompt_token_count = 7
        candidates_token_count = 4

    class FakeResponse:
        text = "gemini-result"
        usage_metadata = FakeUsage()

    class FakeModels:
        @staticmethod
        def generate_content(model, contents):
            assert model == "gemini-test"
            assert contents == "hello"
            return FakeResponse()

    class FakeGenaiClient:
        def __init__(self, api_key):
            assert api_key == "gemini-key"
            self.models = FakeModels()

    fake_genai_module = types.SimpleNamespace(Client=FakeGenaiClient)
    monkeypatch.setitem(sys.modules, "google", types.SimpleNamespace(genai=fake_genai_module))
    monkeypatch.setitem(sys.modules, "google.genai", fake_genai_module)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key")

    response = GeminiProvider(model_name="gemini-test").generate("hello")
    assert response == ProviderResponse(
        content="gemini-result",
        model_name="gemini-test",
        prompt_tokens=7,
        completion_tokens=4,
    )


def test_provider_fallback_uses_next_provider_on_error(monkeypatch):
    class FailingProvider:
        def generate(self, prompt):
            raise RuntimeError("provider failed")

    class SuccessfulProvider:
        def generate(self, prompt):
            assert prompt == "hello"
            return ProviderResponse(content="fallback-result", model_name="mistral")

    logs: list[dict] = []
    monkeypatch.setattr(
        settings.__class__,
        "get_ai_provider_chain",
        lambda self: ["openai", "ollama"],
    )
    monkeypatch.setattr(
        AIClient,
        "_resolve_provider",
        lambda self, provider_name: FailingProvider() if provider_name == "openai" else SuccessfulProvider(),
    )
    monkeypatch.setattr(
        "app.ai.ai_client.AILogRepository.create_log",
        lambda payload: logs.append(payload),
    )

    response = AIClient().generate("hello", prompt_name="fallback-test")
    assert response == "fallback-result"
    assert logs[0]["provider"] == "openai"
    assert logs[0]["success"] is False
    assert any(log["provider"] == "ollama" and log["success"] is True for log in logs)
