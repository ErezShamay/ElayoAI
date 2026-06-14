from __future__ import annotations

import json
from typing import Any


def apartment_number_from_group_key(group_key: str) -> str:
    if not group_key.startswith("apartment:"):
        return ""
    return group_key.split(":", 1)[1].strip()


def text_matches_apartment(text: str | None, apartment_number: str) -> bool:
    if not text or not apartment_number:
        return False

    normalized = text.casefold()
    number = apartment_number.strip()
    if not number:
        return False

    needles = (
        f"דירה {number}",
        f"דירה{number}",
        f"דירה מספר {number}",
        f"דירה מס' {number}",
        f"דירה מס׳ {number}",
        f"apt {number}",
        f"apartment {number}",
        f"unit {number}",
    )
    return any(needle.casefold() in normalized for needle in needles)


def record_matches_apartment(
    record: dict[str, Any],
    apartment_number: str,
    *,
    text_fields: tuple[str, ...] = (
        "title",
        "summary",
        "source_text",
        "location",
        "group_label_he",
        "email_subject",
        "file_name",
        "description",
    ),
) -> bool:
    for field in text_fields:
        value = record.get(field)
        if isinstance(value, str) and text_matches_apartment(value, apartment_number):
            return True

    metadata = record.get("metadata")
    if isinstance(metadata, dict):
        metadata_text = json.dumps(metadata, ensure_ascii=False)
        if text_matches_apartment(metadata_text, apartment_number):
            return True
    elif isinstance(metadata, str) and text_matches_apartment(
        metadata,
        apartment_number,
    ):
        return True

    return False
