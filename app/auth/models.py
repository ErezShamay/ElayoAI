from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class AuthContext:
    user_id: str
    org_id: str
    role: str
    permissions: set[str]
    token_id: str | None = None
    effective_user_id: str | None = None

    @property
    def actor_user_id(self) -> str:
        return self.effective_user_id or self.user_id
