from abc import (
    ABC,
    abstractmethod,
)
from dataclasses import dataclass


@dataclass
class ProviderResponse:
    content: str
    model_name: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class BaseProvider(ABC):

    @abstractmethod
    def generate(
        self,
        prompt: str,
    ) -> ProviderResponse:

        pass