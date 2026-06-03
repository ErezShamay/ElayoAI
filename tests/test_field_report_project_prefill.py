from __future__ import annotations

from app.config.field_report_project_scheme import project_scheme_label_he
from app.services.field_report_project_prefill import (
    merge_project_prefill_into_header_fields,
    project_metadata_from_project,
    stakeholders_from_project,
)
from app.services.field_visit_report_service import _merge_header_fields


def test_project_scheme_label_he():
    assert project_scheme_label_he("TAMA38_STRENGTHENING") == (
        'התחדשות עירונית - פרויקט חיזוק תמ"א'
    )


def test_stakeholders_from_project_skips_empty_names():
    stakeholders = stakeholders_from_project(
        {
            "developer_name": "יזם א",
            "lawyer_name": "",
            "developer_pm_name": "דני",
        }
    )
    roles = {item["role"] for item in stakeholders}
    assert roles == {"developer", "project_manager"}
    assert stakeholders[0]["name"] == "יזם א"


def test_project_metadata_from_project_scheme():
    metadata = project_metadata_from_project(
        {
            "scheme": "TAMA38_DEMOLITION_REBUILD",
            "city": "תל אביב",
        }
    )
    assert metadata["scheme"] == "TAMA38_DEMOLITION_REBUILD"
    assert "הריסה ובניה" in metadata["scheme_label_he"]
    assert metadata["site_address"] == "תל אביב"


def test_merge_prefill_does_not_override_explicit_header_fields():
    merged = merge_project_prefill_into_header_fields(
        {
            "scheme": "TAMA38_STRENGTHENING",
            "developer_name": "יזם מפרויקט",
        },
        {
            "project_metadata": {
                "scheme": "TAMA38_RELOCATED_BUILD",
                "scheme_label_he": "מותאם",
            },
            "stakeholders": [
                {
                    "id": "s1",
                    "role": "developer",
                    "name": "יזם בדוח",
                    "label_he": "יזם",
                }
            ],
        },
    )
    assert merged["project_metadata"]["scheme"] == "TAMA38_RELOCATED_BUILD"
    assert merged["stakeholders"][0]["name"] == "יזם בדוח"


def test_merge_header_fields_prefills_metadata_and_stakeholders():
    merged = _merge_header_fields(
        {
            "scheme": "TAMA38_STRENGTHENING",
            "developer_name": "יזם בע״מ",
            "developer_pm_name": "מנהל",
            "lawyer_name": "עו״ד",
            "city": "חיפה",
        },
        None,
        visit_type="STRUCTURE_SITE",
        visit_date="2026-01-15",
    )
    assert merged["developer_name"] == "יזם בע״מ"
    assert merged["project_metadata"]["scheme"] == "TAMA38_STRENGTHENING"
    assert merged["scheme"] == "TAMA38_STRENGTHENING"
    roles = {item["role"] for item in merged["stakeholders"]}
    assert "developer" in roles
    assert "lawyer_tenants" in roles
    assert merged["project_metadata"]["site_address"] == "חיפה"
