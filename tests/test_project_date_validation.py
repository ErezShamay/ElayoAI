from __future__ import annotations

from datetime import date

import pytest

from app.lib.project_date_validation import (
    PROJECT_GRACE_BEFORE_END_MESSAGE,
    PROJECT_START_AFTER_END_MESSAGE,
    extract_project_dates_from_header_fields,
    validate_header_fields_project_dates,
    validate_project_dates,
)


def test_validate_project_dates_accepts_valid_order() -> None:
    validate_project_dates("2026-01-01", "2028-06-01", "2028-12-01")


def test_validate_project_dates_rejects_start_on_or_after_end() -> None:
    with pytest.raises(ValueError, match=PROJECT_START_AFTER_END_MESSAGE):
        validate_project_dates("2028-06-01", "2026-01-01", "2028-12-01")

    with pytest.raises(ValueError, match=PROJECT_START_AFTER_END_MESSAGE):
        validate_project_dates("2028-06-01", "2028-06-01", "2028-12-01")


def test_validate_project_dates_rejects_grace_on_or_before_end() -> None:
    with pytest.raises(ValueError, match=PROJECT_GRACE_BEFORE_END_MESSAGE):
        validate_project_dates("2026-01-01", "2028-06-01", "2028-01-01")

    with pytest.raises(ValueError, match=PROJECT_GRACE_BEFORE_END_MESSAGE):
        validate_project_dates("2026-01-01", "2028-06-01", "2028-06-01")


def test_validate_project_dates_validates_partial_pairs() -> None:
    validate_project_dates("2026-01-01", "2028-06-01", None)
    validate_project_dates(None, "2028-06-01", "2028-12-01")

    with pytest.raises(ValueError, match=PROJECT_START_AFTER_END_MESSAGE):
        validate_project_dates("2028-06-01", "2026-01-01", None)


def test_validate_header_fields_project_dates_reads_nested_metadata() -> None:
    header_fields = {
        "project_metadata": {
            "project_start_date": "2026-01-01",
            "project_end_date": "2028-06-01",
            "project_grace_end_date": "2028-12-01",
        }
    }

    validate_header_fields_project_dates(header_fields)

    start, end, grace = extract_project_dates_from_header_fields(
        header_fields
    )
    assert start == "2026-01-01"
    assert end == "2028-06-01"
    assert grace == "2028-12-01"


def test_validate_header_fields_project_dates_prefers_top_level_values() -> None:
    header_fields = {
        "project_start_date": "2026-01-01",
        "project_end_date": "2028-06-01",
        "project_grace_end_date": "2028-12-01",
        "project_metadata": {
            "project_start_date": "2020-01-01",
            "project_end_date": "2021-01-01",
            "project_grace_end_date": "2021-06-01",
        },
    }

    start, end, grace = extract_project_dates_from_header_fields(
        header_fields
    )
    assert start == "2026-01-01"
    assert end == "2028-06-01"
    assert grace == "2028-12-01"


def test_validate_project_dates_accepts_date_objects() -> None:
    validate_project_dates(
        date(2026, 1, 1),
        date(2028, 6, 1),
        date(2028, 12, 1),
    )
