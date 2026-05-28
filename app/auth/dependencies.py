from __future__ import annotations

from collections.abc import Callable

from fastapi import HTTPException, Request

from app.auth.models import AuthContext
from app.exceptions.exceptions import UnauthorizedError


def get_auth_context(request: Request) -> AuthContext:
    auth_context = getattr(request.state, "auth_context", None)
    if auth_context is None:
        raise UnauthorizedError("Missing authentication context")
    return auth_context


def require_permission(permission: str) -> Callable[[Request], AuthContext]:
    def dependency(request: Request) -> AuthContext:
        auth_context = get_auth_context(request)
        if permission not in auth_context.permissions:
            raise HTTPException(status_code=403, detail=f"Missing required permission: {permission}")
        return auth_context

    return dependency
