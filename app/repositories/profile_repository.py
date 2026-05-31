from app.db.supabase_client import (
    supabase
)


class ProfileRepository:

    def __init__(self):

        self.client = (
            supabase
        )

        self.table_name = (
            "profiles"
        )

    # ==========================================
    # GETTERS
    # ==========================================

    def get_profile_by_id(
        self,
        profile_id: str,
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "id",
                profile_id
            )
            .limit(1)
            .execute()
        )

        if not response.data:

            return None

        return response.data[0]

    def update_profile(
        self,
        profile_id: str,
        updates: dict,
    ):

        response = (
            self.client
            .table(self.table_name)
            .update(updates)
            .eq(
                "id",
                profile_id
            )
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]

    def list_profiles_by_organization(
        self,
        organization_id: str,
    ):

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "organization_id",
                organization_id,
            )
            .order("created_at", desc=True)
            .execute()
        )

        return response.data or []

    def create_profile(
        self,
        profile: dict,
    ):

        response = (
            self.client
            .table(self.table_name)
            .insert(profile)
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]

    def delete_profile(
        self,
        profile_id: str,
    ) -> bool:

        (
            self.client
            .table(self.table_name)
            .delete()
            .eq(
                "id",
                profile_id,
            )
            .execute()
        )

        return True