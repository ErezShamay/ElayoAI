import ollama

from app.config.ai_config import (
    DEFAULT_AI_MODEL
)

from app.ai.providers.base_provider import (
    BaseProvider
)
from app.ai.providers.base_provider import (
    ProviderResponse
)


class OllamaProvider(
    BaseProvider
):

    def __init__(
        self,
        model_name: str | None = None
    ):

        self.model_name = (
            model_name
            or DEFAULT_AI_MODEL
        )

    def generate(
        self,
        prompt: str,
    ) -> ProviderResponse:

        response = ollama.chat(

            model=self.model_name,

            messages=[
                {
                    "role": "user",

                    "content": prompt,
                }
            ]
        )

        return ProviderResponse(
            content=response["message"]["content"],
            model_name=self.model_name,
            prompt_tokens=response.get("prompt_eval_count"),
            completion_tokens=response.get("eval_count"),
        )