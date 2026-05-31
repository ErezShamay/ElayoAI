from __future__ import annotations

import re

PASSWORD_MIN_LENGTH = 8

PASSWORD_RULES = (
    {
        "id": "min_length",
        "label": f"לפחות {PASSWORD_MIN_LENGTH} תווים",
        "test": lambda value: len(value) >= PASSWORD_MIN_LENGTH,
    },
    {
        "id": "uppercase",
        "label": "לפחות אות גדולה באנגלית",
        "test": lambda value: bool(re.search(r"[A-Z]", value)),
    },
    {
        "id": "lowercase",
        "label": "לפחות אות קטנה באנגלית",
        "test": lambda value: bool(re.search(r"[a-z]", value)),
    },
    {
        "id": "digit",
        "label": "לפחות ספרה אחת",
        "test": lambda value: bool(re.search(r"\d", value)),
    },
    {
        "id": "special",
        "label": "לפחות תו מיוחד (!@#$%^&* וכו')",
        "test": lambda value: bool(re.search(r"[^A-Za-z0-9]", value)),
    },
)


def validate_password(password: str) -> list[str]:
    errors: list[str] = []

    for rule in PASSWORD_RULES:
        if not rule["test"](password):
            errors.append(rule["label"])

    return errors


def get_password_policy() -> dict:
    return {
        "min_length": PASSWORD_MIN_LENGTH,
        "rules": [
            {"id": rule["id"], "label": rule["label"]}
            for rule in PASSWORD_RULES
        ],
    }
