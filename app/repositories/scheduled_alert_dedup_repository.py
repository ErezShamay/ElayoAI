from datetime import datetime, timezone

from postgrest.exceptions import APIError

from app.db.supabase_client import supabase


class ScheduledAlertDedupRepository:
    def __init__(self):
        self.client = supabase
        self.table_name = "scheduled_alert_dedups"

    def exists(self, dedup_key: str) -> bool:
        response = (
            self.client
            .table(self.table_name)
            .select("dedup_key")
            .eq("dedup_key", dedup_key)
            .limit(1)
            .execute()
        )
        return bool(response.data)

    def mark(self, dedup_key: str) -> None:
        payload = {
            "dedup_key": dedup_key,
            "alerted_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            self.client.table(self.table_name).insert(payload).execute()
        except APIError as error:
            if "duplicate" in str(error).lower() or "23505" in str(error):
                return
            raise
