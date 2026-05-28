from __future__ import annotations

import logging
from collections.abc import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.jwt_service import JWTService
from app.auth.models import AuthContext
from app.auth.permissions import resolve_permissions
from app.exceptions.exceptions import OrgFlowException

logger = logging.getLogger(__name__)


class APIAuthorizationMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, public_paths: set[str] | None = None) -> None:
        super().__init__(app)
        self._jwt_service = JWTService()
        self._public_paths = public_paths or set()

    async def dispatch(self, request: Request, call_next: Callable):
        try:
            if request.url.path in self._public_paths:
                return await call_next(request)

            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                raise OrgFlowException(
                    message="Missing bearer token",
                    error_code="UNAUTHORIZED",
                    status_code=401,
                )

            token = auth_header.replace("Bearer ", "", 1).strip()
            payload = self._jwt_service.decode_access_token(token)

            user_id = str(payload.get("sub", "")).strip()
            org_id = str(payload.get("org_id", "")).strip()
            role = str(payload.get("role", "")).strip().upper()

            if not user_id or not org_id or not role:
                raise OrgFlowException(
                    message="Token missing required claims",
                    error_code="UNAUTHORIZED",
                    status_code=401,
                )

            request_org_id = request.headers.get("X-Organization-ID")
            if request_org_id and request_org_id != org_id:
                raise OrgFlowException(
                    message="Tenant-level access validation failed",
                    error_code="FORBIDDEN",
                    status_code=403,
                )

            effective_user_id = None
            impersonated_user = request.headers.get("X-Impersonate-User")
            if impersonated_user:
                if "impersonation:use" not in resolve_permissions(role):
                    raise OrgFlowException(
                        message="Only admins can impersonate users",
                        error_code="FORBIDDEN",
                        status_code=403,
                    )
                effective_user_id = impersonated_user

            permissions = resolve_permissions(role)
            auth_context = AuthContext(
                user_id=user_id,
                org_id=org_id,
                role=role,
                permissions=permissions,
                token_id=payload.get("jti"),
                effective_user_id=effective_user_id,
            )
            request.state.auth_context = auth_context

            logger.info(
                "Authentication succeeded",
                extra={
                    "event": "audit.login",
                    "user_id": user_id,
                    "org_id": org_id,
                    "role": role,
                    "effective_user_id": effective_user_id,
                },
            )

            return await call_next(request)
        except OrgFlowException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "success": False,
                    "error": {"code": exc.error_code, "message": exc.message},
                },
            )
