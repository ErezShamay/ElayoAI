"""Shared dedup stores for scheduled alerts (SLA, QC email, etc.)."""

from __future__ import annotations

from app.repositories.scheduled_alert_dedup_repository import (
    ScheduledAlertDedupRepository,
)


class AlertDedupStore:
    def __init__(
        self,
        *,
        key_prefix: str,
        repository: ScheduledAlertDedupRepository | None = None,
    ) -> None:
        self._key_prefix = key_prefix
        self._memory: dict[str, str] = {}
        self._repository = repository

    def _daily_key(self, entity_id: str, alert_date: str) -> str:
        return f"{self._key_prefix}:{entity_id}:{alert_date}"

    def _once_key(self, entity_id: str) -> str:
        return f"{self._key_prefix}:{entity_id}"

    def should_alert(self, entity_id: str, *, alert_date: str) -> bool:
        if self._memory.get(entity_id) == alert_date:
            return False
        if self._repository is not None:
            if self._repository.exists(self._daily_key(entity_id, alert_date)):
                self._memory[entity_id] = alert_date
                return False
        return True

    def mark_alerted(self, entity_id: str, *, alert_date: str) -> None:
        self._memory[entity_id] = alert_date
        if self._repository is not None:
            self._repository.mark(self._daily_key(entity_id, alert_date))

    def should_notify_once(self, entity_id: str) -> bool:
        once_marker = f"__once__:{entity_id}"
        if once_marker in self._memory:
            return False
        if self._repository is not None:
            if self._repository.exists(self._once_key(entity_id)):
                self._memory[once_marker] = "1"
                return False
        return True

    def mark_notified_once(self, entity_id: str) -> None:
        self._memory[f"__once__:{entity_id}"] = "1"
        if self._repository is not None:
            self._repository.mark(self._once_key(entity_id))


class CriticalAlertDedupStore(AlertDedupStore):
    def __init__(
        self,
        repository: ScheduledAlertDedupRepository | None = None,
    ) -> None:
        super().__init__(key_prefix="qc_critical", repository=repository)


class OpenReportAlertDedupStore(AlertDedupStore):
    def __init__(
        self,
        repository: ScheduledAlertDedupRepository | None = None,
    ) -> None:
        super().__init__(key_prefix="qc_open_report", repository=repository)


class SlaOverdueAlertDedupStore(AlertDedupStore):
    def __init__(
        self,
        repository: ScheduledAlertDedupRepository | None = None,
    ) -> None:
        super().__init__(key_prefix="sla_overdue", repository=repository)


def production_alert_dedup_repository() -> ScheduledAlertDedupRepository:
    return ScheduledAlertDedupRepository()
