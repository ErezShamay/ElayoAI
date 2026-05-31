from app.config.settings import settings
from app.services.tenant_extraction_service import TenantExtractionService


def test_extract_mock_parses_tab_separated_lines(monkeypatch):
    monkeypatch.setattr(
        type(settings),
        "get_active_openai_api_key",
        lambda self: None,
    )
    service = TenantExtractionService()
    result = service.extract_from_text("12\tישראל ישראלי\t0501234567\ta@b.com")
    assert result["error"] is None
    assert len(result["tenants"]) == 1
    assert result["tenants"][0]["apartment"] == "12"
    assert result["tenants"][0]["name"] == "ישראל ישראלי"


def test_extract_empty_text_returns_error(monkeypatch):
    monkeypatch.setattr(
        type(settings),
        "get_active_openai_api_key",
        lambda self: None,
    )
    service = TenantExtractionService()
    result = service.extract_from_text("   ")
    assert result["tenants"] == []
    assert result["error"]
