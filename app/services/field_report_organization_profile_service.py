from __future__ import annotations

from app.exceptions.exceptions import NotFoundError
from app.repositories.organization_repository import (
    OrganizationRepository,
)
from app.services.field_report_module_service import (
    FieldReportModuleService,
)


class FieldReportOrganizationProfileService:
    def __init__(
        self,
        organization_repository:
            OrganizationRepository | None = None,
        module_service: FieldReportModuleService | None = None,
    ) -> None:
        self.organization_repository = (
            organization_repository or OrganizationRepository()
        )
        self.module_service = (
            module_service or FieldReportModuleService()
        )

    def get_profile(
        self,
        organization_id: str,
        *,
        require_module: bool = True,
    ) -> dict:
        if require_module:
            self.module_service.require_enabled(organization_id)

        organization = self.organization_repository.get_by_id(
            organization_id
        )

        if not organization:
            raise NotFoundError(
                message="Organization not found",
                resource_type="organization",
                resource_id=organization_id,
            )

        name = (
            organization.get("organization_name")
            or organization.get("name")
            or organization_id
        )
        logo_path = organization.get("logo_storage_path")

        return {
            "organization_id": organization_id,
            "organization_name": name,
            "contact_email": organization.get("contact_email"),
            "report_phone": organization.get("report_phone"),
            "report_address_line": organization.get(
                "report_address_line"
            ),
            "report_city": organization.get("report_city"),
            "report_tagline": organization.get("report_tagline"),
            "logo_storage_path": logo_path,
            "logo_url": logo_path,
        }
