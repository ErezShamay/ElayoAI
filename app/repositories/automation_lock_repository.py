from datetime import (
    datetime,
    timezone,
)

from postgrest.exceptions import APIError

from app.db.supabase_client import (
    supabase
)

from app.schemas.automation_lock import (
    AutomationLock
)


class AutomationLockRepository:

    def __init__(self):

        self.client = (
            supabase
        )

        self.table_name = (
            "automation_locks"
        )

    # ==========================================
    # GET LOCK
    # ==========================================

    def get_lock(
        self,
        lock_key: str,
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "lock_key",
                lock_key
            )
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]

    # ==========================================
    # CREATE LOCK
    # ==========================================

    def create_lock(
        self,
        lock: AutomationLock,
    ):

        payload = lock.model_dump(
            mode="json"
        )

        try:
            response = (
                self.client
                .table(self.table_name)
                .insert(payload)
                .execute()
            )
        except APIError as error:
            if "owner_token" not in str(error):
                raise

            payload.pop("owner_token", None)
            response = (
                self.client
                .table(self.table_name)
                .insert(payload)
                .execute()
            )

        return response.data[0]

    # ==========================================
    # DELETE LOCK
    # ==========================================

    def delete_lock(
        self,
        lock_key: str,
        owner_token: str | None = None,
    ):
        query = (
            self.client
            .table(self.table_name)
            .delete()
            .eq(
                "lock_key",
                lock_key,
            )
        )
        if owner_token is not None:
            query = query.eq(
                "owner_token",
                owner_token,
            )
        response = query.execute()
        return bool(response.data)

    # ==========================================
    # LOCK EXPIRED
    # ==========================================

    def is_lock_expired(
        self,
        lock: dict,
    ):

        expires_at = (
            datetime.fromisoformat(
                lock[
                    "expires_at"
                ].replace(
                    "Z",
                    "+00:00"
                )
            )
        )

        return (
            expires_at
            < datetime.now(
                timezone.utc
            )
        )
