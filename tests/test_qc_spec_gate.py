from __future__ import annotations

from app.schemas.qc_spec import (
    CANONICAL_DOCS,
    QC_SPEC_DOCUMENTS,
    QC_SPEC_GATE_CRITERIA,
    QC_SPEC_VERSION,
    is_qc_spec_gate_complete,
    validate_qc_spec_documents,
)


def test_qc_spec_version() -> None:
    assert QC_SPEC_VERSION == "1.2.0"


def test_all_gate_criteria_documented() -> None:
    assert len(QC_SPEC_GATE_CRITERIA) == 7
    labels = {label for label, _ in QC_SPEC_GATE_CRITERIA}
    assert "product_spec" in labels
    assert "finalize_pipeline" in labels


def test_canonical_docs_exist_on_disk() -> None:
    missing = validate_qc_spec_documents()
    assert missing == [], f"Missing docs: {missing}"
    assert is_qc_spec_gate_complete() is True
    assert "PRODUCT-SPEC-LOCKED.md" in CANONICAL_DOCS
    assert "FIELD-REPORT-FINALIZE-PIPELINE.md" in QC_SPEC_DOCUMENTS
