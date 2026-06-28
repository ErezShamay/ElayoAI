from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.exceptions.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.services.project_deletion_service import (
    ProjectDeletionService,
)


class FakeProjectRepository:
    def __init__(self, project: dict | None):
        self.project = project
        self.deleted_ids: list[str] = []

    def get_project_by_id(self, project_id: str):
        if self.project and self.project["id"] == project_id:
            return self.project
        return None

    def delete_project(self, project_id: str) -> bool:
        if self.project and self.project["id"] == project_id:
            self.deleted_ids.append(project_id)
            return True
        return False


class FakeFieldVisitReportRepository:
    def list_by_organization(
        self,
        organization_id: str,
        *,
        project_id: str | None = None,
        include_hidden: bool = False,
    ):
        if project_id == "project-1":
            return [{"id": "report-1", "project_id": project_id}]
        return []


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

    def table(self, name: str):
        return FakeSupabaseTable(name, self.store)


@pytest.fixture
def deletion_service() -> ProjectDeletionService:
    store = {
        "quality_issues": [
            {
                "id": "issue-1",
                "organization_id": "org-a",
                "project_id": "project-1",
            }
        ],
        "quality_issue_events": [
            {"id": "event-1", "issue_id": "issue-1"},
        ],
        "operational_actions": [
            {"id": "action-1", "project_id": "project-1"},
        ],
        "action_comments": [
            {"id": "comment-1", "action_id": "action-1"},
        ],
        "weekly_reports": [
            {"id": "weekly-1", "project_id": "project-1"},
        ],
        "findings": [
            {"id": "finding-1", "project_id": "project-1"},
        ],
        "projects": [
            {
                "id": "project-1",
                "organization_id": "org-a",
                "project_name": "Alpha Tower",
            }
        ],
    }

    client = FakeSupabaseClient(store)

    return ProjectDeletionService(
        project_repository=FakeProjectRepository(
            {
                "id": "project-1",
                "organization_id": "org-a",
                "project_name": "Alpha Tower",
            }
        ),
        field_visit_report_repository=FakeFieldVisitReportRepository(),
        issue_repository=MagicMock(),
        issue_event_repository=MagicMock(),
        issue_photo_repository=MagicMock(),
        line_repository=MagicMock(),
        line_photo_repository=MagicMock(),
        client=client,
    )


def test_only_org_admin_can_delete_project(
    deletion_service: ProjectDeletionService,
):
    with pytest.raises(ForbiddenError):
        deletion_service.delete_project(
            organization_id="org-a",
            project_id="project-1",
            confirm_project_name="Alpha Tower",
            actor_user_id="user-1",
            actor_role="MANAGER",
        )


def test_delete_project_requires_matching_name(
    deletion_service: ProjectDeletionService,
):
    with pytest.raises(ValidationError):
        deletion_service.delete_project(
            organization_id="org-a",
            project_id="project-1",
            confirm_project_name="Wrong Name",
            actor_user_id="admin-1",
            actor_role="ADMIN",
        )


def test_delete_project_purges_related_data(
    deletion_service: ProjectDeletionService,
):
    result = deletion_service.delete_project(
        organization_id="org-a",
        project_id="project-1",
        confirm_project_name="Alpha Tower",
        actor_user_id="admin-1",
        actor_role="ADMIN",
    )

    assert result["status"] == "deleted"
    assert result["project_id"] == "project-1"
    assert deletion_service.project_repository.deleted_ids == ["project-1"]
    assert deletion_service.client.store["findings"] == []
    assert deletion_service.client.store["weekly_reports"] == []
    assert deletion_service.client.store["action_comments"] == []


def test_delete_missing_project_raises_not_found(
    deletion_service: ProjectDeletionService,
):
    with pytest.raises(NotFoundError):
        deletion_service.delete_project(
            organization_id="org-a",
            project_id="missing",
            confirm_project_name="Alpha Tower",
            actor_user_id="admin-1",
            actor_role="ADMIN",
        )
