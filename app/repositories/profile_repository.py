from postgrest.exceptions import APIError

from app.db.supabase_client import (
    supabase
)
from app.exceptions.exceptions import ConfigurationError

PROFILE_ORG_ID_KEYS = (
    "organization_id",
    "org_id",
)

MIGRATION_SQL_PATH = (
    "deploy/sql/20260531_profiles_tenant_isolation.sql"
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

        if not self.supports_organization_column():
            raise ConfigurationError(
                message=(
                    "profiles.organization_id column is missing. "
                    f"Run {MIGRATION_SQL_PATH} in Supabase SQL Editor."
                ),
            )

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

    def count_profiles_with_role(
        self,
        organization_id: str,
        role: str,
    ) -> int:

        normalized_role = role.strip().upper()

        response = (
            self.client
            .table(self.table_name)
            .select(
                "id",
                count="exact",
            )
            .eq(
                "organization_id",
                organization_id,
            )
            .eq(
                "role",
                normalized_role,
            )
            .limit(0)
            .execute()
        )

        return response.count or 0

    def get_profile_by_email_in_organization(
        self,
        organization_id: str,
        email: str,
    ):

        normalized_email = (
            email.strip().lower()
        )

        response = (
            self.client
            .table(self.table_name)
            .select("*")
            .eq(
                "organization_id",
                organization_id,
            )
            .ilike(
                "email",
                normalized_email,
            )
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]

    def supports_organization_column(self) -> bool:

        try:
            (
                self.client
                .table(self.table_name)
                .select("organization_id")
                .limit(1)
                .execute()
            )
            return True
        except APIError as error:
            if self._is_missing_column_error(
                error,
                "organization_id",
            ):
                return False
            raise

    def create_profile(
        self,
        profile: dict,
    ):

        if (
            not self.supports_organization_column()
            and ProfileRepository.extract_organization_id(profile)
        ):
            raise ConfigurationError(
                message=(
                    "profiles.organization_id column is missing. "
                    f"Run {MIGRATION_SQL_PATH} in Supabase SQL Editor."
                ),
            )

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

    @staticmethod
    def extract_organization_id(
        profile: dict,
    ) -> str:

        for key in PROFILE_ORG_ID_KEYS:
            value = str(
                profile.get(key) or ""
            ).strip()

            if value:
                return value

        return ""

    @staticmethod
    def _strip_org_fields(
        profile: dict,
    ) -> dict:

        return {
            key: value
            for key, value in profile.items()
            if key not in PROFILE_ORG_ID_KEYS
        }

    @staticmethod
    def _is_missing_column_error(
        error: APIError,
        column: str,
    ) -> bool:

        message = str(error).lower()
        return (
            "does not exist" in message
            and column.lower() in message
        )

    @staticmethod
    def _is_missing_org_column_error(
        error: APIError,
    ) -> bool:

        message = str(error).lower()
        return (
            "does not exist" in message
            and any(
                key in message
                for key in PROFILE_ORG_ID_KEYS
            )
        )
