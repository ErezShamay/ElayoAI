"""QC notification jobs - scheduler wiring tests."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.jobs.qc_notification_jobs import run_qc_notification_cycle


def test_run_qc_notification_cycle_skips_when_email_disabled() -> None:
    with patch(
        "app.jobs.qc_notification_jobs.settings"
    ) as mock_settings:
        mock_settings.FEATURE_FLAGS.enable_email_delivery = False
        result = run_qc_notification_cycle()

    assert result["status"] == "SKIPPED"
    assert result["organizations_processed"] == 0


def test_run_qc_notification_cycle_skips_when_lock_not_acquired() -> None:
    with (
        patch(
            "app.jobs.qc_notification_jobs.settings"
        ) as mock_settings,
        patch(
            "app.jobs.qc_notification_jobs.AutomationLockService"
        ) as lock_service_cls,
    ):
        mock_settings.FEATURE_FLAGS.enable_email_delivery = True
        lock_service_cls.return_value.acquire_lock.return_value = False
        result = run_qc_notification_cycle()

    assert result["status"] == "SKIPPED"
    assert result["reason"] == "lock_not_acquired"
    lock_service_cls.return_value.release_lock.assert_not_called()


def test_run_qc_notification_cycle_uses_persistent_dedup_service() -> None:
    cycle_response = MagicMock()
    cycle_response.model_dump.return_value = {
        "total_emails_sent": 0,
    }
    service = MagicMock()
    service.run_for_organization.return_value = cycle_response

    with (
        patch(
            "app.jobs.qc_notification_jobs.settings"
        ) as mock_settings,
        patch(
            "app.jobs.qc_notification_jobs.AutomationLockService"
        ) as lock_service_cls,
        patch(
            "app.jobs.qc_notification_jobs.build_qc_notification_service",
            return_value=service,
        ) as build_service,
        patch(
            "app.jobs.qc_notification_jobs.OrganizationRepository"
        ) as org_repo_cls,
    ):
        mock_settings.FEATURE_FLAGS.enable_email_delivery = True
        lock_service_cls.return_value.acquire_lock.return_value = True
        org_repo_cls.return_value.get_all_organizations.return_value = [
            {"id": "org-1"},
        ]

        result = run_qc_notification_cycle()

    build_service.assert_called_once_with(persistent_dedup=True)
    service.run_for_organization.assert_called_once_with(
        organization_id="org-1",
        send_email=True,
    )
    lock_service_cls.return_value.release_lock.assert_called_once_with(
        "qc_notification_cycle"
    )
    assert result["status"] == "COMPLETED"
    assert result["organizations_processed"] == 1
