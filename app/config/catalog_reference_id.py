from __future__ import annotations

import re

_STANDARD_NUM_RE = re.compile(r"(\d{3,5})")


def derive_catalog_reference_id(issue: dict) -> str:
    """Build a stable catalog reference when not explicitly seeded."""
    explicit = (issue.get("catalog_reference_id") or "").strip()
    if explicit:
        return explicit.upper()

    issue_id = str(issue.get("issue_id") or "").strip().upper()
    if issue_id:
        return f"IL-{issue_id.replace(' ', '-')}"

    standard_ref = str(issue.get("standard_ref") or "").strip()
    match = _STANDARD_NUM_RE.search(standard_ref)
    standard_token = match.group(1) if match else "0000"
    category_id = str(issue.get("category_id") or "GENERAL").upper()
    return f"IL-STD-{standard_token}-{category_id[:12]}"


def enrich_issue_catalog_reference_id(issue: dict) -> dict:
    enriched = dict(issue)
    enriched["catalog_reference_id"] = derive_catalog_reference_id(enriched)
    return enriched
