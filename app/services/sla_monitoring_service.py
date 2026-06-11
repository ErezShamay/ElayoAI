from datetime import datetime, timezone
from uuid import uuid4

from app.repositories.operational_action_repository import (
    OperationalActionRepository
)

from app.repositories.workspace_activity_repository import (
    WorkspaceActivityRepository
)

from app.schemas.operational_action import (
    OperationalAction
)

from app.services.automation_notification_service import (
    AutomationNotificationService
)


class SLAMonitoringService:

    def __init__(self):

        self.repository = (
            OperationalActionRepository()
        )

        self.automation_notifications = (
            AutomationNotificationService()
        )

    # ==========================================
    # MAIN LOOP
    # ==========================================

    def run_monitoring_cycle(
        self,
    ):

        print(
            "[AUTOMATION] Starting SLA monitoring cycle"
        )

        processed_count = 0

        error_count = 0

        actions = (
            self.repository
            .get_overdue_open_actions()
        )

        escalation_parent_ids = (
            self.repository
            .get_escalation_parent_action_ids()
        )

        for action in actions:

            try:

                self.process_action(
                    action,
                    escalation_parent_ids,
                )

                processed_count += 1

            except Exception as error:

                error_count += 1

                print(
                    "[AUTOMATION] Failed processing action:",
                    action.get("id"),
                    str(error),
                )

        print(
            "[AUTOMATION] SLA monitoring cycle completed"
        )

        return {

            "processed_count":
                processed_count,

            "error_count":
                error_count,
        }

    # ==========================================
    # PROCESS SINGLE ACTION
    # ==========================================

    def process_action(
        self,
        action: dict,
        escalation_parent_ids: set[str] | None = None,
    ):

        due_date = (
            action.get(
                "due_date"
            )
        )

        if not due_date:
            return

        try:

            due_date = (
                datetime.fromisoformat(
                    due_date.replace(
                        "Z",
                        "+00:00"
                    )
                )
            )

        except Exception:

            print(
                "[AUTOMATION] Invalid due date:",
                due_date
            )

            return

        now = datetime.now(
            timezone.utc
        )

        is_overdue = (
            due_date < now
        )

        if not is_overdue:
            return

        self.handle_overdue_action(
            action,
            escalation_parent_ids,
        )

    # ==========================================
    # HANDLE OVERDUE
    # ==========================================

    def handle_overdue_action(
        self,
        action: dict,
        escalation_parent_ids: set[str] | None = None,
    ):

        print(
            f"[AUTOMATION] Overdue action detected: "
            f"{action['title']}"
        )

        # ======================================
        # CREATE TIMELINE ACTIVITY
        # ======================================

        self.automation_notifications.create_automation_activity(

            project_id=
                action["project_id"],

            activity_type=
                "SLA_OVERDUE",

            title=
                "חריגת SLA זוהתה",

            description=
                f"{action['title']} חרג מזמן הטיפול",
        )

        # ======================================
        # SEND AUTOMATION NOTIFICATION
        # ======================================

        self.automation_notifications.send_sla_overdue_notification(
            action
        )

        # ======================================
        # CHECK EXISTING ESCALATIONS
        # ======================================

        if escalation_parent_ids is None:
            escalation_parent_ids = (
                self.repository
                .get_escalation_parent_action_ids()
            )

        already_exists = (
            action["id"]
            in escalation_parent_ids
        )

        if already_exists:

            print(
                f"[AUTOMATION] Escalation already exists "
                f"for action: {action['id']}"
            )

            return

        # ======================================
        # CREATE ESCALATION ACTION
        # ======================================

        escalation = OperationalAction(

            id=str(uuid4()),

            project_id=
                action["project_id"],

            title=
                f"SLA Escalation: {action['title']}",

            description=
                (
                    "המערכת זיהתה חריגת SLA "
                    "אוטומטית ונוצרה נקודת סיכון."
                ),

            action_type=
                "ESCALATION",

            status=
                "OPEN",

            priority=
                "HIGH",

            assigned_to=
                action.get(
                    "assigned_to"
                ),

            due_date=
                action.get(
                    "due_date"
                ),

            parent_action_id=
                action["id"],
        )

        created_escalation = (
            self.repository
            .create_action(
                escalation
            )
        )

        print(
            f"[AUTOMATION] Auto escalation created: "
            f"{created_escalation['id']}"
        )

        if escalation_parent_ids is not None:
            escalation_parent_ids.add(
                action["id"]
            )

        # ======================================
        # SEND ESCALATION NOTIFICATION
        # ======================================

        self.automation_notifications.send_auto_escalation_notification(
            escalation.model_dump()
        )

        # ======================================
        # CREATE AUTOMATION ACTIVITY
        # ======================================

        self.automation_notifications.create_automation_activity(

            project_id=
                action["project_id"],

            activity_type=
                "AUTO_ESCALATION",

            title=
                "נוצרה נקודת סיכון אוטומטית",

            description=
                (
                    f"נוצרה נקודת סיכון עבור "
                    f"{action['title']}"
                ),
        )
