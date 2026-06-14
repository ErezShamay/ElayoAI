from __future__ import annotations

from app.exceptions.exceptions import NotFoundError, ValidationError
from app.repositories.project_apartment_repository import (
    ProjectApartmentRepository,
)
from app.repositories.profile_repository import ProfileRepository
from app.repositories.project_repository import ProjectRepository
from app.schemas.project_apartment import ProjectApartmentRecord
from app.services.supervisor_project_scope import (
    project_supervised_by,
    resolve_supervisor_email,
    should_scope_projects_to_supervisor,
)


class ProjectApartmentService:
    def __init__(
        self,
        apartment_repository: ProjectApartmentRepository | None = None,
        project_repository: ProjectRepository | None = None,
        profile_repository: ProfileRepository | None = None,
    ) -> None:
        self.apartment_repository = (
            apartment_repository or ProjectApartmentRepository()
        )
        self.project_repository = project_repository or ProjectRepository()
        self.profile_repository = profile_repository or ProfileRepository()

    def _ensure_project_in_org(
        self,
        *,
        organization_id: str,
        project_id: str,
        actor_role: str | None = None,
        actor_user_id: str | None = None,
    ) -> dict:
        project = self.project_repository.get_project_by_id(project_id)
        if project is None:
            raise NotFoundError(message="Project not found")
        if str(project.get("organization_id")) != organization_id:
            raise NotFoundError(message="Project not found")
        if should_scope_projects_to_supervisor(actor_role):
            supervisor_email = resolve_supervisor_email(
                self.profile_repository,
                actor_user_id or "",
            )
            if not project_supervised_by(project, supervisor_email):
                raise NotFoundError(message="Project not found")
        return project

    def list_apartments(
        self,
        *,
        organization_id: str,
        project_id: str,
        actor_role: str | None = None,
        actor_user_id: str | None = None,
    ) -> dict:
        self._ensure_project_in_org(
            organization_id=organization_id,
            project_id=project_id,
            actor_role=actor_role,
            actor_user_id=actor_user_id,
        )
        rows = self.apartment_repository.list_by_project(project_id)
        apartments = [
            ProjectApartmentRecord.model_validate(row).model_dump()
            for row in rows
            if str(row.get("organization_id")) == organization_id
        ]
        return {
            "apartments": apartments,
            "total": len(apartments),
        }

    def bulk_upsert(
        self,
        *,
        organization_id: str,
        project_id: str,
        apartments: list[dict],
        actor_role: str | None = None,
        actor_user_id: str | None = None,
    ) -> dict:
        self._ensure_project_in_org(
            organization_id=organization_id,
            project_id=project_id,
            actor_role=actor_role,
            actor_user_id=actor_user_id,
        )

        if not apartments:
            raise ValidationError(message="At least one apartment is required")

        created = 0
        updated = 0
        saved: list[dict] = []

        for item in apartments:
            apartment_number = str(item.get("apartment_number") or "").strip()
            owner_name = str(item.get("owner_name") or "").strip()
            if not apartment_number or not owner_name:
                continue

            row, is_new = self.apartment_repository.upsert_apartment(
                organization_id=organization_id,
                project_id=project_id,
                apartment_number=apartment_number,
                owner_name=owner_name,
                phone=item.get("phone"),
                email=item.get("email"),
                building=item.get("building"),
                entrance=item.get("entrance"),
            )
            saved.append(
                ProjectApartmentRecord.model_validate(row).model_dump()
            )
            if is_new:
                created += 1
            else:
                updated += 1

        return {
            "apartments": saved,
            "created": created,
            "updated": updated,
        }

    def get_apartment_in_org(
        self,
        *,
        organization_id: str,
        apartment_id: str,
    ) -> dict:
        apartment = self.apartment_repository.get_by_id(apartment_id)
        if apartment is None:
            raise NotFoundError(message="Apartment not found")
        if str(apartment.get("organization_id")) != organization_id:
            raise NotFoundError(message="Apartment not found")
        return apartment
