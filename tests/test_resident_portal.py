from unittest.mock import MagicMock, patch

from app.auth.permissions import resolve_permissions
from app.auth.roles import (
    RESIDENT_ROLE,
    can_invite_resident,
    is_resident_role,
)
from app.schemas.quality_issue import IssueVisibility, is_visible_to_resident
from app.services.resident_portal_service import ResidentPortalService


def test_resident_role_has_portal_read_only_permissions():
    permissions = resolve_permissions(RESIDENT_ROLE)
    assert "resident_portal:read" in permissions
    assert "projects:write" not in permissions
    assert "apartments:write" not in permissions


def test_staff_can_invite_residents():
    assert can_invite_resident("ADMIN") is True
    assert can_invite_resident("SUPERVISOR") is True
    assert can_invite_resident("VIEWER") is False


def test_is_resident_role():
    assert is_resident_role("RESIDENT") is True
    assert is_resident_role("resident") is True
    assert is_resident_role("VIEWER") is False


def test_supervisor_has_apartments_permissions():
    permissions = resolve_permissions("SUPERVISOR")
    assert "apartments:read" in permissions
    assert "apartments:write" in permissions


def test_admin_and_manager_have_field_reports_publish():
    assert "field_reports:publish" in resolve_permissions("ADMIN")
    assert "field_reports:publish" in resolve_permissions("MANAGER")
    assert "field_reports:publish" not in resolve_permissions("SUPERVISOR")
    assert "field_reports:publish" not in resolve_permissions("RESIDENT")


def test_is_visible_to_resident_only_published():
    assert is_visible_to_resident(IssueVisibility.PUBLISHED) is True
    assert is_visible_to_resident(IssueVisibility.DRAFT) is False
    assert is_visible_to_resident(None) is True


def test_resident_portal_collect_issues_excludes_draft():
    service = ResidentPortalService(
        issue_repository=MagicMock(
            is_storage_available=MagicMock(return_value=True),
            list_by_project=MagicMock(
                return_value=[
                    {
                        "id": "issue-draft",
                        "organization_id": "org-1",
                        "project_id": "proj-1",
                        "group_key": "apartment:12",
                        "title": "טיוטה",
                        "status": "OPEN",
                        "visibility": IssueVisibility.DRAFT.value,
                    },
                    {
                        "id": "issue-published",
                        "organization_id": "org-1",
                        "project_id": "proj-1",
                        "group_key": "apartment:12",
                        "title": "מפורסם",
                        "status": "OPEN",
                        "visibility": IssueVisibility.PUBLISHED.value,
                    },
                ]
            ),
        )
    )

    issues, records = service._collect_issues(
        organization_id="org-1",
        project_id="proj-1",
        group_key="apartment:12",
    )

    assert [issue.id for issue in issues] == ["issue-published"]
    assert len(records) == 1


def test_resident_portal_collect_issues_blocks_null_visibility():
    service = ResidentPortalService(
        issue_repository=MagicMock(
            is_storage_available=MagicMock(return_value=True),
            list_by_project=MagicMock(
                return_value=[
                    {
                        "id": "issue-null-vis",
                        "organization_id": "org-1",
                        "project_id": "proj-1",
                        "group_key": "apartment:12",
                        "title": "ללא visibility",
                        "status": "OPEN",
                        "visibility": None,
                    },
                ]
            ),
        )
    )

    issues, records = service._collect_issues(
        organization_id="org-1",
        project_id="proj-1",
        group_key="apartment:12",
    )

    assert issues == []
    assert records == []


def test_resident_portal_collect_issues_includes_shared_property():
    service = ResidentPortalService(
        issue_repository=MagicMock(
            is_storage_available=MagicMock(return_value=True),
            list_by_project=MagicMock(
                return_value=[
                    {
                        "id": "issue-shared",
                        "organization_id": "org-1",
                        "project_id": "proj-1",
                        "group_key": "",
                        "title": "לובי",
                        "status": "OPEN",
                        "visibility": IssueVisibility.PUBLISHED.value,
                    },
                ]
            ),
        )
    )

    issues, _records = service._collect_issues(
        organization_id="org-1",
        project_id="proj-1",
        group_key="apartment:12",
    )

    assert [issue.id for issue in issues] == ["issue-shared"]


@patch(
    "app.repositories.field_visit_report_repository.FieldVisitReportRepository",
)
def test_resident_portal_field_lines_exclude_draft(mock_report_repo_cls):
    report_repository = MagicMock()
    report_repository.is_storage_available.return_value = True
    report_repository.list_by_organization.return_value = [
        {
            "id": "report-1",
            "visit_date": "2026-06-01",
            "status": "CLOSED",
            "title": "דוח גמר",
        }
    ]
    mock_report_repo_cls.return_value = report_repository

    line_repository = MagicMock()
    line_repository.list_by_report.return_value = [
        {
            "id": "line-draft",
            "group_key": "apartment:12",
            "description": "טיוטה",
            "status": "OPEN",
            "visibility": IssueVisibility.DRAFT.value,
        },
        {
            "id": "line-published",
            "group_key": "apartment:12",
            "description": "מפורסם",
            "status": "OPEN",
            "visibility": IssueVisibility.PUBLISHED.value,
        },
    ]

    service = ResidentPortalService(line_repository=line_repository)

    summaries, lines, _progress = service._collect_field_reports(
        organization_id="org-1",
        project_id="proj-1",
        group_key="apartment:12",
        actor_role="RESIDENT",
    )

    assert len(summaries) == 1
    assert summaries[0].line_count == 1
    assert [line.id for line in lines] == ["line-published"]
