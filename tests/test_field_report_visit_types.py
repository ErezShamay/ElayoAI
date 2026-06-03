from __future__ import annotations

from app.config.field_report_construction_progress import (
    default_construction_progress_rows,
)
from app.config.field_report_visit_types import (
    ALL_TOP_FAMILIES,
    VISIT_TYPE_CONFIG,
    VISIT_TYPE_MIXED,
    allowed_top_families,
    is_valid_visit_type,
    list_visit_types,
)
from app.services.field_report_catalog_service import (
    FieldReportCatalogService,
)


def test_mixed_visit_type_registered() -> None:
    assert is_valid_visit_type(VISIT_TYPE_MIXED)
    config = VISIT_TYPE_CONFIG[VISIT_TYPE_MIXED]
    assert config["label_he"] == "סיור משולב"
    assert tuple(config["allowed_top_families"]) == ALL_TOP_FAMILIES


def test_list_visit_types_includes_mixed() -> None:
    codes = {item["code"] for item in list_visit_types()}
    assert codes == {
        "STRUCTURE_SITE",
        "FINISHING_APARTMENTS",
        VISIT_TYPE_MIXED,
    }


def test_mixed_catalog_includes_all_top_families() -> None:
    service = FieldReportCatalogService()
    full = service.get_full_catalog()
    mixed = service.get_catalog_for_visit_type(VISIT_TYPE_MIXED)

    assert mixed["issue_count"] == full["issue_count"]
    assert set(mixed["allowed_top_families"]) == set(ALL_TOP_FAMILIES)

    mixed_families = {issue["top_family"] for issue in mixed["issues"]}
    full_families = {issue["top_family"] for issue in full["issues"]}
    assert mixed_families == full_families


def test_mixed_construction_progress_defaults() -> None:
    rows = default_construction_progress_rows(VISIT_TYPE_MIXED)
    finishing = default_construction_progress_rows("FINISHING_APARTMENTS")
    assert rows == finishing
    assert len(rows) > 0
