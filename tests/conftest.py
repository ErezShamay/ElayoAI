import os

import pytest

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("ORG_FLOW_LLM_MODE", "mock")


@pytest.fixture(autouse=True)
def freeze_quality_portfolio_now(monkeypatch):
    from tests.quality_issues_test_support import qc_now

    monkeypatch.setattr(
        "app.services.quality_issue_service._utc_now",
        qc_now,
    )
