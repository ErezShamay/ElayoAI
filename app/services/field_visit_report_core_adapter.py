from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from app.services.report_processing_service import (
    ReportProcessingService,
)


class FieldVisitReportCoreAdapter:
    """
    Adapter for field-visit reports into the existing core report pipeline.

    Keeps ReportProcessingService behavior unchanged by translating
    field-visit payloads into the same input contract used by upload flows.
    """

    def __init__(
        self,
        report_processing_service: ReportProcessingService | None = None,
    ) -> None:
        self.report_processing_service = (
            report_processing_service or ReportProcessingService()
        )

    def send_closed_report(
        self,
        *,
        project_id: str,
        source_filename: str,
        source_content: bytes,
        fallback_filename: str,
    ) -> dict:
        if not source_content:
            return {
                "success": False,
                "error_code": "FIELD_VISIT_REPORT_EMPTY_FILE",
                "error_message": "קובץ הדוח ריק",
            }

        filename = source_filename.strip() if source_filename else ""
        if not filename:
            filename = fallback_filename

        suffix = Path(filename).suffix or ".pdf"
        with NamedTemporaryFile(
            mode="wb",
            suffix=suffix,
            delete=False,
        ) as temp_file:
            temp_file.write(source_content)
            temp_path = Path(temp_file.name)

        try:
            return self.report_processing_service.process_uploaded_report(
                project_id=project_id,
                filename=filename,
                file_path=str(temp_path),
            )
        finally:
            temp_path.unlink(missing_ok=True)
