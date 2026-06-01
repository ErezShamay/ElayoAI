from __future__ import annotations

from functools import lru_cache

from app.config.field_report_visit_types import (
    allowed_top_families,
)
from app.services.field_report_catalog_parser import (
    load_catalog_from_directory,
)


class FieldReportCatalogService:
    @lru_cache(maxsize=1)
    def get_full_catalog(self) -> dict:
        return load_catalog_from_directory()

    def get_catalog_summary(self) -> dict:
        catalog = self.get_full_catalog()
        return {
            "catalog_version": catalog["catalog_version"],
            "issue_count": catalog["issue_count"],
            "families": catalog["families"],
            "errors": catalog["errors"],
        }

    def get_catalog_for_visit_type(
        self,
        visit_type: str,
    ) -> dict:
        catalog = self.get_full_catalog()
        allowed = set(allowed_top_families(visit_type))

        filtered_issues = [
            issue
            for issue in catalog["issues"]
            if issue["top_family"] in allowed
        ]
        filtered_categories = [
            category
            for category in catalog["categories"]
            if category["top_family"] in allowed
        ]
        filtered_families = [
            family
            for family in catalog["families"]
            if family["top_family"] in allowed
        ]

        return {
            "visit_type": visit_type,
            "catalog_version": catalog["catalog_version"],
            "allowed_top_families": sorted(allowed),
            "families": filtered_families,
            "categories": filtered_categories,
            "issues": filtered_issues,
            "issue_count": len(filtered_issues),
            "errors": catalog["errors"],
        }

    def find_issue(self, issue_id: str) -> dict | None:
        normalized = issue_id.strip().upper()
        for issue in self.get_full_catalog()["issues"]:
            if issue["issue_id"] == normalized:
                return issue
        return None
