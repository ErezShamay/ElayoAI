from __future__ import annotations

import time
from types import SimpleNamespace

import pytest

from app.db.supabase_client import ResilientTransaction, SupabaseClient
from app.exceptions import ConflictError, DatabaseError


def test_execute_with_resilience_retries_then_succeeds():
    attempts = {"count": 0}

    def flaky():
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise RuntimeError("transient")
        return "ok"

    result = SupabaseClient.execute_with_resilience(
        flaky,
        operation_name="test_retry",
        max_attempts=3,
        timeout_seconds=1.0,
        base_delay_seconds=0,
    )

    assert result == "ok"
    assert attempts["count"] == 3


def test_execute_with_resilience_raises_database_error_after_retries():
    def always_fail():
        raise RuntimeError("down")

    with pytest.raises(DatabaseError) as exc_info:
        SupabaseClient.execute_with_resilience(
            always_fail,
            operation_name="test_retry_failure",
            max_attempts=2,
            timeout_seconds=1.0,
            base_delay_seconds=0,
        )

    assert exc_info.value.details["attempts"] == 2


def test_execute_with_resilience_times_out():
    def slow_operation():
        time.sleep(0.05)
        return "late"

    with pytest.raises(DatabaseError) as exc_info:
        SupabaseClient.execute_with_resilience(
            slow_operation,
            operation_name="test_timeout",
            max_attempts=1,
            timeout_seconds=0.01,
            base_delay_seconds=0,
        )

    assert exc_info.value.details["timeout_seconds"] == 0.01


def test_transaction_rolls_back_on_failure():
    events: list[str] = []

    tx = ResilientTransaction()
    tx.add(lambda: events.append("op1"), rollback=lambda: events.append("rb1"))
    tx.add(lambda: (_ for _ in ()).throw(RuntimeError("boom")), rollback=lambda: events.append("rb2"))

    with pytest.raises(DatabaseError):
        tx.commit()

    assert events == ["op1", "rb2", "rb1"]
    assert tx.committed is False
    assert tx.rollback_count == 2


def test_transaction_context_rolls_back_on_unhandled_error():
    events: list[str] = []
    tx = ResilientTransaction()
    tx.add(lambda: events.append("op"), rollback=lambda: events.append("rb"))

    with pytest.raises(RuntimeError):
        with tx:
            raise RuntimeError("explode")

    assert events == ["rb"]


def test_optimistic_update_raises_conflict_when_version_mismatch(monkeypatch: pytest.MonkeyPatch):
    class Query:
        def update(self, _):
            return self

        def eq(self, *_):
            return self

        def execute(self):
            return SimpleNamespace(data=[])

    class FakeClient:
        def table(self, _):
            return Query()

    monkeypatch.setattr("app.db.supabase_client.supabase", FakeClient())

    with pytest.raises(ConflictError):
        SupabaseClient.optimistic_update(
            table="projects",
            resource_id="p-1",
            expected_version=3,
            payload={"name": "new"},
        )
