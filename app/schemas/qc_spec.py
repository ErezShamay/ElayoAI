"""
Canonical documentation registry (ElayoAI v1.2).

Product: docs/PRODUCT-SPEC-LOCKED.md
Implementation: docs/FIELD-REPORT-FINALIZE-PIPELINE.md
"""

from __future__ import annotations

from pathlib import Path

QC_SPEC_VERSION = "1.2.0"

CANONICAL_DOCS: tuple[str, ...] = (
    "PRODUCT-SPEC-LOCKED.md",
    "FIELD-REPORT-FINALIZE-PIPELINE.md",
    "FIELD-REPORT-CHECKLISTS.md",
    "HANDOFF-AGENT-PROMPT.md",
    "PILOT-CHECKLIST.md",
    "field-reports-inspector-guide.md",
    "field-reports-sync-monitoring.md",
)

# Backward-compatible alias for existing gate imports.
QC_SPEC_DOCUMENTS: tuple[str, ...] = CANONICAL_DOCS

QC_SPEC_GATE_CRITERIA: tuple[tuple[str, str], ...] = (
    ("product_spec", "1.2"),
    ("finalize_pipeline", "1.2"),
    ("checklists", "1.2"),
    ("handoff", "1.2"),
    ("pilot_checklist", "1.2"),
    ("inspector_guide", "1.2"),
    ("sync_monitoring", "1.2"),
)


def docs_root() -> Path:
    return Path(__file__).resolve().parents[2] / "docs"


def qc_spec_root() -> Path:
    return docs_root()


def validate_qc_spec_documents() -> list[str]:
    """Return list of missing canonical document filenames."""
    root = docs_root()
    missing: list[str] = []
    for filename in CANONICAL_DOCS:
        if not (root / filename).is_file():
            missing.append(filename)
    return missing


def is_qc_spec_gate_complete() -> bool:
    return len(validate_qc_spec_documents()) == 0
