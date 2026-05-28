from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AILog(BaseModel):

    provider: str

    model_name: str

    prompt_name: str | None = None

    prompt: str

    response: str | None = None

    success: bool = True

    error_message: str | None = None

    duration_ms: int | None = None

    prompt_tokens: int | None = None

    completion_tokens: int | None = None

    cache_hit: bool | None = None

    confidence_score: int | None = None

    hallucination_risk: float | None = None

    governance: dict[str, Any] | None = None

    replay_token: str | None = None

    created_at: datetime | None = None