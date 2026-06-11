"""Persistent-capable alert dedup stores."""

from __future__ import annotations

from app.services.alert_dedup_store import (
    CriticalAlertDedupStore,
    OpenReportAlertDedupStore,
)


class FakeScheduledAlertDedupRepository:
    def __init__(self) -> None:
        self.keys: set[str] = set()

    def exists(self, dedup_key: str) -> bool:
        return dedup_key in self.keys

    def mark(self, dedup_key: str) -> None:
        self.keys.add(dedup_key)


def test_critical_alert_dedup_persists_across_store_instances() -> None:
    repository = FakeScheduledAlertDedupRepository()
    first = CriticalAlertDedupStore(repository=repository)
    second = CriticalAlertDedupStore(repository=repository)

    assert first.should_alert("issue-1", alert_date="2026-06-11") is True
    first.mark_alerted("issue-1", alert_date="2026-06-11")

    assert second.should_alert("issue-1", alert_date="2026-06-11") is False
    assert second.should_alert("issue-1", alert_date="2026-06-12") is True


def test_open_report_dedup_persists_across_store_instances() -> None:
    repository = FakeScheduledAlertDedupRepository()
    first = OpenReportAlertDedupStore(repository=repository)
    second = OpenReportAlertDedupStore(repository=repository)

    assert first.should_alert("report-1", alert_date="2026-06-11") is True
    first.mark_alerted("report-1", alert_date="2026-06-11")

    assert second.should_alert("report-1", alert_date="2026-06-11") is False
