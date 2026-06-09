from unittest.mock import patch

from app.services.automation_monitoring_service import (
    AutomationMonitoringService,
)


def test_has_activity_includes_ai_runtime_logs():
    service = AutomationMonitoringService()

    assert service._has_observed_automation_activity(
        {"total_runs": 0, "failed_runs": 0, "completed_with_errors": 0},
        {"recent_count": 0, "recovery_queue_count": 0, "dead_letter_count": 0},
        {"total": 3, "failed": 0, "successful": 3},
    )


def test_resolve_ai_runtime_health_marks_successful_runtime_as_healthy():
    service = AutomationMonitoringService()

    assert service.resolve_ai_runtime_health({
        "total": 2,
        "failed": 0,
        "successful": 2,
    }) == "HEALTHY"


def test_health_dashboard_uses_ai_runtime_when_no_automation_runs():
    service = AutomationMonitoringService()

    with patch.object(
        service,
        "get_recent_runs",
        return_value=[],
    ), patch.object(
        service,
        "get_ai_recovery_monitoring",
        return_value={
            "recent_count": 0,
            "recovery_queue_count": 0,
            "dead_letter_count": 0,
        },
    ), patch.object(
        service,
        "build_ai_runtime_summary",
        return_value={
            "total": 4,
            "failed": 0,
            "successful": 4,
            "success_rate": 100.0,
        },
    ):
        dashboard = service.get_automation_health_dashboard(
            organization_id="org-tenant",
        )

    assert dashboard["has_activity"] is True
    assert dashboard["health"] == "HEALTHY"
