from app.repositories.operational_action_repository import (
    OperationalActionRepository
)

from app.constants.action_statuses import (
    OPEN,
    IN_PROGRESS,
    BLOCKED,
    ESCALATED,
    COMPLETED,
)

from app.repositories.workspace_activity_repository import (
    WorkspaceActivityRepository,
)


class OperationalActionService:

    def __init__(self):

        self.repository = (
            OperationalActionRepository()
        )

    def get_open_actions(
        self
    ):

        return (
            self.repository
            .get_open_actions()
        )

    def get_escalations(
        self
    ):

        actions = (
            self.repository
            .get_open_actions()
        )

        escalations = []

        for action in actions:

            if (
                action[
                    "action_type"
                ]
                == "ESCALATION"
            ):

                escalations.append(
                    action
                )

        return escalations

    def update_status(
        self,
        action_id: str,
        status: str,
    ):

        action = (
            self.repository
            .update_action_status(
                action_id,
                status,
            )
        )

        WorkspaceActivityRepository.create_activity(

            project_id=
                action["project_id"],

            activity_type=
                "ACTION_STATUS_CHANGED",

            title=
                "סטטוס פעולה עודכן",

            description=
                f"{action['title']} → {status}",
        )

        return action

    def start_action(
        self,
        action_id: str,
    ):

        return (
            self.update_status(
                action_id,
                IN_PROGRESS,
            )
        )

    def block_action(
        self,
        action_id: str,
    ):

        return (
            self.update_status(
                action_id,
                BLOCKED,
            )
        )

    def complete_action(
        self,
        action_id: str,
    ):

        return (
            self.update_status(
                action_id,
                COMPLETED,
            )
        )

    def escalate_action(
        self,
        action_id: str,
    ):

        return (
            self.update_status(
                action_id,
                ESCALATED,
            )
        )