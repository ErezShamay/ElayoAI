from postgrest.exceptions import APIError

from app.db.supabase_client import (
    supabase
)
from app.repositories.postgrest_errors import is_missing_column_error


class WeeklyReportRepository:

    def __init__(self):
        self.client = supabase

    def create_report(
        self,
        project_id,
        report_source,
        email_subject,
        reported_at: str | None = None,
    ):
        payload = {
            "project_id": project_id,
            "report_source": report_source,
            "email_subject": email_subject,
        }
        if reported_at:
            payload["reported_at"] = reported_at

        try:
            response = (
                self.client
                .table("weekly_reports")
                .insert(payload)
                .execute()
            )
        except APIError as error:
            if (
                reported_at
                and is_missing_column_error(error, "reported_at")
            ):
                payload.pop("reported_at", None)
                response = (
                    self.client
                    .table("weekly_reports")
                    .insert(payload)
                    .execute()
                )
            else:
                raise

        return response.data[0]

    def get_all_reports(self):

        response = (
            self.client
            .table("weekly_reports")
            .select("*")
            .execute()
        )

        return response.data or []

    def get_reports_by_project(
        self,
        project_id: str
    ):

        response = (
            self.client
            .table("weekly_reports")
            .select("*")
            .eq(
                "project_id",
                project_id
            )
            .execute()
        )

        return response.data or []

    def list_by_project_ids(
        self,
        project_ids: list[str],
    ) -> list[dict]:
        normalized = [
            project_id.strip()
            for project_id in project_ids
            if project_id and str(project_id).strip()
        ]
        if not normalized:
            return []

        if len(normalized) == 1:
            return self.get_reports_by_project(normalized[0])

        response = (
            self.client
            .table("weekly_reports")
            .select("*")
            .in_("project_id", normalized)
            .execute()
        )
        return response.data or []

    def get_by_id(self, report_id: str) -> dict | None:
        response = (
            self.client
            .table("weekly_reports")
            .select("*")
            .eq("id", report_id)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

    def get_for_project(
        self,
        *,
        project_id: str,
        report_id: str,
    ) -> dict | None:
        record = self.get_by_id(report_id)
        if record is None:
            return None
        if str(record.get("project_id")) != str(project_id):
            return None
        return record

    def delete(self, report_id: str) -> bool:
        response = (
            self.client
            .table("weekly_reports")
            .delete()
            .eq("id", report_id)
            .execute()
        )
        return bool(response.data)