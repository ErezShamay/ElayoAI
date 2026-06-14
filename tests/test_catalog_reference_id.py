from app.config.catalog_reference_id import (
    derive_catalog_reference_id,
    enrich_issue_catalog_reference_id,
)


def test_derive_catalog_reference_id_prefers_explicit_value() -> None:
    issue = enrich_issue_catalog_reference_id(
        {
            "issue_id": "QC-STR-001",
            "catalog_reference_id": "IL-STD-466-STEEL-COVER",
            "standard_ref": 'ת"י 466',
            "category_id": "REINFORCEMENT_STEEL",
        }
    )
    assert issue["catalog_reference_id"] == "IL-STD-466-STEEL-COVER"


def test_derive_catalog_reference_id_from_issue_id() -> None:
    ref = derive_catalog_reference_id({"issue_id": "sup-str-003"})
    assert ref == "IL-SUP-STR-003"
