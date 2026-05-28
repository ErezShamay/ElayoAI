from app.ai.providers.base_provider import BaseProvider, ProviderResponse
from app.config.settings import settings


class OpenAIProvider(BaseProvider):
    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.OPENAI_MODEL

    def generate(self, prompt: str) -> ProviderResponse:
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("openai package is not installed") from exc

        api_key = settings.get_active_openai_api_key()
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")

        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=self.model_name,
            input=prompt,
        )

        usage = getattr(response, "usage", None)
        return ProviderResponse(
            content=response.output_text,
            model_name=getattr(response, "model", None) or self.model_name,
            prompt_tokens=getattr(usage, "input_tokens", None) if usage else None,
            completion_tokens=getattr(usage, "output_tokens", None) if usage else None,
        )
