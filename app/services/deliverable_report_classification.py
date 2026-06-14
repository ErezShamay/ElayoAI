from __future__ import annotations

import re
from typing import Literal

DeliverableReportType = Literal[
    "weekly",
    "handover_protocol",
    "annual_bedek",
    "home_bedek",
]

DELIVERABLE_REPORT_TYPE_LABELS_HE: dict[DeliverableReportType, str] = {
    "weekly": "דוח שבועי",
    "handover_protocol": "פרוטוקול מסירה",
    "annual_bedek": "דוח שנת בדק",
    "home_bedek": "דוח בדק בית",
}

_HANDOVER_KEYWORDS = (
    "פרוטוקול מסירה",
    "פרוטוקול המסירה",
    "מסירת דירה",
    "מסירת דירות",
    "מסירה לדירה",
    "מסירה לדייר",
    "שטחים ציבוריים",
    "handover",
    "מסירה",
    "פרוטוקול",
)

_ANNUAL_BEDEK_KEYWORDS = (
    "שנת בדק",
    "בדק שנתי",
    "דוח שנתי",
    "annual bedek",
    "שנתי בדק",
)

_HOME_BEDEK_KEYWORDS = (
    "בדק בית",
    "בדקית",
    "דוח בדק",
    "home bedek",
    "בדק דירה",
)

_WEEKLY_KEYWORDS = (
    "דוח שבועי",
    "שבועי",
    "weekly",
)


def _normalize_text(*parts: str | None) -> str:
    joined = " ".join(
        part.strip()
        for part in parts
        if part and str(part).strip()
    )
    return re.sub(r"\s+", " ", joined).lower()


def _contains_keyword(text: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword.lower() in text for keyword in keywords)


def classify_deliverable_report(
    *,
    title: str | None = None,
    filename: str | None = None,
    visit_type_label: str | None = None,
    default_weekly: bool = False,
) -> DeliverableReportType:
    text = _normalize_text(title, filename, visit_type_label)

    if _contains_keyword(text, _HANDOVER_KEYWORDS):
        return "handover_protocol"

    if _contains_keyword(text, _ANNUAL_BEDEK_KEYWORDS):
        return "annual_bedek"

    if _contains_keyword(text, _HOME_BEDEK_KEYWORDS):
        return "home_bedek"

    if _contains_keyword(text, _WEEKLY_KEYWORDS) or default_weekly:
        return "weekly"

    return "weekly"


def deliverable_report_type_label_he(
    report_type: DeliverableReportType,
) -> str:
    return DELIVERABLE_REPORT_TYPE_LABELS_HE[report_type]
