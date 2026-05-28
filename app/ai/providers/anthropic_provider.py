from app.ai.providers.base_provider import BaseProvider, ProviderResponse
from app.config.settings import settings


class AnthropicProvider(BaseProvider):
    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.DEFAULT_AI_MODEL

    def generate(self, prompt: str) -> ProviderResponse:
        try:
            import anthropic
        except ImportError as exc:
            raise RuntimeError("anthropic package is not installed") from exc

        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not configured")

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=self.model_name,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        content = ""
        if getattr(response, "content", None):
            first_content = response.content[0]
            content = getattr(first_content, "text", "") or ""

        usage = getattr(response, "usage", None)
        return ProviderResponse(
            content=content,
            model_name=getattr(response, "model", None) or self.model_name,
            prompt_tokens=getattr(usage, "input_tokens", None) if usage else None,
            completion_tokens=getattr(usage, "output_tokens", None) if usage else None,
        )
