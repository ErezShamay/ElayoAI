from __future__ import annotations

from uuid import UUID

from app.exceptions.exceptions import ValidationError


def normalize_client_report_uuid(
    value: str | None,
    *,
    field_name: str = "client_report_uuid",
) -> str | None:
    if value is None:
        return None

    cleaned = str(value).strip()
    if not cleaned:
        return None

    try:
        return str(UUID(cleaned))
    except ValueError as exc:
        raise ValidationError(
            message="מזהה UUID לא תקין",
            details={field_name: value},
        ) from exc


def normalize_client_line_uuid(
    value: str | None,
    *,
    field_name: str = "client_line_uuid",
) -> str | None:
    return normalize_client_report_uuid(
        value,
        field_name=field_name,
    )
