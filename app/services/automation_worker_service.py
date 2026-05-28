from app.services.automation_job_queue_service import (
    AutomationJobQueueService,
)
from app.services.automation_retry_policy_service import (
    AutomationRetryPolicyService,
)


class AutomationWorkerService:
    def __init__(
        self,
        queue_service: AutomationJobQueueService,
        retry_policy_service: AutomationRetryPolicyService,
    ):
        self.queue_service = queue_service
        self.retry_policy_service = retry_policy_service
        self._workers: dict[str, dict] = {}

    def register_worker(
        self,
        worker_id: str,
        capabilities: list[str] | None = None,
    ):
        self._workers[worker_id] = {
            "worker_id": worker_id,
            "capabilities": capabilities or [],
            "processed": 0,
            "failed": 0,
        }
        return self._workers[worker_id]

    def process_next(
        self,
        worker_id: str,
        handlers: dict[str, callable],
    ):
        worker = self._workers.get(worker_id)
        if not worker:
            raise KeyError(f"Unknown worker '{worker_id}'")

        item = self.queue_service.dequeue()
        if not item:
            return {
                "status": "IDLE",
                "worker_id": worker_id,
            }

        handler = handlers.get(item["job_name"])
        if not handler:
            self.queue_service.fail(
                item["id"],
                error=f"No handler for {item['job_name']}",
            )
            worker["failed"] += 1
            return {
                "status": "FAILED",
                "worker_id": worker_id,
                "item_id": item["id"],
            }

        try:
            result = handler(item["payload"]) or {}
            self.queue_service.complete(
                item["id"],
                result=result,
            )
            worker["processed"] += 1
            return {
                "status": "COMPLETED",
                "worker_id": worker_id,
                "item_id": item["id"],
                "result": result,
            }
        except Exception as exc:
            retry = self.retry_policy_service.evaluate_retry(
                item["job_name"],
                item["attempts"],
            )
            self.queue_service.fail(
                item["id"],
                error=str(exc),
                retry_delay_seconds=retry["delay_seconds"] if retry["should_retry"] else None,
            )
            worker["failed"] += 1
            return {
                "status": "RETRYING" if retry["should_retry"] else "FAILED",
                "worker_id": worker_id,
                "item_id": item["id"],
                "error": str(exc),
            }

    def get_worker_stats(
        self,
    ):
        return {
            "total_workers": len(self._workers),
            "workers": sorted(
                self._workers.values(),
                key=lambda item: item["worker_id"],
            ),
        }
