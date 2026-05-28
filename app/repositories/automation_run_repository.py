from app.db.supabase_client import (
    supabase
)

from app.schemas.automation_run import (
    AutomationRun
)


class AutomationRunRepository:

    def __init__(self):

        self.client = (
            supabase
        )

        self.table_name = (
            "automation_runs"
        )

    def create_run(
        self,
        run: AutomationRun,
    ):

        response = (
            self.client
            .table(self.table_name)
            .insert(
                run.model_dump(
                    mode="json",
                    exclude_none=True
                )
            )
            .execute()
        )

        return response.data[0]

    def update_run(
        self,
        run_id: str,
        payload: dict,
    ):

        response = (
            self.client
            .table(self.table_name)
            .update(payload)
            .eq(
                "id",
                run_id
            )
            .execute()
        )

        return response.data[0]

    def get_run_by_id(
        self,
        run_id: str,
    ):
        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "id",
                run_id,
            )
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]

    def get_latest_run(
        self,
        job_name: str,
    ):
        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "job_name",
                job_name,
            )
            .order(
                "started_at",
                desc=True,
            )
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return response.data[0]
