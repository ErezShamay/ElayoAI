"""QC notification jobs - roadmap 4.3 (uses NotificationTool, not automation engine)."""

from __future__ import annotations

from app.config.settings import settings
from app.repositories.organization_repository import OrganizationRepository
from app.services.automation_lock_service import AutomationLockService
from app.services.qc_notification_service import (
    build_qc_notification_service,
)

QC_NOTIFICATION_LOCK_KEY = "qc_notification_cycle"
QC_NOTIFICATION_LOCK_TTL_MINUTES = 60


def run_qc_notification_cycle() -> dict:
    """Daily job: run all QC email alerts for every organization."""
    if not settings.FEATURE_FLAGS.enable_email_delivery:
        return {
            "status": "SKIPPED",
            "reason": "email_delivery_disabled",
            "organizations_processed": 0,
        }

    lock_service = AutomationLockService()
    acquired = lock_service.acquire_lock(
        QC_NOTIFICATION_LOCK_KEY,
        ttl_minutes=QC_NOTIFICATION_LOCK_TTL_MINUTES,
    )
    if not acquired:
        return {
            "status": "SKIPPED",
            "reason": "lock_not_acquired",
            "organizations_processed": 0,
        }

    try:
        service = build_qc_notification_service(persistent_dedup=True)
        organization_repository = OrganizationRepository()
        organizations = organization_repository.get_all_organizations()

        results = []
        for organization in organizations:
            organization_id = str(organization.get("id") or "")
            if not organization_id:
                continue
            result = service.run_for_organization(
                organization_id=organization_id,
                send_email=True,
            )
            results.append(result.model_dump(mode="json"))

        sent_count = sum(
            result.get("total_emails_sent", 0) for result in results
        )

        return {
            "status": "COMPLETED",
            "organizations_processed": len(results),
            "emails_sent": sent_count,
            "results": results,
        }
    finally:
        lock_service.release_lock(QC_NOTIFICATION_LOCK_KEY)
