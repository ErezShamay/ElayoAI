from datetime import UTC, datetime

from app.db.supabase_client import (
    supabase
)

from app.schemas.operational_action import (
    OperationalAction
)


class OperationalActionRepository:

    def __init__(self):

        self.client = (
            supabase
        )

        self.table_name = (
            "operational_actions"
        )

    # ==========================================
    # CREATE
    # ==========================================

    def create_action(
        self,
        action: OperationalAction
    ):

        payload = (
            action.model_dump(
                exclude_none=True
            )
        )

        response = (
            self.client
            .table(self.table_name)
            .insert(payload)
            .execute()
        )

        return response.data[0]

    # ==========================================
    # GETTERS
    # ==========================================

    def get_action_by_id(
        self,
        action_id: str
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "id",
                action_id
            )
            .limit(1)
            .execute()
        )

        if not response.data:

            return None

        return response.data[0]

    def get_open_action_by_interpretation_id(
        self,
        interpretation_id: str,
    ):
        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "interpretation_id",
                interpretation_id
            )
            .eq(
                "status",
                "OPEN"
            )
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]

    def get_open_actions(
        self
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN"
            )
            .execute()
        )

        return response.data or []

    def get_open_actions_by_organization(
        self,
        organization_id: str,
    ):
        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN",
            )
            .eq(
                "organization_id",
                organization_id,
            )
            .execute()
        )

        return response.data or []

    def get_open_actions_by_project(
        self,
        project_id: str
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN"
            )
            .eq(
                "project_id",
                project_id
            )
            .execute()
        )

        return response.data or []

    def get_open_actions_by_project_ids(
        self,
        project_ids: list[str],
    ):
        if not project_ids:
            return []

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN",
            )
            .in_(
                "project_id",
                project_ids,
            )
            .execute()
        )

        return response.data or []

    def get_exceptions_by_project(
        self,
        project_id: str
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN"
            )
            .eq(
                "action_type",
                "ESCALATION"
            )
            .eq(
                "project_id",
                project_id
            )
            .execute()
        )

        return response.data or []

    def get_open_escalations(
        self,
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN",
            )
            .eq(
                "action_type",
                "ESCALATION",
            )
            .execute()
        )

        return response.data or []

    def get_open_escalations_by_project_ids(
        self,
        project_ids: list[str],
    ):
        if not project_ids:
            return []

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN",
            )
            .eq(
                "action_type",
                "ESCALATION",
            )
            .in_(
                "project_id",
                project_ids,
            )
            .execute()
        )

        return response.data or []

    def get_overdue_open_actions(
        self,
        before_iso: str | None = None,
    ):

        if before_iso is None:
            before_iso = (
                datetime
                .now(UTC)
                .isoformat()
            )

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN",
            )
            .not_.is_(
                "due_date",
                "null",
            )
            .lt(
                "due_date",
                before_iso,
            )
            .execute()
        )

        return response.data or []

    def get_stale_open_actions(
        self,
        created_before_iso: str,
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "status",
                "OPEN",
            )
            .lt(
                "created_at",
                created_before_iso,
            )
            .execute()
        )

        return response.data or []

    def get_escalation_parent_action_ids(
        self,
    ) -> set[str]:

        response = (
            self.client
            .table(self.table_name)
            .select("parent_action_id")
            .eq(
                "status",
                "OPEN",
            )
            .eq(
                "action_type",
                "ESCALATION",
            )
            .not_.is_(
                "parent_action_id",
                "null",
            )
            .execute()
        )

        return {
            row["parent_action_id"]
            for row in (response.data or [])
            if row.get("parent_action_id")
        }

    # ==========================================
    # STATUS MANAGEMENT
    # ==========================================

    def update_action_status(
        self,
        action_id: str,
        status: str,
    ):

        response = (
            self.client
            .table(self.table_name)
            .update({
                "status": status
            })
            .eq(
                "id",
                action_id
            )
            .execute()
        )

        return response.data[0]

    def close_action(
        self,
        action_id: str
    ):

        response = (
            self.client
            .table(self.table_name)
            .update({
                "status":
                    "CLOSED"
            })
            .eq(
                "id",
                action_id
            )
            .execute()
        )

        return response.data[0]

    # ==========================================
    # ASSIGNMENT
    # ==========================================

    def assign_action(
        self,
        action_id: str,
        assigned_to: str,
    ):

        response = (
            self.client
            .table(self.table_name)
            .update({
                "assigned_to":
                    assigned_to
            })
            .eq(
                "id",
                action_id
            )
            .execute()
        )

        return response.data[0]

    def count_open_actions_for_assignee(self, profile_id: str) -> int:
        response = (
            self.client
            .table(self.table_name)
            .select("id")
            .eq("assigned_to", profile_id)
            .in_("status", ["OPEN", "IN_PROGRESS", "BLOCKED"])
            .execute()
        )

        return len(response.data or [])

    def get_assignees_for_open_actions(self, profile_ids: list[str]) -> list[dict]:
        if not profile_ids:
            return []

        response = (
            self.client
            .table(self.table_name)
            .select("assigned_to")
            .in_("assigned_to", profile_ids)
            .in_("status", ["OPEN", "IN_PROGRESS", "BLOCKED"])
            .execute()
        )

        return response.data or []
