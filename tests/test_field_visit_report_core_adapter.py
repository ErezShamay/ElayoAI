from __future__ import annotations

from pathlib import Path

from app.services.field_visit_report_core_adapter import (
    FieldVisitReportCoreAdapter,
)


class FakeReportProcessingService:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def process_uploaded_report(
        self,
        *,
        project_id: str,
        filename: str,
        file_path: str,
    ) -> dict:
        path = Path(file_path)
        self.calls.append(
            {
                "project_id": project_id,
                "filename": filename,
                "file_path": file_path,
                "path_exists_during_call": path.exists(),
                "file_size": path.stat().st_size if path.exists() else 0,
            }
        )
        return {
            "success": True,
            "project_id": project_id,
            "filename": filename,
        }


def test_send_closed_report_forwards_to_core_pipeline_and_cleans_temp_file():
    fake_processing = FakeReportProcessingService()
    adapter = FieldVisitReportCoreAdapter(
        report_processing_service=fake_processing
    )

    result = adapter.send_closed_report(
        project_id="project-1",
        source_filename="visit-summary.pdf",
        source_content=b"%PDF-1.4\nvisit\n%%EOF\n",
        fallback_filename="fallback.pdf",
    )

    assert result["success"] is True
    assert len(fake_processing.calls) == 1
    call = fake_processing.calls[0]
    assert call["project_id"] == "project-1"
    assert call["filename"] == "visit-summary.pdf"
    assert call["path_exists_during_call"] is True
    assert call["file_size"] > 0
    assert Path(call["file_path"]).exists() is False


def test_send_closed_report_uses_fallback_filename_when_source_is_blank():
    fake_processing = FakeReportProcessingService()
    adapter = FieldVisitReportCoreAdapter(
        report_processing_service=fake_processing
    )

    result = adapter.send_closed_report(
        project_id="project-1",
        source_filename="   ",
        source_content=b"%PDF-1.4\nvisit\n%%EOF\n",
        fallback_filename="field-visit-2026-06-02-report-1.pdf",
    )

    assert result["success"] is True
    assert fake_processing.calls[0]["filename"] == (
        "field-visit-2026-06-02-report-1.pdf"
    )


def test_send_closed_report_rejects_empty_content_without_calling_core():
    fake_processing = FakeReportProcessingService()
    adapter = FieldVisitReportCoreAdapter(
        report_processing_service=fake_processing
    )

    result = adapter.send_closed_report(
        project_id="project-1",
        source_filename="visit.pdf",
        source_content=b"",
        fallback_filename="fallback.pdf",
    )

    assert result == {
        "success": False,
        "error_code": "FIELD_VISIT_REPORT_EMPTY_FILE",
        "error_message": "קובץ הדוח ריק",
    }
    assert fake_processing.calls == []
