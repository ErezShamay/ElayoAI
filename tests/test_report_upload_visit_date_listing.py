from app.services.report_processing_service import ReportProcessingService


def test_list_project_uploaded_reports_prefers_visit_date_for_sorting() -> None:
    service = ReportProcessingService()
    service.report_repository.get_reports_by_project = lambda project_id: [
        {
            "id": "older-upload",
            "email_subject": "old.pdf (v1)",
            "report_source": "GENERAL",
            "created_at": "2026-03-10T10:00:00Z",
        },
        {
            "id": "newer-upload",
            "email_subject": "new.pdf (v1)",
            "report_source": "QUALITY",
            "created_at": "2026-03-01T10:00:00Z",
            "reported_at": "2026-02-15",
        },
    ]
    service._get_interpretations_by_report_ids = lambda report_ids: {
        "older-upload": {
            "business_impact": "preview",
            "metadata": {"file_name": "old.pdf", "reported_at": "2026-01-05"},
        },
        "newer-upload": {
            "business_impact": "preview",
            "metadata": {"file_name": "new.pdf"},
        },
    }

    payload = service.list_project_uploaded_reports("project-1")

    assert payload["reports"][0]["id"] == "newer-upload"
    assert payload["reports"][0]["visit_date"] == "2026-02-15"
    assert payload["reports"][1]["id"] == "older-upload"
    assert payload["reports"][1]["visit_date"] == "2026-01-05"
