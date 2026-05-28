from datetime import UTC, datetime, timedelta

from app.services.report_processing_service import ReportProcessingService


def test_report_search_engine_ranks_matches():
    service = ReportProcessingService()
    service.report_index = {
        "r1": {
            "project_id": "p1",
            "report_id": "r1",
            "filename": "delay-report.pdf",
            "classification": "DELAY",
            "tags": ["safety"],
            "tokens": ["delay", "report", "pdf", "safety"],
            "indexed_at": "2026-01-01T00:00:00Z",
        },
        "r2": {
            "project_id": "p1",
            "report_id": "r2",
            "filename": "quality-report.pdf",
            "classification": "QUALITY",
            "tags": ["quality"],
            "tokens": ["quality", "report", "pdf"],
            "indexed_at": "2026-01-01T00:00:01Z",
        },
    }

    payload = service.search_reports("p1", query="delay", tag="safety", classification="delay")
    assert payload["total_matches"] == 1
    assert payload["report_ids"] == ["r1"]
    assert payload["results"][0]["matched_terms"] == ["delay"]
    assert payload["results"][0]["score"] > 0


def test_report_search_engine_filter_only_query():
    service = ReportProcessingService()
    service.report_index = {
        "r1": {
            "project_id": "p1",
            "report_id": "r1",
            "filename": "weekly-report.pdf",
            "classification": "DELAY",
            "tags": ["delay"],
            "tokens": ["delay", "weekly", "pdf"],
            "indexed_at": "2026-01-01T00:00:00Z",
        },
        "r2": {
            "project_id": "p1",
            "report_id": "r2",
            "filename": "budget-report.pdf",
            "classification": "BUDGET",
            "tags": ["budget"],
            "tokens": ["budget", "weekly", "pdf"],
            "indexed_at": "2026-01-01T00:00:02Z",
        },
    }

    payload = service.search_reports("p1", tag="budget")
    assert payload["total_matches"] == 1
    assert payload["report_ids"] == ["r2"]


def test_report_search_engine_partial_match_support():
    service = ReportProcessingService()
    service.report_index = {
        "r1": {
            "project_id": "p1",
            "report_id": "r1",
            "filename": "weekly-delay-brief.pdf",
            "classification": "DELAY",
            "tags": ["delay"],
            "tokens": ["weekly-delay", "brief", "pdf"],
            "indexed_at": "2026-01-01T00:00:00Z",
        }
    }

    payload = service.search_reports("p1", query="delay")
    assert payload["total_matches"] == 1
    assert payload["results"][0]["partial_matches"] == ["delay"]


def test_report_search_engine_recency_weighting():
    service = ReportProcessingService()
    now = datetime.now(UTC).isoformat()
    old = (datetime.now(UTC) - timedelta(days=180)).isoformat()
    service.report_index = {
        "r_recent": {
            "project_id": "p1",
            "report_id": "r_recent",
            "filename": "delay-latest.pdf",
            "classification": "DELAY",
            "tags": [],
            "tokens": ["delay", "latest"],
            "indexed_at": now,
        },
        "r_old": {
            "project_id": "p1",
            "report_id": "r_old",
            "filename": "delay-archive.pdf",
            "classification": "DELAY",
            "tags": [],
            "tokens": ["delay", "archive"],
            "indexed_at": old,
        },
    }

    payload = service.search_reports("p1", query="delay")
    assert payload["total_matches"] == 2
    assert payload["report_ids"][0] == "r_recent"
