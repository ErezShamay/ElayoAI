from __future__ import annotations

import logging

from app.auth.roles import RESIDENT_ROLE
from app.repositories.project_apartment_repository import (
    ProjectApartmentRepository,
)

logger = logging.getLogger(__name__)


class ResidentActivationService:
    def __init__(
        self,
        apartment_repository: ProjectApartmentRepository | None = None,
    ) -> None:
        self.apartment_repository = (
            apartment_repository or ProjectApartmentRepository()
        )

    def activate_on_login(
        self,
        *,
        profile_id: str,
        role: str,
    ) -> bool:
        if role.strip().upper() != RESIDENT_ROLE:
            return False

        activated = self.apartment_repository.activate_resident_by_profile_id(
            profile_id
        )
        if activated:
            logger.info(
                "Resident account activated",
                extra={
                    "event": "resident.account_activated",
                    "profile_id": profile_id,
                },
            )
        return activated
