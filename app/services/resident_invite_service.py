from __future__ import annotations

import logging

from app.auth.roles import can_assign_role
from app.exceptions.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.repositories.profile_repository import ProfileRepository
from app.repositories.project_apartment_repository import (
    ProjectApartmentRepository,
)
from app.services.user_management_service import UserManagementService

logger = logging.getLogger(__name__)

RESIDENT_ROLE = "RESIDENT"


class ResidentInviteService:
    def __init__(
        self,
        apartment_repository: ProjectApartmentRepository | None = None,
        profile_repository: ProfileRepository | None = None,
        user_management_service: UserManagementService | None = None,
    ) -> None:
        self.apartment_repository = (
            apartment_repository or ProjectApartmentRepository()
        )
        self.profile_repository = profile_repository or ProfileRepository()
        self.user_management_service = (
            user_management_service or UserManagementService()
        )

    def invite_resident_for_apartment(
        self,
        *,
        organization_id: str,
        apartment_id: str,
        invited_by: str,
        inviter_role: str,
    ) -> dict:
        if not can_assign_role(
            actor_role=inviter_role,
            target_role=RESIDENT_ROLE,
        ):
            raise ValidationError(
                message="אין הרשאה להזמין דיירים",
            )

        apartment = self.apartment_repository.get_by_id(apartment_id)
        if apartment is None:
            raise NotFoundError(message="Apartment not found")

        if str(apartment.get("organization_id")) != organization_id:
            raise NotFoundError(message="Apartment not found")

        email = str(apartment.get("email") or "").strip().lower()
        owner_name = str(apartment.get("owner_name") or "").strip()

        if not email:
            raise ValidationError(
                message="נדרש מייל לדייר לפני שליחת הזמנה",
            )

        if not owner_name:
            raise ValidationError(message="נדרש שם דייר")

        if apartment.get("resident_profile_id"):
            raise ConflictError(
                message="לדייר זה כבר יש חשבון במערכת",
            )

        invite_result = self.user_management_service.invite_resident_user(
            organization_id=organization_id,
            email=email,
            full_name=owner_name,
            invited_by=invited_by,
            inviter_role=inviter_role,
        )

        profile_id = str(invite_result.get("profile_id") or "")
        if not profile_id:
            raise ValidationError(message="Failed to create resident profile")

        self.apartment_repository.link_resident_profile(
            apartment_id=apartment_id,
            profile_id=profile_id,
            invite_status="pending",
        )
        self.apartment_repository.set_profile_apartment_link(
            profile_id=profile_id,
            apartment_id=apartment_id,
        )

        return {
            "apartment_id": apartment_id,
            "profile_id": profile_id,
            "invite_status": "pending",
            "email_status": invite_result.get("email_status", "SKIPPED"),
            "invite_link": invite_result.get("invite_link"),
        }

    def bulk_invite_residents(
        self,
        *,
        organization_id: str,
        project_id: str,
        invited_by: str,
        inviter_role: str,
    ) -> dict:
        apartments = self.apartment_repository.list_by_project(project_id)
        invited: list[dict] = []
        skipped: list[dict] = []

        for apartment in apartments:
            if str(apartment.get("organization_id")) != organization_id:
                continue
            if apartment.get("resident_profile_id"):
                skipped.append(
                    {
                        "apartment_id": apartment.get("id"),
                        "reason": "already_invited",
                    }
                )
                continue
            if not str(apartment.get("email") or "").strip():
                skipped.append(
                    {
                        "apartment_id": apartment.get("id"),
                        "reason": "missing_email",
                    }
                )
                continue

            try:
                result = self.invite_resident_for_apartment(
                    organization_id=organization_id,
                    apartment_id=str(apartment["id"]),
                    invited_by=invited_by,
                    inviter_role=inviter_role,
                )
                invited.append(result)
            except Exception as error:
                logger.warning(
                    "Resident invite failed",
                    extra={
                        "apartment_id": apartment.get("id"),
                        "error": str(error),
                    },
                )
                skipped.append(
                    {
                        "apartment_id": apartment.get("id"),
                        "reason": str(error),
                    }
                )

        return {
            "invited": invited,
            "skipped": skipped,
            "invited_count": len(invited),
            "skipped_count": len(skipped),
        }
