import hashlib
import time


class AICacheLayer:
    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, tuple[float, str]] = {}

    def build_key(
        self,
        prompt: str,
        prompt_name: str | None,
    ) -> str:
        raw = f"{prompt_name or 'unknown'}::{prompt}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(
        self,
        prompt: str,
        prompt_name: str | None,
    ) -> str | None:
        key = self.build_key(prompt, prompt_name)
        entry = self._store.get(key)
        if not entry:
            return None
        expires_at, value = entry
        if time.time() >= expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(
        self,
        prompt: str,
        prompt_name: str | None,
        value: str,
    ) -> None:
        key = self.build_key(prompt, prompt_name)
        self._store[key] = (time.time() + self.ttl_seconds, value)
