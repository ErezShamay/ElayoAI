from app.config.settings import settings


class AIRoutingEngine:
    """
    Keeps provider selection logic centralized so we can route prompts
    without coupling routing decisions to AIClient internals.
    """

    def __init__(self, route_overrides: dict[str, list[str]] | None = None):
        self.route_overrides = route_overrides or {}

    def select_provider_chain(self, prompt_name: str | None = None) -> list[str]:
        if prompt_name and prompt_name in self.route_overrides:
            return self.route_overrides[prompt_name]
        return settings.get_ai_provider_chain()
