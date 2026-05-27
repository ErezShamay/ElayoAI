from datetime import datetime
from datetime import timezone

from app.repositories.ai_execution_log_repository import (
    AIExecutionLogRepository
)

from app.services.ai_recovery_service import (
    AIRecoveryService
)


class FakeQuery:

    def __init__(
        self,
    ):

        self.filters = []
        self.payload = None

    def select(
        self,
        value,
    ):

        return self

    def eq(
        self,
        key,
        value,
    ):

        self.filters.append(
            (
                "eq",
                key,
                value,
            )
        )

        return self

    def lt(
        self,
        key,
        value,
    ):

        self.filters.append(
            (
                "lt",
                key,
                value,
            )
        )

        return self

    def or_(
        self,
        value,
    ):

        self.filters.append(
            (
                "or",
                value,
            )
        )

        return self

    def order(
        self,
        key,
        desc=False,
    ):

        return self

    def update(
        self,
        payload,
    ):

        self.payload = payload

        return self

    def execute(
        self,
    ):

        return type(
            "Response",
            (),
            {
                "data":
                    []
            },
        )()


class FakeClient:

    def __init__(
        self,
    ):

        self.query = FakeQuery()

    def table(
        self,
        table_name,
    ):

        return self.query


class FakeRecoveryRepository:

    def __init__(
        self,
    ):

        self.updated_retries = []
        self.locked = []
        self.unlocked = []

    def lock_recovery(
        self,
        log_id,
    ):

        self.locked.append(
            log_id
        )

    def unlock_recovery(
        self,
        log_id,
    ):

        self.unlocked.append(
            log_id
        )

    def update_retry(
        self,
        log_id,
        retry_count,
        next_retry_at,
    ):

        self.updated_retries.append(
            {
                "log_id":
                    log_id,
                "retry_count":
                    retry_count,
                "next_retry_at":
                    next_retry_at,
            }
        )


class FakeRetryStrategyService:

    def __init__(
        self,
        next_retry_at,
    ):

        self.next_retry_at = next_retry_at
        self.calls = []

    def calculate_next_retry(
        self,
        failure_type,
        retry_count,
    ):

        self.calls.append(
            {
                "failure_type":
                    failure_type,
                "retry_count":
                    retry_count,
            }
        )

        return self.next_retry_at


def test_failed_execution_query_respects_next_retry_at_window():

    repository = (
        AIExecutionLogRepository.__new__(
            AIExecutionLogRepository
        )
    )

    client = FakeClient()

    repository.client = client
    repository.table_name = "ai_execution_logs"

    repository.get_failed_executions()

    retry_filter = [
        item
        for item
        in client.query.filters
        if item[0] == "or"
    ][0]

    assert "next_retry_at.is.null" in retry_filter[1]
    assert "next_retry_at.lte." in retry_filter[1]


def test_update_retry_always_persists_next_retry_at():

    repository = (
        AIExecutionLogRepository.__new__(
            AIExecutionLogRepository
        )
    )

    client = FakeClient()

    repository.client = client
    repository.table_name = "ai_execution_logs"

    next_retry_at = datetime(
        2026,
        5,
        27,
        12,
        30,
        tzinfo=timezone.utc,
    )

    repository.update_retry(

        log_id="log-1",

        retry_count=2,

        next_retry_at=next_retry_at,
    )

    assert client.query.payload["retry_count"] == 2
    assert client.query.payload["next_retry_at"] == (
        next_retry_at.isoformat()
    )


def test_retry_execution_uses_strategy_next_retry_at():

    service = (
        AIRecoveryService.__new__(
            AIRecoveryService
        )
    )

    next_retry_at = datetime(
        2026,
        5,
        27,
        12,
        45,
        tzinfo=timezone.utc,
    )

    repository = FakeRecoveryRepository()

    service.repository = repository
    service.retry_strategy_service = (
        FakeRetryStrategyService(
            next_retry_at
        )
    )

    service.replay_project_processing = (
        lambda log: False
    )

    service.retry_execution(
        {
            "id":
                "log-1",
            "project_id":
                "project-1",
            "execution_type":
                "PROJECT_PROCESSING",
            "status":
                "FAILED",
            "retry_count":
                1,
            "failure_type":
                "TIMEOUT",
            "replayable":
                True,
        }
    )

    assert service.retry_strategy_service.calls == [
        {
            "failure_type":
                "TIMEOUT",
            "retry_count":
                2,
        }
    ]

    assert repository.updated_retries == [
        {
            "log_id":
                "log-1",
            "retry_count":
                2,
            "next_retry_at":
                next_retry_at,
        }
    ]

    assert repository.unlocked == [
        "log-1"
    ]
