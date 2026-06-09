import time
from uuid import uuid4

from app.ai.cache_layer import AICacheLayer
from app.ai.governance_layer import AIGovernanceLayer
from app.ai.provider_outage_handler import AIProviderOutageHandler
from app.config.ai_config import (
    DEFAULT_AI_MODEL,
    AI_MAX_RETRIES,
)
from app.ai.routing_engine import AIRoutingEngine
from app.ai.safety_guard import AISafetyGuard

from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.base_provider import BaseProvider, ProviderResponse
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.ollama_provider import (
    OllamaProvider
)
from app.ai.providers.openai_provider import OpenAIProvider

from app.repositories.ai_log_repository import (
    AILogRepository
)


class AIClient:

    def __init__(self):
        self.routing_engine = AIRoutingEngine()
        self.cache_layer = AICacheLayer()
        self.safety_guard = AISafetyGuard()
        self.governance_layer = AIGovernanceLayer()
        self.outage_handler = AIProviderOutageHandler()

    def _resolve_provider(self, provider_name: str) -> BaseProvider:
        if provider_name == "ollama":
            return OllamaProvider()
        if provider_name == "openai":
            return OpenAIProvider()
        if provider_name == "anthropic":
            return AnthropicProvider()
        if provider_name == "gemini":
            return GeminiProvider()
        raise Exception(f"Unsupported AI provider: {provider_name}")

    def _resolve_provider_chain(
        self,
        prompt_name: str | None = None,
    ) -> list[tuple[str, BaseProvider]]:
        provider_names = self.routing_engine.select_provider_chain(prompt_name)
        return [
            (provider_name, self._resolve_provider(provider_name))
            for provider_name in provider_names
        ]

    def generate(
        self,
        prompt: str,
        prompt_name: str | None = None,
        use_cache: bool = True,
        organization_id: str | None = None,
        project_id: str | None = None,
    ) -> str:
        self.safety_guard.check_prompt_injection(prompt)
        replay_token = str(uuid4())
        if use_cache:
            cached_response = self.cache_layer.get(prompt=prompt, prompt_name=prompt_name)
            if cached_response is not None:
                self._log_success(
                    provider_name="cache",
                    prompt_name=prompt_name,
                    prompt=prompt,
                    provider_response=ProviderResponse(
                        content=cached_response,
                        model_name="cache",
                    ),
                    duration_ms=0,
                    cache_hit=True,
                    confidence_score=100,
                    hallucination_risk=0.0,
                    governance={"allowed": True, "reasons": []},
                    replay_token=replay_token,
                    organization_id=organization_id,
                    project_id=project_id,
                )
                return cached_response

        last_error = None

        provider_chain = self._resolve_provider_chain(prompt_name=prompt_name)
        for provider_name, provider in provider_chain:
            if not self.outage_handler.is_provider_available(provider_name):
                continue
            for _ in range(AI_MAX_RETRIES + 1):
                started_at = time.time()
                try:
                    provider_response = provider.generate(prompt)
                    sanitized_content = self.safety_guard.sanitize_response(provider_response.content)
                    hallucination_risk = self.safety_guard.detect_hallucination_risk(sanitized_content)
                    confidence_score = self.safety_guard.confidence_score(
                        response=sanitized_content,
                        hallucination_risk=hallucination_risk,
                    )
                    governance = self.governance_layer.evaluate(
                        confidence_score=confidence_score,
                        hallucination_risk=hallucination_risk,
                    )
                    if not governance["allowed"]:
                        raise ValueError(
                            "AI governance blocked response: "
                            + ",".join(governance["reasons"])
                        )

                    provider_response.content = sanitized_content
                    duration_ms = int((time.time() - started_at) * 1000)
                    self.outage_handler.register_success(provider_name)
                    if use_cache:
                        self.cache_layer.set(
                            prompt=prompt,
                            prompt_name=prompt_name,
                            value=provider_response.content,
                        )
                    self._log_success(
                        provider_name=provider_name,
                        prompt_name=prompt_name,
                        prompt=prompt,
                        provider_response=provider_response,
                        duration_ms=duration_ms,
                        cache_hit=False,
                        confidence_score=confidence_score,
                        hallucination_risk=hallucination_risk,
                        governance=governance,
                        replay_token=replay_token,
                        organization_id=organization_id,
                        project_id=project_id,
                    )
                    return provider_response.content
                except Exception as e:
                    last_error = e
                    duration_ms = int((time.time() - started_at) * 1000)
                    self.outage_handler.register_failure(provider_name)
                    self._log_failure(
                        provider_name=provider_name,
                        prompt_name=prompt_name,
                        prompt=prompt,
                        error=e,
                        duration_ms=duration_ms,
                        replay_token=replay_token,
                        organization_id=organization_id,
                        project_id=project_id,
                    )
                    continue

        raise last_error

    def _log_success(
        self,
        *,
        provider_name: str,
        prompt_name: str | None,
        prompt: str,
        provider_response: ProviderResponse,
        duration_ms: int,
        cache_hit: bool,
        confidence_score: int,
        hallucination_risk: float,
        governance: dict,
        replay_token: str,
        organization_id: str | None = None,
        project_id: str | None = None,
    ) -> None:
        payload = {
            "provider": provider_name,
            "model_name": provider_response.model_name or DEFAULT_AI_MODEL,
            "prompt_name": prompt_name,
            "prompt": prompt,
            "response": provider_response.content,
            "success": True,
            "duration_ms": duration_ms,
            "prompt_tokens": provider_response.prompt_tokens,
            "completion_tokens": provider_response.completion_tokens,
            "cache_hit": cache_hit,
            "confidence_score": confidence_score,
            "hallucination_risk": hallucination_risk,
            "governance": governance,
            "replay_token": replay_token,
        }
        if organization_id:
            payload["organization_id"] = organization_id
        if project_id:
            payload["project_id"] = project_id
        AILogRepository.create_log(payload)

    def _log_failure(
        self,
        *,
        provider_name: str,
        prompt_name: str | None,
        prompt: str,
        error: Exception,
        duration_ms: int,
        replay_token: str,
        organization_id: str | None = None,
        project_id: str | None = None,
    ) -> None:
        payload = {
            "provider": provider_name,
            "model_name": DEFAULT_AI_MODEL,
            "prompt_name": prompt_name,
            "prompt": prompt,
            "response": None,
            "success": False,
            "error_message": str(error),
            "duration_ms": duration_ms,
            "replay_token": replay_token,
        }
        if organization_id:
            payload["organization_id"] = organization_id
        if project_id:
            payload["project_id"] = project_id
        AILogRepository.create_log(payload)

    def generate_structured(
        self,
        prompt: str,
        schema,
        prompt_name: str | None = None,
        **kwargs,
    ):

        raw_response = (
            self.generate(
                prompt=prompt,
                prompt_name=prompt_name,
            )
        )

        return schema.from_ai_response(
            raw_response=raw_response,
            **kwargs,
        )

    def replay_execution(self, log_row: dict) -> str:
        prompt = log_row.get("prompt")
        if not prompt:
            raise ValueError("Cannot replay without prompt")
        prompt_name = log_row.get("prompt_name")
        return self.generate(
            prompt=prompt,
            prompt_name=prompt_name,
            use_cache=False,
        )
