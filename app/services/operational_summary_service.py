from app.ai.ai_client import (
    AIClient
)

from app.repositories.operational_action_repository import (
    OperationalActionRepository
)

from app.repositories.ai_interpretation_repository import (
    AIInterpretationRepository
)


class OperationalSummaryService:

    def __init__(self):

        self.action_repository = (
            OperationalActionRepository()
        )

        self.review_repository = (
            AIInterpretationRepository()
        )

    def generate_project_summary(
        self,
        project_id: str,
    ):

        actions = (
            self.action_repository
            .get_open_actions_by_project(
                project_id
            )
        )

        reviews = (
            self.review_repository
            .get_reviews_by_project(
                project_id
            )
        )

        prompt = f"""
אתה מנהל תפעול בכיר בתחום הבנייה
וההתחדשות העירונית.

המטרה שלך היא לייצר
סיכום תפעולי קצר,
ברור ומקצועי למנהל פרויקט.

נתוני הפרויקט:

פעולות פתוחות:
{len(actions)}

ביקורות AI:
{len(reviews)}

רשימת פעולות:
{actions}

רשימת ביקורות:
{reviews}

החזר תשובה בעברית בלבד.

המבנה:

1. מצב הפרויקט
2. סיכונים מרכזיים
3. פעולות דחופות
4. המלצת ניהול
"""

        try:
            summary = (
                AIClient()
                .generate(
                    prompt,
                    prompt_name=
                        "project_operational_summary"
                )
            )
        except Exception:
            summary = (
                "סיכום AI אינו זמין כרגע.\n\n"
                f"פעולות פתוחות: {len(actions)}\n"
                f"ביקורות AI: {len(reviews)}"
            )

        return {

            "project_id":
                project_id,

            "summary":
                summary,
        }
