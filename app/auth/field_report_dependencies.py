from __future__ import annotations

from fastapi import Depends, Request

from app.auth.dependencies import get_auth_context
from app.auth.models import AuthContext
from app.services.field_report_module_service import (
    FieldReportModuleService,
)


def require_field_report_module(
    request: Request,
    auth: AuthContext = Depends(get_auth_context),
) -> AuthContext:
    service = getattr(
        request.app.state,
        "field_report_module_service",
        None,
    ) or FieldReportModuleService()

    service.require_enabled(auth.org_id)
    return auth


def get_field_report_module_service(request: Request) -> FieldReportModuleService:
    return getattr(
        request.app.state,
        "field_report_module_service",
        None,
    ) or FieldReportModuleService()
