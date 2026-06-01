from __future__ import annotations

from app.services.field_report_catalog_parser import (
    load_catalog_from_directory,
)
from app.services.field_report_catalog_service import (
    FieldReportCatalogService,
)


def test_catalog_loads_154_issues():
    catalog = load_catalog_from_directory()
    assert catalog["catalog_version"] == "1.1.0"
    assert catalog["issue_count"] == 154
    assert catalog["errors"] == []


def test_catalog_filters_by_visit_type():
    service = FieldReportCatalogService()
    structure = service.get_catalog_for_visit_type("STRUCTURE_SITE")
    finishing = service.get_catalog_for_visit_type(
        "FINISHING_APARTMENTS"
    )

    structure_families = {
        item["top_family"] for item in structure["issues"]
    }
    finishing_families = {
        item["top_family"] for item in finishing["issues"]
    }

    assert "STRUCTURAL_WORKS" in structure_families
    assert "STRUCTURAL_WORKS" not in finishing_families
    assert "FINISHING_WORKS" in finishing_families
    assert "FINISHING_WORKS" not in structure_families


def test_find_issue_str_02_001():
    service = FieldReportCatalogService()
    issue = service.find_issue("str-02-001")
    assert issue is not None
    assert issue["issue_id"] == "STR-02-001"
    assert "466" in (issue.get("standard_ref") or "")
