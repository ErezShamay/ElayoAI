from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.auth.roles import PLATFORM_ADMIN_ROLE
from app.exceptions.exceptions import ForbiddenError, NotFoundError
from app.services.organization_deletion_service import (
    OrganizationDeletionService,
)


class FakeOrganizationRepository:
    def __init__(self, organization: dict | None):
        self.organization = organization
        self.deleted_ids: list[str] = []

    def get_by_id(self, organization_id: str):
        if self.organization and self.organization["id"] == organization_id:
            return self.organization
        return None

    def delete_organization(self, organization_id: str) -> bool:
        self.deleted_ids.append(organization_id)
        return True


class FakeProjectRepository:
    def get_projects_by_organization(self, organization_id: str):
        return [{"id": "project-1", "organization_id": organization_id}]


class FakeProfileRepository:
    def __init__(self, profiles: list[dict]):
        self.profiles = profiles
        self.deleted_ids: list[str] = []
        self.cleared_ids: list[str] = []

    def list_profiles_by_organization(self, organization_id: str):
        return [
            profile
            for profile in self.profiles
            if profile.get("organization_id") == organization_id
        ]

    def delete_profile(self, profile_id: str) -> bool:
        self.deleted_ids.append(profile_id)
        return True

    def supports_organization_column(self) -> bool:
        return True

    def update_profile(self, profile_id: str, updates: dict):
        if updates.get("organization_id") is None:
            self.cleared_ids.append(profile_id)
        return {"id": profile_id, **updates}


class FakeSupabaseTable:
    def __init__(self, name: str, store: dict[str, list[dict]]):
        self.name = name
        self.store = store
        self._filters: dict[str, str] = {}
        self._in_filters: dict[str, list[str]] = {}

    def select(self, *_columns):
        return self

    def delete(self):
        return self

    def eq(self, column: str, value: str):
        self._filters[column] = value
        return self

    def in_(self, column: str, values: list[str]):
        self._in_filters[column] = values
        return self

    def execute(self):
        rows = self.store.setdefault(self.name, [])
        remaining = []
        deleted = []

        for row in rows:
            matches = all(
                row.get(column) == value
                for column, value in self._filters.items()
            )

            for column, values in self._in_filters.items():
                if row.get(column) not in values:
                    matches = False
                    break

            if matches:
                deleted.append(row)
            else:
                remaining.append(row)

        self.store[self.name] = remaining

        response = MagicMock()
        response.data = deleted
        return response


class FakeSupabaseClient:
    def __init__(self, store: dict[str, list[dict]]):
        self.store = store
        self.auth = MagicMock()

    def table(self, name: str):
        return FakeSupabaseTable(name, self.store)


@pytest.fixture
def deletion_service() -> OrganizationDeletionService:
    store = {
        "operational_actions": [
            {"id": "action-1", "organization_id": "org-a"},
        ],
        "action_comments": [
            {"id": "comment-1", "action_id": "action-1"},
        ],
        "projects": [
            {"id": "project-1", "organization_id": "org-a"},
        ],
        "findings": [
            {"id": "finding-1", "project_id": "project-1"},
        ],
        "profiles": [],
        "organizations": [
            {"id": "org-a", "organization_name": "Client A"},
        ],
    }

    client = FakeSupabaseClient(store)

    return OrganizationDeletionService(
        organization_repository=FakeOrganizationRepository(
            {"id": "org-a", "organization_name": "Client A"}
        ),
        profile_repository=FakeProfileRepository(
            [
                {
                    "id": "user-1",
                    "role": "ADMIN",
                    "organization_id": "org-a",
                },
                {
                    "id": "platform-1",
                    "role": PLATFORM_ADMIN_ROLE,
                    "organization_id": "org-a",
                },
            ]
        ),
        project_repository=FakeProjectRepository(),
        photo_service=MagicMock(),
        client=client,
    )


def test_only_platform_admin_can_delete_organization(
    deletion_service: OrganizationDeletionService,
):
    with pytest.raises(ForbiddenError):
        deletion_service.delete_organization(
            organization_id="org-a",
            actor_user_id="user-1",
            actor_role="ADMIN",
        )


def test_delete_organization_purges_users_projects_and_org(
    deletion_service: OrganizationDeletionService,
):
    result = deletion_service.delete_organization(
        organization_id="org-a",
        actor_user_id="platform-1",
        actor_role=PLATFORM_ADMIN_ROLE,
    )

    assert result["status"] == "deleted"
    assert result["organization_id"] == "org-a"
    assert result["deleted_user_ids"] == ["user-1"]
    assert result["cleared_platform_admin_ids"] == ["platform-1"]
    assert deletion_service.organization_repository.deleted_ids == ["org-a"]
    assert deletion_service.profile_repository.deleted_ids == ["user-1"]
    assert deletion_service.profile_repository.cleared_ids == ["platform-1"]
    assert deletion_service.client.store["projects"] == []
    assert deletion_service.client.store["findings"] == []
    assert deletion_service.client.store["action_comments"] == []


def test_delete_missing_organization_raises_not_found(
    deletion_service: OrganizationDeletionService,
):
    with pytest.raises(NotFoundError):
        deletion_service.delete_organization(
            organization_id="missing-org",
            actor_user_id="platform-1",
            actor_role=PLATFORM_ADMIN_ROLE,
        )
