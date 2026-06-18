from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from postgrest.exceptions import APIError

from app.db.supabase_client import supabase
from app.repositories.postgrest_errors import is_missing_table_error


class FieldReportFinalizeRunRepository:
    TABLE = "field_report_finalize_runs"
    ACTIVE_STATUSES = frozenset({"PENDING", "RUNNING", "COMPLETED", "PARTIAL"})

    def __init__(self) -> None:
        self.client = supabase
        self._table_available: bool | None = None

    def is_storage_available(self) -> bool:
        if self._table_available is not None:
            return self._table_available

        try:
            (
                self.client
                .table(self.TABLE)
                .select("id")
                .limit(1)
                .execute()
            )
            self._table_available = True
        except APIError as error:
            if is_missing_table_error(error, self.TABLE):
                self._table_available = False
            else:
                raise

        return self._table_available

    def create(self, payload: dict) -> dict:
        now = datetime.now(UTC).isoformat()
        record = {
            "id": payload.get("id") or str(uuid4()),
            "created_at": payload.get("created_at") or now,
            "updated_at": payload.get("updated_at") or now,
            **payload,
        }
        record.setdefault("steps_completed", [])
        record.setdefault("steps_failed", [])

        if not self.is_storage_available():
            raise RuntimeError(
                "field_report_finalize_runs table is not available"
            )

        response = (
            self.client
            .table(self.TABLE)
            .insert(record)
            .execute()
        )
        return response.data[0]

    def get_by_id(self, run_id: str) -> dict | None:
        if not self.is_storage_available():
            return None

        response = (
            self.client
            .table(self.TABLE)
            .select("*")
            .eq("id", run_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

    def get_latest_by_report_id(self, report_id: str) -> dict | None:
        if not self.is_storage_available():
            return None

        response = (
            self.client
            .table(self.TABLE)
            .select("*")
            .eq("report_id", report_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

    def get_active_by_report_id(self, report_id: str) -> dict | None:
        latest = self.get_latest_by_report_id(report_id)
        if not latest:
            return None
        if str(latest.get("status") or "") in self.ACTIVE_STATUSES:
            return latest
        return None

    def get_by_idempotency_key(
        self,
        *,
        organization_id: str,
        idempotency_key: str,
    ) -> dict | None:
        if not self.is_storage_available():
            return None

        response = (
            self.client
            .table(self.TABLE)
            .select("*")
            .eq("organization_id", organization_id)
            .eq("idempotency_key", idempotency_key)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

    def update(self, run_id: str, payload: dict) -> dict | None:
        if not self.is_storage_available():
            return None

        update_payload = {
            **payload,
            "updated_at": datetime.now(UTC).isoformat(),
        }
        response = (
            self.client
            .table(self.TABLE)
            .update(update_payload)
            .eq("id", run_id)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]
