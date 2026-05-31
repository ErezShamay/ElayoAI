from postgrest.exceptions import APIError

from app.config.settings import settings
from app.repositories.organization_repository import (
    OrganizationRepository,
)
from app.repositories.profile_repository import (
    ProfileRepository,
)

PROFILE_ORG_ID_KEYS = (
    "organization_id",
    "org_id",
)


class ProfileService:

    def __init__(
        self,
        organization_repository:
            OrganizationRepository | None = None,
    ):

        self.repository = (
            ProfileRepository()
        )
        self.organization_repository = (
            organization_repository
            or OrganizationRepository()
        )

    def get_profile(
        self,
        profile_id: str,
    ):

        return (
            self.repository
            .get_profile_by_id(
                profile_id
            )
        )

    def _extract_organization_id(
        self,
        profile: dict,
    ) -> str:

        for key in PROFILE_ORG_ID_KEYS:
            value = str(
                profile.get(key) or ""
            ).strip()

            if value:
                return value

        return ""

    def ensure_organization_id(
        self,
        profile_id: str,
    ) -> str | None:

        profile = self.get_profile(profile_id)

        if not profile:
            return None

        org_id = self._extract_organization_id(profile)

        if org_id:
            return org_id

        if settings.ENVIRONMENT not in {
            "local",
            "development",
            "test",
        }:
            return None

        organization = (
            self.organization_repository
            .get_first_organization()
        )

        if not organization:
            organization = (
                self.organization_repository
                .create_organization()
            )

        org_id = str(organization["id"]).strip()

        if "organization_id" in profile:
            try:
                self.repository.update_profile(
                    profile_id,
                    {
                        "organization_id": org_id,
                    },
                )
            except APIError as error:
                if "organization_id" not in str(error):
                    raise

        return org_id

    # ==========================================
    # ROLE HELPERS
    # ==========================================

    def is_admin(
        self,
        profile_id: str,
    ):

        profile = (
            self.get_profile(
                profile_id
            )
        )

        if not profile:

            return False

        return (
            profile["role"]
            == "ADMIN"
        )

    def is_manager(
        self,
        profile_id: str,
    ):

        profile = (
            self.get_profile(
                profile_id
            )
        )

        if not profile:

            return False

        return (
            profile["role"]
            in [
                "ADMIN",
                "MANAGER",
            ]
        )
