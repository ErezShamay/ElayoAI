from __future__ import annotations

from datetime import date
from typing import Any

PROJECT_START_AFTER_END_MESSAGE = (
    "תאריך ההתחלה חייב להיות לפני תאריך הסיום"
)
PROJECT_GRACE_BEFORE_END_MESSAGE = (
    "תאריך הגרייס חייב להיות אחרי תאריך הסיום"
)


def parse_optional_iso_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None

    trimmed = value.strip()
    if not trimmed:
        return None

    try:
        return date.fromisoformat(trimmed[:10])
    except ValueError:
        return None


def validate_project_dates(
    start: Any = None,
    end: Any = None,
    grace: Any = None,
) -> None:
    parsed_start = parse_optional_iso_date(start)
    parsed_end = parse_optional_iso_date(end)
    parsed_grace = parse_optional_iso_date(grace)

    if (
        parsed_start is not None
        and parsed_end is not None
        and parsed_start >= parsed_end
    ):
        raise ValueError(PROJECT_START_AFTER_END_MESSAGE)

    if (
        parsed_end is not None
        and parsed_grace is not None
        and parsed_grace <= parsed_end
    ):
        raise ValueError(PROJECT_GRACE_BEFORE_END_MESSAGE)


def _pick_header_date(
    header_fields: dict,
    metadata: dict,
    key: str,
) -> Any:
    for source in (header_fields, metadata):
        value = source.get(key)
        if value is not None and str(value).strip():
            return value
    return None


def extract_project_dates_from_header_fields(
    header_fields: dict | None,
) -> tuple[Any, Any, Any]:
    if not header_fields:
        return None, None, None

    metadata = header_fields.get("project_metadata")
    metadata_dict = metadata if isinstance(metadata, dict) else {}

    return (
        _pick_header_date(
            header_fields,
            metadata_dict,
            "project_start_date",
        ),
        _pick_header_date(
            header_fields,
            metadata_dict,
            "project_end_date",
        ),
        _pick_header_date(
            header_fields,
            metadata_dict,
            "project_grace_end_date",
        ),
    )


def validate_header_fields_project_dates(
    header_fields: dict | None,
) -> None:
    start, end, grace = extract_project_dates_from_header_fields(
        header_fields
    )
    validate_project_dates(start, end, grace)
