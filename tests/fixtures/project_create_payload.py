"""Shared valid payload for POST /projects integration tests."""

from __future__ import annotations


def valid_create_project_payload(**overrides) -> dict:
    payload = {
        "project_name": "Tower Z1",
        "developer_name": "Dev Co",
        "contractor_name": "Build Co",
        "lawyer_name": "Legal Co",
        "supervisor_name": "Noa",
        "supervisor_email": "noa@example.com",
        "scheme": "TAMA38_STRENGTHENING",
        "developer_pm_name": "Dana PM",
        "accompanying_lawyer": "Adv. Cohen",
        "architect_name": "Arch Studio",
        "site_manager_name": "Site Boss",
        "city": "Tel Aviv",
        "housing_units_count": 28,
        "floors_count": 7,
        "project_start_date": "2026-01-01",
        "project_end_date": "2028-06-01",
        "project_grace_end_date": "2028-12-01",
        "structure_documentation_date": "2026-03-01",
        "developer_email": "dev@example.com",
        "developer_pm_email": "dana@example.com",
        "site_manager_email": "site@example.com",
        "contractor_email": "build@example.com",
        "lawyer_email": "legal@example.com",
        "accompanying_lawyer_email": "cohen@example.com",
        "architect_email": "arch@example.com",
    }
    payload.update(overrides)
    return payload
