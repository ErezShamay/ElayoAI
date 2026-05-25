from app.db.supabase_client import (
    SupabaseClient
)


class AIInterpretationRepository:

    def __init__(self):

        self.client = (
            SupabaseClient
            .get_client()
        )

    def get_reviews_by_project(
        self,
        project_id: str
    ):

        # =========================
        # GET REPORT IDS
        # =========================

        reports_response = (
            self.client
            .table("reports")
            .select("id")
            .eq(
                "project_id",
                project_id
            )
            .execute()
        )

        reports = (
            reports_response.data
            or []
        )

        report_ids = [
            report["id"]
            for report in reports
        ]

        if not report_ids:
            return []

        # =========================
        # GET FINDING IDS
        # =========================

        findings_response = (
            self.client
            .table("findings")
            .select("id")
            .in_(
                "report_id",
                report_ids
            )
            .execute()
        )

        findings = (
            findings_response.data
            or []
        )

        finding_ids = [
            finding["id"]
            for finding in findings
        ]

        if not finding_ids:
            return []

        # =========================
        # GET AI REVIEWS
        # =========================

        reviews_response = (
            self.client
            .table("ai_interpretations")
            .select("*")
            .in_(
                "finding_id",
                finding_ids
            )
            .execute()
        )

        return (
            reviews_response.data
            or []
        )