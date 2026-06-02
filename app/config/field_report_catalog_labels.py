from __future__ import annotations

from typing import Final

TOP_FAMILY_LABELS_HE: Final[dict[str, str]] = {
    "STRUCTURAL_WORKS": "שלד, קונסטרוקציה ובטון",
    "FINISHING_WORKS": "עבודות גמר ופנים",
    "MECHANICAL_ELECTRICAL_SYSTEMS": "מערכות אלקטרו-מכניות",
    "SYSTEM_WATERPROOFING_AND_INSULATION": "איטום ובידוד",
}


def top_family_label_he(top_family: str) -> str:
    return TOP_FAMILY_LABELS_HE.get(
        top_family,
        top_family.replace("_", " ").title(),
    )
