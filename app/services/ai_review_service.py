from app.repositories.ai_interpretation_repository import (
    AIInterpretationRepository
)

from app.repositories.operational_action_repository import (
    OperationalActionRepository
)


class AIReviewService:

    def __init__(self):

        self.repository = (
            AIInterpretationRepository()
        )

        self.operational_repository = (
            OperationalActionRepository()
        )

    def get_pending_reviews(self):

        return (
            self.repository
            .get_pending_reviews()
        )

    def approve_review(
        self,
        interpretation_id: str,
        reviewed_by: str,
        review_notes: str
    ):

        approved_interpretation = (
            self.repository
            .approve_interpretation(
                interpretation_id=
                    interpretation_id,

                reviewed_by=
                    reviewed_by,

                review_notes=
                    review_notes,
            )
        )

        created_action = (
            self.operational_repository
            .create_action({
                "interpretation_id":
                    interpretation_id,

                "action_type":
                    "ESCALATION",

                "title":
                    approved_interpretation[
                        "recommended_action"
                    ],

                "description":
                    approved_interpretation[
                        "business_impact"
                    ],

                "status":
                    "OPEN",
            })
        )

        return {
            "approved_interpretation":
                approved_interpretation,

            "created_action":
                created_action,
        }

    def get_reviews_by_project(
        self,
        project_id: str
    ):

        return (
            self.repository
            .get_reviews_by_project(
                project_id
            )
        )