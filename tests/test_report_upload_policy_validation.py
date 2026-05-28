from pathlib import Path

from app.services.report_processing_service import ReportProcessingService


def test_upload_policy_rejects_unsupported_file_type(tmp_path: Path):
    service = ReportProcessingService()
    target = tmp_path / "payload.exe"
    target.write_bytes(b"dummy")

    result = service._validate_upload_policy("payload.exe", str(target))
    assert result["is_valid"] is False
    assert result["error_code"] == "UNSUPPORTED_FILE_TYPE"


def test_upload_policy_rejects_oversized_file(tmp_path: Path):
    service = ReportProcessingService()
    target = tmp_path / "weekly-report.pdf"
    target.write_bytes(b"x" * (ReportProcessingService.MAX_REPORT_FILE_SIZE_BYTES + 1))

    result = service._validate_upload_policy("weekly-report.pdf", str(target))
    assert result["is_valid"] is False
    assert result["error_code"] == "FILE_TOO_LARGE"
