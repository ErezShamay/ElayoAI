from app.ai.providers.base_provider import BaseProvider, ProviderResponse
from app.config.settings import settings


class GeminiProvider(BaseProvider):
    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.DEFAULT_AI_MODEL

    def generate(self, prompt: str) -> ProviderResponse:
        try:
            from google import genai
        except ImportError as exc:
            raise RuntimeError("google-genai package is not installed") from exc

        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=self.model_name,
            contents=prompt,
        )

        usage = getattr(response, "usage_metadata", None)
        return ProviderResponse(
            content=getattr(response, "text", "") or "",
            model_name=self.model_name,
            prompt_tokens=getattr(usage, "prompt_token_count", None) if usage else None,
            completion_tokens=getattr(usage, "candidates_token_count", None) if usage else None,
        )
