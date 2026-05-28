from datetime import datetime
from datetime import timezone
from uuid import uuid4


class WorkflowExecutionLogService:
    def __init__(self):
        self._logs: dict[str, list[dict]] = {}

    def append_log(
        self,
        run_id: str,
        level: str,
        message: str,
        context: dict | None = None,
    ):
        entries = self._logs.setdefault(run_id, [])
        entry = {
            "id": str(uuid4()),
            "run_id": run_id,
            "sequence": len(entries) + 1,
            "level": level.upper(),
            "message": message,
            "context": context or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        entries.append(entry)
        return entry

    def list_logs(
        self,
        run_id: str,
        limit: int = 200,
    ):
        entries = self._logs.get(run_id, [])
        return entries[-limit:]
