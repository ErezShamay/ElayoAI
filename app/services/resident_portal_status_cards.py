from __future__ import annotations

from typing import Literal

from app.schemas.project_apartment import ResidentPortalStatusCard
from app.schemas.quality_issue import QualityIssueSeverity, QualityIssueStatus
from app.services.field_report_catalog_service import FieldReportCatalogService

StatusLevel = Literal["green", "yellow", "red"]

SEALING_CARD_KEY = "sealing"
STRUCTURE_CARD_KEY = "structure"

SEALING_TOP_FAMILIES = frozenset({"SYSTEM_WATERPROOFING_AND_INSULATION"})
STRUCTURE_TOP_FAMILIES = frozenset({"STRUCTURAL_WORKS"})

OPEN_STATUSES = frozenset(
    {
        QualityIssueStatus.OPEN.value,
        QualityIssueStatus.IN_REMEDIATION.value,
        QualityIssueStatus.PENDING_VERIFICATION.value,
        QualityIssueStatus.REOPENED.value,
    }
)

CRITICAL_OPEN_STATUSES = frozenset(
    {
        QualityIssueStatus.OPEN.value,
        QualityIssueStatus.REOPENED.value,
    }
)

STATUS_CARD_DEFINITIONS: tuple[tuple[str, str, frozenset[str]], ...] = (
    (
        SEALING_CARD_KEY,
        "סטטוס איטום מרפסת",
        SEALING_TOP_FAMILIES,
    ),
    (
        STRUCTURE_CARD_KEY,
        "סטטוס שלד",
        STRUCTURE_TOP_FAMILIES,
    ),
)


def _normalize_status(value: object) -> str:
    return str(value or "").strip().upper()


def _normalize_severity(value: object) -> str:
    return str(value or "").strip().upper()


def resolve_issue_trust_category(
    issue: dict,
    *,
    catalog_service: FieldReportCatalogService | None = None,
) -> str | None:
    catalog = catalog_service or FieldReportCatalogService()
    catalog_issue_id = str(issue.get("catalog_issue_id") or "").strip().upper()
    if catalog_issue_id:
        catalog_issue = catalog.find_issue(catalog_issue_id)
        if catalog_issue:
            top_family = str(catalog_issue.get("top_family") or "")
            category_name_he = str(catalog_issue.get("category_name_he") or "")
            if top_family in STRUCTURE_TOP_FAMILIES:
                return STRUCTURE_CARD_KEY
            if top_family in SEALING_TOP_FAMILIES or "איטום" in category_name_he:
                return SEALING_CARD_KEY

    searchable = " ".join(
        str(issue.get(field) or "")
        for field in ("trade", "title", "description", "standard_ref")
    )
    if "איטום" in searchable or "מרפס" in searchable:
        return SEALING_CARD_KEY
    if "שלד" in searchable:
        return STRUCTURE_CARD_KEY
    return None


def compute_card_level(issues: list[dict]) -> StatusLevel:
    if not issues:
        return "green"

    for issue in issues:
        status = _normalize_status(issue.get("status"))
        severity = _normalize_severity(issue.get("severity"))
        if (
            severity == QualityIssueSeverity.CRITICAL.value
            and status in CRITICAL_OPEN_STATUSES
        ):
            return "red"

    for issue in issues:
        status = _normalize_status(issue.get("status"))
        if status in OPEN_STATUSES:
            return "yellow"

    return "green"


def build_status_cards(issues: list[dict]) -> list[ResidentPortalStatusCard]:
    catalog_service = FieldReportCatalogService()
    grouped: dict[str, list[dict]] = {
        SEALING_CARD_KEY: [],
        STRUCTURE_CARD_KEY: [],
    }

    for issue in issues:
        category_key = resolve_issue_trust_category(
            issue,
            catalog_service=catalog_service,
        )
        if category_key in grouped:
            grouped[category_key].append(issue)

    cards: list[ResidentPortalStatusCard] = []
    for card_key, title, _families in STATUS_CARD_DEFINITIONS:
        category_issues = grouped[card_key]
        open_count = sum(
            1
            for issue in category_issues
            if _normalize_status(issue.get("status")) in OPEN_STATUSES
        )
        closed_count = sum(
            1
            for issue in category_issues
            if _normalize_status(issue.get("status"))
            == QualityIssueStatus.CLOSED.value
        )
        critical_open_count = sum(
            1
            for issue in category_issues
            if _normalize_severity(issue.get("severity"))
            == QualityIssueSeverity.CRITICAL.value
            and _normalize_status(issue.get("status")) in CRITICAL_OPEN_STATUSES
        )
        cards.append(
            ResidentPortalStatusCard(
                card_key=card_key,
                title=title,
                level=compute_card_level(category_issues),
                open_count=open_count,
                closed_count=closed_count,
                critical_open_count=critical_open_count,
                issue_count=len(category_issues),
            )
        )

    return cards
