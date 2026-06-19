from datetime import datetime
from datetime import timedelta
from datetime import timezone

from postgrest.exceptions import APIError

from app.repositories.automation_lock_repository import (
    AutomationLockRepository,
)
from app.services.automation_lock_service import (
    AutomationLockService,
)


class FakeAutomationLockRepository:
    def __init__(self):
        self.lock = None
        self.deleted_with = []

    def get_lock(
        self,
        lock_key: str,
    ):
        if self.lock and self.lock["lock_key"] == lock_key:
            return self.lock
        return None

    def is_lock_expired(
        self,
        lock: dict,
    ):
        expires_at = datetime.fromisoformat(lock["expires_at"])
        return expires_at < datetime.now(timezone.utc)

    def delete_lock(
        self,
        lock_key: str,
        owner_token: str | None = None,
    ):
        self.deleted_with.append((lock_key, owner_token))
        if not self.lock:
            return False
        if self.lock["lock_key"] != lock_key:
            return False
        if owner_token is not None and self.lock["owner_token"] != owner_token:
            return False
        self.lock = None
        return True

    def create_lock(
        self,
        lock,
    ):
        self.lock = lock.model_dump(mode="json")
        return self.lock


def test_distributed_locking_release_requires_owner_token():
    repository = FakeAutomationLockRepository()
    service = AutomationLockService()
    service.repository = repository

    acquired = service.acquire_lock(
        "job-lock",
        owner_token="owner-a",
    )
    assert acquired is True

    released_with_wrong_owner = service.release_lock(
        "job-lock",
        owner_token="owner-b",
    )
    assert released_with_wrong_owner is False
    assert repository.lock is not None

    released_with_correct_owner = service.release_lock(
        "job-lock",
        owner_token="owner-a",
    )
    assert released_with_correct_owner is True
    assert repository.lock is None


def test_distributed_locking_replaces_expired_lock():
    repository = FakeAutomationLockRepository()
    repository.lock = {
        "lock_key": "job-lock",
        "owner_token": "stale-owner",
        "expires_at": (
            datetime.now(timezone.utc)
            - timedelta(minutes=1)
        ).isoformat(),
    }
    service = AutomationLockService()
    service.repository = repository

    acquired = service.acquire_lock(
        "job-lock",
        owner_token="fresh-owner",
    )

    assert acquired is True
    assert repository.lock["owner_token"] == "fresh-owner"


def test_distributed_locking_blocks_active_lock():
    repository = FakeAutomationLockRepository()
    repository.lock = {
        "lock_key": "job-lock",
        "owner_token": "owner-a",
        "expires_at": (
            datetime.now(timezone.utc)
            + timedelta(minutes=10)
        ).isoformat(),
    }
    service = AutomationLockService()
    service.repository = repository

    acquired = service.acquire_lock(
        "job-lock",
        owner_token="owner-b",
    )

    assert acquired is False


def test_delete_lock_falls_back_when_owner_token_column_missing(
    monkeypatch,
):
    repository = AutomationLockRepository()
    calls: list[str | None] = []

    class FakeQuery:
        def __init__(self, owner_token: str | None):
            self.owner_token = owner_token

        def delete(self):
            return self

        def eq(self, column, value):
            if column == "owner_token":
                self.owner_token = value
            return self

        def execute(self):
            calls.append(self.owner_token)
            if self.owner_token is not None:
                raise APIError({
                    "message": "column automation_locks.owner_token does not exist",
                    "code": "42703",
                })
            return type("Response", (), {"data": [{"lock_key": "sla_monitoring"}]})()

    class FakeClient:
        def table(self, _name):
            return FakeQuery(owner_token=None)

    monkeypatch.setattr(repository, "client", FakeClient())

    deleted = repository.delete_lock(
        "sla_monitoring",
        owner_token="owner-a",
    )

    assert deleted is True
    assert calls == ["owner-a", None]
