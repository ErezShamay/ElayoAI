from __future__ import annotations

from pathlib import Path

import pytest

from app.services.attachment_processor_service import (
    AttachmentProcessorService,
)

SAMPLE_PDF = Path(__file__).resolve().parents[1] / "sample_reports" / "weekly_report.pdf"


@pytest.fixture
def sample_pdf_path() -> Path:
    if not SAMPLE_PDF.is_file():
        pytest.skip(f"Missing sample PDF: {SAMPLE_PDF}")
    return SAMPLE_PDF


def test_extract_text_from_weekly_report_pdf(sample_pdf_path: Path) -> None:
    service = AttachmentProcessorService()
    text = service.extract_text_from_pdf(str(sample_pdf_path))

    assert isinstance(text, str)
    assert text.strip()
