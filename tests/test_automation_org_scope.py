from unittest.mock import patch

from app.repositories.ai_execution_log_repository import (
    AIExecutionLogRepository,
)
from app.services.automation_monitoring_service import (
    AutomationMonitoringService,
)


def test_get_circuit_breakers_hidden_for_organization_scope():

    service = AutomationMonitoringService()

    assert service.get_circuit_breakers(
        organization_id="org-1",
    ) == []


def test_build_health_alerts_skips_circuit_breakers_for_org_scope():

    service = AutomationMonitoringService()

    alerts = service.build_health_alerts(
        summary={
            "failed_runs": 0,
            "completed_with_errors": 0,
        },
        circuit_breaker_summary={
            "open": 2,
        },
        ai_recovery={
            "dead_letter_count": 0,
        },
        include_circuit_breaker_alerts=False,
    )

    assert alerts == []


def test_apply_organization_scope_without_projects():

    repository = AIExecutionLogRepository()

    class FakeRequest:
        def __init__(self):
            self.filters = []

        def eq(self, column, value):
            self.filters.append(
                ("eq", column, value)
            )
            return self

        def or_(self, expression):
            self.filters.append(
                ("or", expression)
            )
            return self

    request = FakeRequest()
    repository._supports_organization_id_column = True

    repository._apply_organization_scope(
        request,
        "org-123",
        [],
    )

    assert request.filters == [
        ("eq", "organization_id", "org-123"),
    ]


def test_apply_organization_scope_with_projects():

    repository = AIExecutionLogRepository()

    class FakeRequest:
        def __init__(self):
            self.filters = []

        def eq(self, column, value):
            self.filters.append(
                ("eq", column, value)
            )
            return self

        def or_(self, expression):
            self.filters.append(
                ("or", expression)
            )
            return self

        def in_(self, column, values):
            self.filters.append(
                ("in", column, values)
            )
            return self

    request = FakeRequest()
    repository._supports_organization_id_column = True

    repository._apply_organization_scope(
        request,
        "org-123",
        ["project-a", "project-b"],
    )

    assert len(request.filters) == 1
    assert request.filters[0][0] == "or"
    assert "organization_id.eq.org-123" in request.filters[0][1]
    assert "project_id.in.(project-a,project-b)" in request.filters[0][1]


def test_get_recent_runs_returns_empty_list_when_data_is_none():

    service = AutomationMonitoringService()

    class FakeResponse:
        data = None

    class FakeRequest:
        def order(self, *args, **kwargs):
            return self

        def limit(self, *args, **kwargs):
            return self

        def execute(self):
            return FakeResponse()

    with patch.object(
        service,
        "_scoped_automation_runs_query",
        return_value=FakeRequest(),
    ):
        assert service.get_recent_runs(
            organization_id="org-tenant",
        ) == []


def test_org_health_dashboard_ignores_platform_circuit_breakers():

    service = AutomationMonitoringService()

    with patch.object(
        service,
        "get_recent_runs",
        return_value=[],
    ), patch.object(
        service,
        "get_ai_recovery_monitoring",
        return_value={
            "recovery_queue_count": 0,
            "dead_letter_count": 0,
        },
    ):
        dashboard = service.get_automation_health_dashboard(
            organization_id="org-tenant",
        )

    assert dashboard["health"] == "NO_DATA"
    assert dashboard["has_activity"] is False
    assert dashboard["circuit_breaker_summary"]["open"] == 0
    assert dashboard["alerts"] == []
