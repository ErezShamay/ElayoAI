"""SLA monitoring should not spam notifications on every scheduler tick."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.services.alert_dedup_store import SlaOverdueAlertDedupStore
from app.services.sla_monitoring_service import SLAMonitoringService


def _overdue_action(action_id: str = "action-1") -> dict:
    return {
        "id": action_id,
        "project_id": "project-1",
        "title": "תיקון מעקה",
        "assigned_to": "profile-1",
        "due_date": "2020-01-01T00:00:00+00:00",
    }


def test_sla_monitoring_notifies_once_per_overdue_action() -> None:
    dedup_store = SlaOverdueAlertDedupStore()
    notifications = MagicMock()
    repository = MagicMock()
    repository.create_action.return_value = {"id": "escalation-1"}
    service = SLAMonitoringService(dedup_store=dedup_store)
    service.repository = repository
    service.automation_notifications = notifications
    escalation_parent_ids: set[str] = set()

    mock_escalation = MagicMock()
    mock_escalation.model_dump.return_value = {
        "id": "escalation-1",
        "title": "SLA Escalation",
        "assigned_to": "profile-1",
    }

    with patch(
        "app.services.sla_monitoring_service.OperationalAction",
        return_value=mock_escalation,
    ):
        service.handle_overdue_action(
            _overdue_action(),
            escalation_parent_ids,
        )
        service.handle_overdue_action(
            _overdue_action(),
            escalation_parent_ids,
        )

    assert notifications.create_automation_activity.call_count == 2
    activity_types = [
        call.kwargs["activity_type"]
        for call in notifications.create_automation_activity.call_args_list
    ]
    assert activity_types.count("SLA_OVERDUE") == 1
    assert activity_types.count("AUTO_ESCALATION") == 1
    notifications.send_sla_overdue_notification.assert_called_once()
    notifications.send_auto_escalation_notification.assert_called_once()


def test_sla_monitoring_skips_when_escalation_already_exists() -> None:
    dedup_store = SlaOverdueAlertDedupStore()
    notifications = MagicMock()
    service = SLAMonitoringService(dedup_store=dedup_store)
    service.automation_notifications = notifications

    service.handle_overdue_action(
        _overdue_action(),
        {"action-1"},
    )

    notifications.create_automation_activity.assert_not_called()
    notifications.send_sla_overdue_notification.assert_not_called()
    notifications.send_auto_escalation_notification.assert_not_called()
