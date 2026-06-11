from datetime import datetime, timezone

from app.constants.action_statuses import (
    ESCALATED,
)

from app.repositories.operational_action_repository import (
    OperationalActionRepository
)

from app.repositories.workspace_activity_repository import (
    WorkspaceActivityRepository
)


class ActionEscalationService:

    def __init__(self):

        self.repository = (
            OperationalActionRepository()
        )

    def escalate_overdue_actions(
        self,
    ):

        actions = (
            self.repository
            .get_overdue_open_actions()
        )

        escalated_count = 0

        for action in actions:

            due_date = (
                action.get(
                    "due_date"
                )
            )

            if not due_date:
                continue

            if (
                action.get("status")
                == ESCALATED
            ):
                continue

            due_date = (
                datetime.fromisoformat(
                    due_date
                )
            )

            if (
                due_date
                < datetime.utcnow()
            ):

                self.repository.update_action_status(

                    action["id"],

                    ESCALATED,
                )

                WorkspaceActivityRepository.create_activity(

                    project_id=
                        action[
                            "project_id"
                        ],

                    activity_type=
                        "AUTO_ESCALATION",

                    title=
                        "נקודת סיכון אוטומטית",

                    description=
                        f"נוצרה נקודת סיכון אוטומטית עבור {action['title']} עקב חריגה מיעד",
                )

                escalated_count += 1

        return {

            "success": True,

            "escalated_count":
                escalated_count,
        }