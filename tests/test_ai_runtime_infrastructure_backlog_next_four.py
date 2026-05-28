from app.ai.ai_client import AIClient
from app.ai.providers.base_provider import ProviderResponse
from app.ai.routing_engine import AIRoutingEngine
from app.prompts.prompt_loader import PromptLoader
from app.prompts.prompt_registry import PROMPTS
from app.prompts.prompt_test_service import PromptTestService


def test_ai_routing_engine_uses_prompt_specific_override():
    engine = AIRoutingEngine(
        route_overrides={"finding_enrichment": ["openai", "ollama"]}
    )
    assert engine.select_provider_chain("finding_enrichment") == ["openai", "ollama"]


def test_ai_client_uses_routing_engine_provider_chain(monkeypatch):
    class SuccessfulProvider:
        def generate(self, prompt):
            return ProviderResponse(content=f"ok:{prompt}", model_name="model-1")

    monkeypatch.setattr(
        AIRoutingEngine,
        "select_provider_chain",
        lambda self, prompt_name: ["ollama"],
    )
    monkeypatch.setattr(
        AIClient,
        "_resolve_provider",
        lambda self, provider_name: SuccessfulProvider(),
    )
    monkeypatch.setattr("app.ai.ai_client.AILogRepository.create_log", lambda payload: None)

    client = AIClient()
    assert client.generate("hello", prompt_name="finding_enrichment") == "ok:hello"


def test_prompt_templates_engine_loads_active_version():
    rendered = PromptLoader.load_prompt(
        prompt_name="finding_enrichment",
        finding_type="DELAY",
        summary="Delay in pouring concrete",
    )
    assert "DELAY" in rendered
    assert "Delay in pouring concrete" in rendered


def test_prompt_versioning_supports_explicit_version():
    prompt_config = PROMPTS["finding_enrichment"]
    assert prompt_config["active_version"] == "v1"
    rendered = PromptLoader.load_prompt(
        prompt_name="finding_enrichment",
        version="v1",
        finding_type="UPDATE",
        summary="No blockers",
    )
    assert "No blockers" in rendered


def test_prompt_testing_validates_all_registered_prompts():
    service = PromptTestService()
    report = service.validate_all(
        sample_contexts={
            "finding_enrichment": {
                "finding_type": "SUPPLY",
                "summary": "Material delivered on time",
            }
        }
    )
    assert report["total"] >= 1
    assert report["failed"] == 0
    assert all(result["success"] for result in report["results"])
