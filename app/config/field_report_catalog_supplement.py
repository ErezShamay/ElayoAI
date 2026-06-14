"""Embedded catalog supplement - supervision pivot stage D (P6).

Provides the Israeli supervision defect catalog when markdown sources are
unavailable, or as an extension on top of the parsed md_files catalog.
"""

from __future__ import annotations

from app.config.field_report_catalog_supervision_seed import (
    SUPERVISION_CATALOG_ISSUES,
    SUPERVISION_CATALOG_VERSION,
)

SUPPLEMENT_CATALOG_VERSION = SUPERVISION_CATALOG_VERSION
SUPPLEMENT_ISSUES: tuple[dict, ...] = SUPERVISION_CATALOG_ISSUES

SUPPLEMENT_CATEGORIES: tuple[dict, ...] = tuple(
    {
        "top_family": issue["top_family"],
        "category_id": issue["category_id"],
        "category_name_he": issue["category_name_he"],
        "category_standard_id": issue["category_standard_id"],
        "target_elements": issue["target_elements"],
    }
    for issue in SUPPLEMENT_ISSUES
)

_seen_categories: set[tuple[str, str]] = set()
SUPPLEMENT_CATEGORIES_UNIQUE: list[dict] = []
for category in SUPPLEMENT_CATEGORIES:
    key = (category["top_family"], category["category_id"])
    if key in _seen_categories:
        continue
    _seen_categories.add(key)
    SUPPLEMENT_CATEGORIES_UNIQUE.append(category)

SUPPLEMENT_FAMILIES: tuple[dict, ...] = tuple(
    {
        "top_family": family,
        "source_file": "field_report_catalog_supervision_seed.py",
        "issue_count": sum(
            1 for issue in SUPPLEMENT_ISSUES if issue["top_family"] == family
        ),
    }
    for family in sorted({issue["top_family"] for issue in SUPPLEMENT_ISSUES})
)
