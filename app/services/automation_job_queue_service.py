from datetime import datetime
from datetime import timezone
from threading import Lock
from uuid import uuid4


class AutomationJobQueueService:
    def __init__(self):
        self._items: list[dict] = []
        self._lock = Lock()

    def enqueue(
        self,
        job_name: str,
        payload: dict,
        priority: int = 5,
        idempotency_key: str | None = None,
        available_at: datetime | None = None,
    ):
        with self._lock:
            if idempotency_key:
                existing = self._find_active_duplicate(idempotency_key)
                if existing:
                    return {
                        **existing,
                        "duplicate": True,
                    }

            now = datetime.now(timezone.utc)
            item = {
                "id": str(uuid4()),
                "job_name": job_name,
                "payload": payload,
                "priority": priority,
                "status": "QUEUED",
                "attempts": 0,
                "idempotency_key": idempotency_key,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "available_at": (
                    available_at or now
                ).isoformat(),
            }
            self._items.append(item)
            return item

    def dequeue(
        self,
    ):
        with self._lock:
            now = datetime.now(timezone.utc)
            queued = [
                item
                for item in self._items
                if item["status"] == "QUEUED"
                and datetime.fromisoformat(item["available_at"]) <= now
            ]
            if not queued:
                return None

            queued.sort(
                key=lambda item: (
                    -item["priority"],
                    item["created_at"],
                )
            )
            item = queued[0]
            item["status"] = "PROCESSING"
            item["attempts"] += 1
            item["updated_at"] = datetime.now(timezone.utc).isoformat()
            return item

    def complete(
        self,
        item_id: str,
        result: dict | None = None,
    ):
        with self._lock:
            item = self._get(item_id)
            if not item:
                return None
            item["status"] = "COMPLETED"
            item["result"] = result or {}
            item["updated_at"] = datetime.now(timezone.utc).isoformat()
            return item

    def fail(
        self,
        item_id: str,
        error: str,
        retry_delay_seconds: int | None = None,
    ):
        with self._lock:
            item = self._get(item_id)
            if not item:
                return None

            now = datetime.now(timezone.utc)
            item["last_error"] = error
            item["updated_at"] = now.isoformat()

            if retry_delay_seconds is not None:
                item["status"] = "QUEUED"
                item["available_at"] = (
                    now.timestamp() + retry_delay_seconds
                )
                item["available_at"] = datetime.fromtimestamp(
                    item["available_at"],
                    tz=timezone.utc,
                ).isoformat()
            else:
                item["status"] = "FAILED"
            return item

    def list_items(
        self,
        status: str | None = None,
    ):
        items = self._items
        if status:
            items = [item for item in items if item["status"] == status]
        return sorted(
            items,
            key=lambda item: item["created_at"],
            reverse=True,
        )

    def _find_active_duplicate(
        self,
        idempotency_key: str,
    ):
        for item in self._items:
            if (
                item.get("idempotency_key") == idempotency_key
                and item["status"] in {"QUEUED", "PROCESSING"}
            ):
                return item
        return None

    def _get(
        self,
        item_id: str,
    ):
        for item in self._items:
            if item["id"] == item_id:
                return item
        return None
