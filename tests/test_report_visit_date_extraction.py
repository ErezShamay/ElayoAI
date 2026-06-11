from app.services.report_visit_date_extraction import extract_visit_date


def test_extract_visit_date_from_labeled_hebrew_text() -> None:
    assert (
        extract_visit_date(
            filename="report.pdf",
            extracted_text="תאריך ביקור: 15/03/2026\nסיכום הביקור",
        )
        == "2026-03-15"
    )


def test_extract_visit_date_from_filename() -> None:
    assert (
        extract_visit_date(
            filename="weekly_2026-02-03.pdf",
            extracted_text="",
        )
        == "2026-02-03"
    )


def test_extract_visit_date_from_dot_separated_body() -> None:
    assert (
        extract_visit_date(
            filename="report.pdf",
            extracted_text="Visit date 03.02.2026 site walk",
        )
        == "2026-02-03"
    )


def test_extract_visit_date_returns_none_when_missing() -> None:
    assert (
        extract_visit_date(
            filename="report.bin",
            extracted_text="[OCR_FALLBACK:bin] Unable to extract machine text",
        )
        is None
    )
