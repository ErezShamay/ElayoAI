import time


class AIProviderOutageHandler:
    def __init__(
        self,
        failure_threshold: int = 3,
        cooldown_seconds: int = 60,
    ):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self._failures: dict[str, int] = {}
        self._blocked_until: dict[str, float] = {}

    def is_provider_available(self, provider_name: str) -> bool:
        blocked_until = self._blocked_until.get(provider_name, 0)
        return time.time() >= blocked_until

    def register_success(self, provider_name: str) -> None:
        self._failures[provider_name] = 0
        self._blocked_until.pop(provider_name, None)

    def register_failure(self, provider_name: str) -> None:
        failures = self._failures.get(provider_name, 0) + 1
        self._failures[provider_name] = failures
        if failures >= self.failure_threshold:
            self._blocked_until[provider_name] = time.time() + self.cooldown_seconds
