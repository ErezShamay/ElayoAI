from __future__ import annotations

import logging

from postgrest.exceptions import APIError

from app.db.supabase_client import supabase
from app.repositories.organization_repository import (
    OrganizationRepository,
)
from app.repositories.profile_repository import (
    ProfileRepository,
)

logger = logging.getLogger(__name__)

MIGRATION_SQL_PATH = (
    "deploy/sql/20260531_profiles_tenant_isolation.sql"
)


class TenantMigrationService:
    def __init__(
        self,
        profile_repository: ProfileRepository | None = None,
        organization_repository: OrganizationRepository | None = None,
    ) -> None:
        self.profile_repository = (
            profile_repository or ProfileRepository()
        )
        self.organization_repository = (
            organization_repository or OrganizationRepository()
        )

    def get_status(self) -> dict:
        profiles_ready = (
            self.profile_repository
            .supports_organization_column()
        )
        owners_ready = (
            self.organization_repository
            .supports_owner_profile_column()
        )
        organization_count = 0
        unassigned_profiles = 0
        unassigned_projects = 0

        try:
            organizations_response = (
                supabase.table("organizations")
                .select("id", count="exact")
                .execute()
            )
            organization_count = (
                organizations_response.count or 0
            )
        except APIError:
            organization_count = 0

        if profiles_ready:
            profiles_response = (
                supabase.table("profiles")
                .select("id, organization_id")
                .execute()
            )
            unassigned_profiles = sum(
                1
                for profile in profiles_response.data or []
                if not ProfileRepository.extract_organization_id(
                    profile
                )
            )

        try:
            projects_response = (
                supabase.table("projects")
                .select("id, organization_id")
                .execute()
            )
            unassigned_projects = sum(
                1
                for project in projects_response.data or []
                if not str(project.get("organization_id") or "").strip()
            )
        except APIError:
            unassigned_projects = 0

        return {
            "profiles_organization_column": profiles_ready,
            "organizations_owner_column": owners_ready,
            "ready": profiles_ready,
            "organization_count": organization_count,
            "single_customer_mode": organization_count <= 1,
            "unassigned_profiles": unassigned_profiles,
            "unassigned_projects": unassigned_projects,
            "migration_sql_path": MIGRATION_SQL_PATH,
        }

    def backfill(self) -> dict:
        if not self.profile_repository.supports_organization_column():
            return {
                "status": "migration_required",
                "message": (
                    "Run the SQL migration in Supabase before backfill."
                ),
                "migration_sql_path": MIGRATION_SQL_PATH,
            }

        organization = (
            self.organization_repository.get_first_organization()
        )

        if not organization:
            return {
                "status": "organization_required",
                "message": (
                    "No customer organization exists. "
                    "Create one customer before running backfill."
                ),
            }

        org_id = str(organization["id"]).strip()
        org_name = str(
            organization.get("organization_name")
            or organization.get("name")
            or org_id
        ).strip()
        profiles_updated = 0
        projects_updated = 0
        owners_updated = 0

        profiles_response = (
            supabase.table("profiles")
            .select("*")
            .execute()
        )

        for profile in profiles_response.data or []:
            profile_id = str(profile.get("id") or "").strip()

            if not profile_id:
                continue

            if not ProfileRepository.extract_organization_id(
                profile
            ):
                self.profile_repository.update_profile(
                    profile_id,
                    {"organization_id": org_id},
                )
                profiles_updated += 1

            if (
                str(profile.get("role") or "").upper() == "ADMIN"
                and self.organization_repository
                .supports_owner_profile_column()
            ):
                try:
                    response = (
                        supabase.table("organizations")
                        .update(
                            {"owner_profile_id": profile_id}
                        )
                        .eq("id", org_id)
                        .is_("owner_profile_id", "null")
                        .execute()
                    )
                    if response.data:
                        owners_updated += 1
                except APIError:
                    pass

        try:
            projects_response = (
                supabase.table("projects")
                .select("id, organization_id")
                .execute()
            )

            for project in projects_response.data or []:
                project_id = str(project.get("id") or "").strip()

                if not project_id:
                    continue

                if str(project.get("organization_id") or "").strip():
                    continue

                (
                    supabase.table("projects")
                    .update({"organization_id": org_id})
                    .eq("id", project_id)
                    .execute()
                )
                projects_updated += 1
        except APIError as error:
            logger.warning(
                "Project tenant backfill skipped",
                extra={"error": str(error)},
            )

        logger.info(
            "Tenant backfill completed",
            extra={
                "event": "audit.tenant_backfill",
                "organization_id": org_id,
                "profiles_updated": profiles_updated,
                "projects_updated": projects_updated,
                "owners_updated": owners_updated,
            },
        )

        return {
            "status": "completed",
            "organization_id": org_id,
            "organization_name": org_name,
            "single_customer_mode": True,
            "profiles_updated": profiles_updated,
            "projects_updated": projects_updated,
            "owners_updated": owners_updated,
            "message": (
                f"All existing data was linked to the sole customer: {org_name}"
            ),
        }
