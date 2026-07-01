import os

# These must be set before `import app.dependencies` below: app.dependencies
# eagerly constructs the process-wide Settings singleton (and everything it
# wires up) at import time, so anything that reads os.environ inside that
# construction needs its defaults in place first. Getting this backwards is
# a latent bug that a real .env file (with ENVIRONMENT already set) can mask
# - it only surfaces as ENVIRONMENT resolving to "local" instead of "test"
# when no .env file is present (e.g. a clean checkout/CI without one).
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("ORG_FLOW_LLM_MODE", "mock")

import pytest
import app.dependencies as deps


@pytest.fixture(autouse=True)
def freeze_quality_portfolio_now(monkeypatch):
    from tests.quality_issues_test_support import qc_now

    monkeypatch.setattr(
        "app.services.quality_issue_service._utc_now",
        qc_now,
    )


@pytest.fixture(autouse=True)
def patch_supervisor_profile_lookup_for_tests(monkeypatch):
    from tests.test_supervisor_project_scope import FakeProfileRepository

    class PermissiveProfileRepository(FakeProfileRepository):
        def __init__(self) -> None:
            super().__init__({})

        def get_profile_by_id(self, profile_id: str):
            if not profile_id:
                return None
            return {
                "id": profile_id,
                "email": "supervisor@test.com",
            }

    profile_repository = PermissiveProfileRepository()

    import app.main as main_module

    monkeypatch.setattr(
        deps.tenant_scope_service,
        "profile_repository",
        profile_repository,
    )
    monkeypatch.setattr(
        deps.quality_issue_service,
        "profile_repository",
        profile_repository,
    )
