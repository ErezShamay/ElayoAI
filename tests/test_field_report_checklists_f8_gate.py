"""Gate F8 — field report checklists (§20 FIELD-REPORT-FINALIZE-PIPELINE)."""

from __future__ import annotations

from pathlib import Path

from app.config.field_report_catalog_supervision_seed import (
    SUPERVISION_CATALOG_ISSUES,
    SUPERVISION_CATALOG_VERSION,
)
from app.schemas.field_report_checklists import (
    FIELD_REPORT_DOCUMENT_TYPES,
    HANDOVER_PROTOCOL_WIZARD_ENABLED,
    VISIT_SCOPE_HANDOVER,
    VISIT_SCOPES_WEEKLY,
)

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_checklists_doc_exists() -> None:
    doc_path = REPO_ROOT / "docs" / "FIELD-REPORT-CHECKLISTS.md"
    body = doc_path.read_text(encoding="utf-8")

    assert "PROGRESS — קריטריוני קבלה F8" in body
    assert "HANDOVER" in body
    assert "weekly_inspection" in body


def test_supervision_catalog_covers_apartment_and_public_areas() -> None:
  assert SUPERVISION_CATALOG_VERSION == "1.4.0-supervision-checklist"
  assert len(SUPERVISION_CATALOG_ISSUES) >= 30

  scopes = {issue["scope"] for issue in SUPERVISION_CATALOG_ISSUES}
  assert "APARTMENT" in scopes
  assert "PUBLIC_AREA" in scopes
  assert "BOTH" in scopes

  public_area_ids = {
      issue["public_area_id"]
      for issue in SUPERVISION_CATALOG_ISSUES
      if issue.get("public_area_id")
  }
  assert len(public_area_ids) >= 6


def test_handover_scope_defined_but_wizard_disabled() -> None:
  assert "weekly_inspection" in FIELD_REPORT_DOCUMENT_TYPES
  assert "handover_protocol" in FIELD_REPORT_DOCUMENT_TYPES
  assert VISIT_SCOPE_HANDOVER == "HANDOVER"
  assert "APARTMENT" in VISIT_SCOPES_WEEKLY
  assert "PUBLIC_AREA" in VISIT_SCOPES_WEEKLY
  assert HANDOVER_PROTOCOL_WIZARD_ENABLED is False
