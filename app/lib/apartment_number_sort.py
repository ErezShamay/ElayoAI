"""Numeric-aware sort keys for apartment numbers stored as strings."""


def apartment_number_sort_key(apartment_number: str) -> tuple[int, int | str]:
    raw = str(apartment_number or "").strip()
    if raw.isdigit():
        return (0, int(raw))
    return (1, raw)
