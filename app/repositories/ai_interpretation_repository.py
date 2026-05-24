from app.db.supabase_client import (
    SupabaseClient
)


class AIInterpretationRepository:

    def __init__(self):

        self.client = (
            SupabaseClient
            .get_client()
        )

    def create_interpretation(
        self,
        interpretation
    ):

        response = (
            self.client
            .table("ai_interpretations")
            .insert({
                "finding_id":
                    interpretation.finding_id,

                "model_name":
                    interpretation.model_name,

                "business_impact":
                    interpretation.business_impact,

                "tenant_risk":
                    interpretation.tenant_risk,

                "recommended_action":
                    interpretation.recommended_action,

                "raw_response":
                    interpretation.raw_response,

                "review_status":
                    "PENDING",
            })
            .execute()
        )

        return response.data[0]

    def get_pending_reviews(self):

        response = (
            self.client
            .table("ai_interpretations")
            .select("*")
            .eq(
                "review_status",
                "PENDING"
            )
            .execute()
        )

        return response.data

    def approve_interpretation(
        self,
        interpretation_id: str,
        reviewed_by: str,
        review_notes: str
    ):

        response = (
            self.client
            .table("ai_interpretations")
            .update({
                "review_status":
                    "APPROVED",

                "reviewed_by":
                    reviewed_by,

                "review_notes":
                    review_notes,
            })
            .eq(
                "id",
                interpretation_id
            )
            .execute()
        )

        updated_response = (
            self.client
            .table("ai_interpretations")
            .select("*")
            .eq(
                "id",
                interpretation_id
            )
            .limit(1)
            .execute()
        )

        return updated_response.data[0]

    def get_reviews_by_project(
        self,
        project_id: str
    ):

        response = (
            self.client
            .table("ai_interpretations")
            .select("""
                *,
                findings!inner(
                    project_id
                )
            """)
            .eq(
                "findings.project_id",
                project_id
            )
            .execute()
        )

        return response.data