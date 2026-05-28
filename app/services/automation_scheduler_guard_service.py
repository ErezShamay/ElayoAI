from datetime import datetime
from datetime import timezone
from threading import Lock


class AutomationSchedulerGuardService:
    def __init__(self):
        self._claims: dict[str, tuple[int, str]] = {}
        self._lock = Lock()

    def claim_tick(
        self,
        job_name: str,
        scheduled_at: datetime | None = None,
        window_seconds: int = 30,
        owner_id: str = "scheduler",
    ):
        now = scheduled_at or datetime.now(timezone.utc)
        window = int(now.timestamp() // window_seconds)
        key = f"{job_name}:{window}"

        with self._lock:
            if key in self._claims:
                claimed_window, existing_owner = self._claims[key]
                return {
                    "acquired": False,
                    "job_name": job_name,
                    "window": claimed_window,
                    "owner_id": existing_owner,
                }

            self._claims[key] = (window, owner_id)
            self._cleanup_old(job_name, window)
            return {
                "acquired": True,
                "job_name": job_name,
                "window": window,
                "owner_id": owner_id,
            }

    def _cleanup_old(
        self,
        job_name: str,
        current_window: int,
    ):
        stale_keys = []
        for key, (window, _) in self._claims.items():
            if not key.startswith(f"{job_name}:"):
                continue
            if window < current_window - 5:
                stale_keys.append(key)
        for key in stale_keys:
            self._claims.pop(key, None)
