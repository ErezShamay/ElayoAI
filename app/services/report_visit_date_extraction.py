"""Extract visit/report date from uploaded document filename and text."""

from __future__ import annotations

import re
from datetime import date

_VISIT_DATE_LABEL_PATTERN = re.compile(
    r"(?:תאריך\s*(?:ביקור|דוח|עבודה|בדיקה)"
    r"|visit\s*date"
    r"|date\s*of\s*visit"
    r"|report\s*date)"
    r"[\s:.\-–—]*",
    re.IGNORECASE,
)

_ISO_DATE_PATTERN = re.compile(r"(\d{4}-\d{2}-\d{2})")
_DMY_DATE_PATTERN = re.compile(
    r"(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})"
)


def extract_visit_date(
    *,
    filename: str,
    extracted_text: str,
) -> str | None:
    """Return visit date as ISO ``YYYY-MM-DD`` when detected."""
    filename_text = (filename or "").strip()
    body_text = (extracted_text or "").strip()

    labeled_window = _extract_labeled_date_window(body_text)
    if labeled_window:
        parsed = _parse_first_date(labeled_window)
        if parsed:
            return parsed

    parsed = _parse_first_date(filename_text)
    if parsed:
        return parsed

    return _parse_first_date(body_text[:5000])


def _extract_labeled_date_window(text: str) -> str | None:
    if not text:
        return None

    for match in _VISIT_DATE_LABEL_PATTERN.finditer(text):
        start = match.end()
        window = text[start : start + 80]
        if window.strip():
            return window

    return None


def _parse_first_date(text: str) -> str | None:
    if not text:
        return None

    for match in _ISO_DATE_PATTERN.finditer(text):
        parsed = _iso_date_from_parts(
            year=int(match.group(1)[0:4]),
            month=int(match.group(1)[5:7]),
            day=int(match.group(1)[8:10]),
        )
        if parsed:
            return parsed

    for match in _DMY_DATE_PATTERN.finditer(text):
        day = int(match.group(1))
        month = int(match.group(2))
        year_raw = int(match.group(3))
        year = year_raw if year_raw >= 100 else 2000 + year_raw
        parsed = _iso_date_from_parts(year=year, month=month, day=day)
        if parsed:
            return parsed

    return None


def _iso_date_from_parts(*, year: int, month: int, day: int) -> str | None:
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None
