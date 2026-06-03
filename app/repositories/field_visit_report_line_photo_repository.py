from __future__ import annotations

from datetime import UTC, datetime

from postgrest.exceptions import APIError

from app.db.supabase_client import supabase
from app.repositories.postgrest_errors import (
    is_missing_table_error,
)


class FieldVisitReportLinePhotoRepository:
    TABLE = "field_visit_report_line_photos"

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

    def list_by_line(self, line_id: str) -> list[dict]:
        if not self.is_storage_available():
            return []

        response = (
            self.client
            .table(self.TABLE)
            .select("*")
            .eq("line_id", line_id)
            .order("sort_order")
            .order("created_at")
            .execute()
        )
        return response.data or []

    def get_by_id(self, photo_id: str) -> dict | None:
        if not self.is_storage_available():
            return None

        response = (
            self.client
            .table(self.TABLE)
            .select("*")
            .eq("id", photo_id)
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]

    def count_by_line(self, line_id: str) -> int:
        return len(self.list_by_line(line_id))

    def next_sort_order(self, line_id: str) -> int:
        photos = self.list_by_line(line_id)
        if not photos:
            return 0
        return max(int(photo.get("sort_order") or 0) for photo in photos) + 1

    def create(self, payload: dict) -> dict:
        if not self.is_storage_available():
            raise RuntimeError(
                f"Table {self.TABLE} is not available. "
                "Apply migration field_visit_report_line_photos."
            )

        now = datetime.now(UTC).isoformat()
        payload.setdefault("created_at", now)
        payload.setdefault("updated_at", now)

        response = (
            self.client
            .table(self.TABLE)
            .insert(payload)
            .execute()
        )
        return response.data[0]

    def delete(self, photo_id: str) -> bool:
        if not self.is_storage_available():
            raise RuntimeError(
                f"Table {self.TABLE} is not available. "
                "Apply migration field_visit_report_line_photos."
            )

        response = (
            self.client
            .table(self.TABLE)
            .delete()
            .eq("id", photo_id)
            .execute()
        )
        return bool(response.data)

    def delete_by_line(self, line_id: str) -> int:
        if not self.is_storage_available():
            return 0

        existing = self.list_by_line(line_id)
        for photo in existing:
            self.delete(str(photo["id"]))
        return len(existing)
