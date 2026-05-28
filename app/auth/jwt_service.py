from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.config import config_manager
from app.exceptions.exceptions import UnauthorizedError


class JWTService:
    def __init__(self) -> None:
        settings = config_manager.get_settings()
        self._secret = settings.AUTH_JWT_SECRET
        self._algorithm = settings.AUTH_JWT_ALGORITHM
        self._session_timeout_minutes = settings.AUTH_SESSION_TIMEOUT_MINUTES
        self._refresh_ttl_minutes = settings.AUTH_REFRESH_TOKEN_TTL_MINUTES

    def decode_access_token(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
            )
        except jwt.ExpiredSignatureError as exc:
            raise UnauthorizedError("Access token expired") from exc
        except jwt.InvalidTokenError as exc:
            raise UnauthorizedError("Invalid access token") from exc

        auth_time_raw = payload.get("auth_time")
        if auth_time_raw is None:
            raise UnauthorizedError("Token missing auth_time")

        auth_time = datetime.fromtimestamp(float(auth_time_raw), tz=UTC)
        elapsed = datetime.now(UTC) - auth_time
        if elapsed > timedelta(minutes=self._session_timeout_minutes):
            raise UnauthorizedError("Session timed out")

        return payload

    def decode_refresh_token(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                self._secret,
                algorithms=[self._algorithm],
            )
        except jwt.InvalidTokenError as exc:
            raise UnauthorizedError("Invalid refresh token") from exc

        if payload.get("typ") != "refresh":
            raise UnauthorizedError("Invalid refresh token type")
        return payload

    def issue_access_token(self, *, user_id: str, org_id: str, role: str, token_id: str) -> str:
        now = datetime.now(UTC)
        payload = {
            "sub": user_id,
            "org_id": org_id,
            "role": role,
            "jti": token_id,
            "typ": "access",
            "auth_time": now.timestamp(),
            "iat": now.timestamp(),
            "exp": (now + timedelta(minutes=self._session_timeout_minutes)).timestamp(),
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)

    def issue_refresh_token(self, *, user_id: str, org_id: str, role: str, token_id: str) -> str:
        now = datetime.now(UTC)
        payload = {
            "sub": user_id,
            "org_id": org_id,
            "role": role,
            "jti": token_id,
            "typ": "refresh",
            "iat": now.timestamp(),
            "exp": (now + timedelta(minutes=self._refresh_ttl_minutes)).timestamp(),
        }
        return jwt.encode(payload, self._secret, algorithm=self._algorithm)
