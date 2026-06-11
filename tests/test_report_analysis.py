from __future__ import annotations

from pathlib import Path

import pytest

from app.services.attachment_processor_service import (
    AttachmentProcessorService,
)
from app.services.report_analysis_service import (
    ReportAnalysisService,
)

SAMPLE_PDF = Path(__file__).resolve().parents[1] / "sample_reports" / "weekly_report.pdf"


@pytest.fixture
def sample_pdf_path() -> Path:
    if not SAMPLE_PDF.is_file():
        pytest.skip(f"Missing sample PDF: {SAMPLE_PDF}")
    return SAMPLE_PDF


def test_analyze_weekly_report_pdf(sample_pdf_path: Path) -> None:
    pdf_service = AttachmentProcessorService()
    analysis_service = ReportAnalysisService()

    text = pdf_service.extract_text_from_pdf(str(sample_pdf_path))
    result = analysis_service.analyze_report(text)

    assert isinstance(result, dict)
    assert "findings" in result
