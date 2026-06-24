from __future__ import annotations

import pytest

from app.exceptions.exceptions import NotFoundError, ValidationError
from app.repositories.project_apartment_repository import build_apartment_group_key
from app.services.project_apartment_service import ProjectApartmentService
from tests.test_project_zero_setup_gate import (
    InMemoryProjectApartmentRepository,
    InMemoryProjectRepository,
)


class EditableApartmentRepository(InMemoryProjectApartmentRepository):
    def get_by_id(self, apartment_id: str) -> dict | None:
        for record in self.records:
            if str(record.get("id")) == apartment_id:
                return record
        return None

    def get_by_project_and_number(
        self,
        *,
        project_id: str,
        apartment_number: str,
    ) -> dict | None:
        normalized_number = apartment_number.strip()
        for record in self.records:
            if (
                str(record.get("project_id")) == project_id
                and str(record.get("apartment_number")) == normalized_number
            ):
                return record
        return None

    def update_apartment_by_id(
        self,
        *,
        apartment_id: str,
        apartment_number: str,
        owner_name: str,
        phone: str | None = None,
        email: str | None = None,
    ) -> dict | None:
        record = self.get_by_id(apartment_id)
        if record is None:
            return None

        normalized_number = apartment_number.strip()
        record.update(
            {
                "apartment_number": normalized_number,
                "group_key": build_apartment_group_key(normalized_number),
                "owner_name": owner_name.strip(),
                "phone": (phone or "").strip() or None,
                "email": (email or "").strip().lower() or None,
            }
        )
        return record


def _build_service(
    *,
    project_repo: InMemoryProjectRepository,
    apartment_repo: EditableApartmentRepository,
) -> ProjectApartmentService:
    return ProjectApartmentService(
        apartment_repository=apartment_repo,
        project_repository=project_repo,
    )


def test_update_apartment_updates_row() -> None:
    project_repo = InMemoryProjectRepository()
    apartment_repo = EditableApartmentRepository()
    project = project_repo.create_project(
        organization_id="org-1",
        project_name="פרויקט",
    )
    apartment_repo.records.append(
        {
            "id": "apt-1",
            "organization_id": "org-1",
            "project_id": project["id"],
            "apartment_number": "2",
            "group_key": "apartment:2",
            "owner_name": "ישראל ישראלי",
            "phone": "0500000000",
            "email": "old@example.com",
            "invite_status": "none",
        }
    )

    service = _build_service(
        project_repo=project_repo,
        apartment_repo=apartment_repo,
    )

    result = service.update_apartment(
        organization_id="org-1",
        project_id=project["id"],
        apartment_id="apt-1",
        apartment_number="3",
        owner_name="דוד כהן",
        phone="0501111111",
        email="new@example.com",
    )

    assert result["apartment"]["apartment_number"] == "3"
    assert result["apartment"]["owner_name"] == "דוד כהן"
    assert result["apartment"]["phone"] == "0501111111"
    assert result["apartment"]["email"] == "new@example.com"


def test_update_apartment_rejects_duplicate_number() -> None:
    project_repo = InMemoryProjectRepository()
    apartment_repo = EditableApartmentRepository()
    project = project_repo.create_project(
        organization_id="org-1",
        project_name="פרויקט",
    )
    apartment_repo.records.extend(
        [
            {
                "id": "apt-1",
                "organization_id": "org-1",
                "project_id": project["id"],
                "apartment_number": "2",
                "group_key": "apartment:2",
                "owner_name": "א",
                "invite_status": "none",
            },
            {
                "id": "apt-2",
                "organization_id": "org-1",
                "project_id": project["id"],
                "apartment_number": "3",
                "group_key": "apartment:3",
                "owner_name": "ב",
                "invite_status": "none",
            },
        ]
    )

    service = _build_service(
        project_repo=project_repo,
        apartment_repo=apartment_repo,
    )

    with pytest.raises(ValidationError):
        service.update_apartment(
            organization_id="org-1",
            project_id=project["id"],
            apartment_id="apt-1",
            apartment_number="3",
            owner_name="א",
        )


def test_update_apartment_not_found() -> None:
    project_repo = InMemoryProjectRepository()
    apartment_repo = EditableApartmentRepository()
    project = project_repo.create_project(
        organization_id="org-1",
        project_name="פרויקט",
    )
    service = _build_service(
        project_repo=project_repo,
        apartment_repo=apartment_repo,
    )

    with pytest.raises(NotFoundError):
        service.update_apartment(
            organization_id="org-1",
            project_id=project["id"],
            apartment_id="missing",
            apartment_number="1",
            owner_name="דייר",
        )
