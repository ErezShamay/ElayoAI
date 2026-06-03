from __future__ import annotations

from typing import Final

VISIT_TYPE_STRUCTURE_SITE: Final = "STRUCTURE_SITE"
VISIT_TYPE_FINISHING_APARTMENTS: Final = "FINISHING_APARTMENTS"
VISIT_TYPE_MIXED: Final = "MIXED"

VISIT_TYPES: tuple[str, ...] = (
    VISIT_TYPE_STRUCTURE_SITE,
    VISIT_TYPE_FINISHING_APARTMENTS,
    VISIT_TYPE_MIXED,
)

TOP_FAMILY_STRUCTURAL: Final = "STRUCTURAL_WORKS"
TOP_FAMILY_FINISHING: Final = "FINISHING_WORKS"
TOP_FAMILY_MECHANICAL: Final = "MECHANICAL_ELECTRICAL_SYSTEMS"
TOP_FAMILY_WATERPROOFING: Final = (
    "SYSTEM_WATERPROOFING_AND_INSULATION"
)

ALL_TOP_FAMILIES: Final = (
    TOP_FAMILY_STRUCTURAL,
    TOP_FAMILY_FINISHING,
    TOP_FAMILY_MECHANICAL,
    TOP_FAMILY_WATERPROOFING,
)

VISIT_TYPE_CONFIG: dict[str, dict] = {
    VISIT_TYPE_STRUCTURE_SITE: {
        "code": VISIT_TYPE_STRUCTURE_SITE,
        "label_he": "שלד / אתר",
        "allowed_top_families": (
            TOP_FAMILY_STRUCTURAL,
            TOP_FAMILY_MECHANICAL,
            TOP_FAMILY_WATERPROOFING,
        ),
    },
    VISIT_TYPE_FINISHING_APARTMENTS: {
        "code": VISIT_TYPE_FINISHING_APARTMENTS,
        "label_he": "גמר דירות",
        "allowed_top_families": (
            TOP_FAMILY_FINISHING,
            TOP_FAMILY_MECHANICAL,
            TOP_FAMILY_WATERPROOFING,
        ),
    },
    VISIT_TYPE_MIXED: {
        "code": VISIT_TYPE_MIXED,
        "label_he": "סיור משולב",
        "allowed_top_families": ALL_TOP_FAMILIES,
    },
}


def is_valid_visit_type(visit_type: str) -> bool:
    return visit_type in VISIT_TYPE_CONFIG


def list_visit_types() -> list[dict]:
    return list(VISIT_TYPE_CONFIG.values())


def allowed_top_families(visit_type: str) -> tuple[str, ...]:
    config = VISIT_TYPE_CONFIG.get(visit_type)
    if not config:
        return ()
    return tuple(config["allowed_top_families"])
