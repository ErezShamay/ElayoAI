from __future__ import annotations

import logging
import shutil
from pathlib import Path

from postgrest.exceptions import APIError

from app.auth.roles import is_org_admin
from app.db.supabase_client import supabase
from app.exceptions.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.repositories.field_visit_report_line_photo_repository import (
    FieldVisitReportLinePhotoRepository,
)
from app.repositories.field_visit_report_line_repository import (
    FieldVisitReportLineRepository,
)
from app.repositories.field_visit_report_repository import (
    FieldVisitReportRepository,
)
from app.repositories.postgrest_errors import (
    is_missing_column_error,
    is_missing_table_error,
)
from app.repositories.project_repository import (
    ProjectRepository,
)
from app.repositories.quality_issue_photo_repository import (
    QualityIssuePhotoRepository,
)
from app.repositories.quality_issue_repository import (
    QualityIssueEventRepository,
    QualityIssueRepository,
)
from app.services.field_visit_report_pdf_service import (
    FieldVisitReportPdfService,
)
from app.services.field_visit_report_photo_service import (
    FieldVisitReportPhotoService,
)
from app.services.project_illustration_service import (
    ProjectIllustrationService,
)
from app.services.quality_issue_photo_service import (
    QualityIssuePhotoService,
)

logger = logging.getLogger(__name__)

PROJECT_ID_CHUNK_SIZE = 50

PROJECT_SCOPED_TABLES: tuple[str, ...] = (
    "findings",
    "reports",
    "workspace_activity",
    "project_apartments",
)

ORG_AND_PROJECT_SCOPED_TABLES: tuple[str, ...] = (
    "ai_interpretations",
    "weekly_reports",
    "field_visit_reports",
    "automation_runs",
    "ai_execution_logs",
)


class ProjectDeletionService:
    def __init__(
        self,
        *,
        project_repository: ProjectRepository | None = None,
        field_visit_report_repository:
            FieldVisitReportRepository | None = None,
        line_repository:
            FieldVisitReportLineRepository | None = None,
        line_photo_repository:
            FieldVisitReportLinePhotoRepository | None = None,
        issue_repository: QualityIssueRepository | None = None,
        issue_event_repository:
            QualityIssueEventRepository | None = None,
        issue_photo_repository:
            QualityIssuePhotoRepository | None = None,
        field_photo_service:
            FieldVisitReportPhotoService | None = None,
        field_pdf_service: FieldVisitReportPdfService | None = None,
        quality_photo_service: QualityIssuePhotoService | None = None,
        illustration_service: ProjectIllustrationService | None = None,
        client=supabase,
    ) -> None:
        self.client = client
        self.project_repository = (
            project_repository or ProjectRepository()
        )
        self.field_visit_report_repository = (
            field_visit_report_repository or FieldVisitReportRepository()
        )
        self.line_repository = (
            line_repository or FieldVisitReportLineRepository()
        )
        self.line_photo_repository = (
            line_photo_repository or FieldVisitReportLinePhotoRepository()
        )
        self.issue_repository = issue_repository or QualityIssueRepository()
        self.issue_event_repository = (
            issue_event_repository or QualityIssueEventRepository()
        )
        self.issue_photo_repository = (
            issue_photo_repository or QualityIssuePhotoRepository()
        )
        self.field_photo_service = (
            field_photo_service or FieldVisitReportPhotoService()
        )
        self.field_pdf_service = (
            field_pdf_service or FieldVisitReportPdfService()
        )
        self.quality_photo_service = (
            quality_photo_service or QualityIssuePhotoService()
        )
        self.illustration_service = (
            illustration_service or ProjectIllustrationService()
        )

    def delete_project(
        self,
        *,
        organization_id: str,
        project_id: str,
        confirm_project_name: str,
        actor_user_id: str,
        actor_role: str,
    ) -> dict:
        if not is_org_admin(actor_role):
            raise ForbiddenError(
                message="Only client admins can delete projects"
            )

        normalized_project_id = project_id.strip()
        normalized_org_id = organization_id.strip()
        project = self.project_repository.get_project_by_id(
            normalized_project_id
        )

        if not project:
            raise NotFoundError(
                message="Project not found",
                resource_type="project",
                resource_id=normalized_project_id,
            )

        if str(project.get("organization_id") or "") != normalized_org_id:
            raise NotFoundError(
                message="Project not found",
                resource_type="project",
                resource_id=normalized_project_id,
            )

        expected_name = str(project.get("project_name") or "").strip()
        typed_name = confirm_project_name.strip()

        if not expected_name:
            raise ValidationError(
                message="Project name is required for deletion confirmation"
            )

        if typed_name != expected_name:
            raise ValidationError(
                message="שם הפרויקט שהוקלד אינו תואם לשם הרשום במערכת"
            )

        deleted_counts: dict[str, int] = {}

        issue_ids = self._list_issue_ids_for_project(
            normalized_org_id,
            normalized_project_id,
        )
        report_ids = self._list_field_visit_report_ids(
            normalized_org_id,
            normalized_project_id,
        )

        deleted_counts["quality_issue_events"] = (
            self._delete_quality_issue_events(issue_ids)
        )
        deleted_counts["quality_issue_photo_files"] = (
            self._purge_quality_issue_photo_files(
                normalized_org_id,
                normalized_project_id,
                issue_ids,
            )
        )
        deleted_counts["quality_issue_photos"] = (
            self._delete_rows_by_project_id(
                "quality_issue_photos",
                normalized_project_id,
            )
        )
        deleted_counts["quality_issues"] = (
            self._delete_rows_by_project_id(
                "quality_issues",
                normalized_project_id,
            )
        )

        deleted_counts["field_report_line_photo_files"] = (
            self._purge_field_report_line_photos(report_ids)
        )
        deleted_counts["field_visit_report_line_photos"] = (
            self._delete_rows_by_report_ids(
                "field_visit_report_line_photos",
                report_ids,
            )
        )
        deleted_counts["field_visit_report_lines"] = (
            self._delete_rows_by_report_ids(
                "field_visit_report_lines",
                report_ids,
            )
        )
        deleted_counts["field_report_pdf_files"] = (
            self._purge_field_report_pdf_files(
                normalized_org_id,
                normalized_project_id,
            )
        )

        for table_name in ORG_AND_PROJECT_SCOPED_TABLES:
            deleted_counts[table_name] = self._delete_rows_by_project_id(
                table_name,
                normalized_project_id,
            )

        deleted_counts["action_comments"] = (
            self._delete_action_comments_for_project(
                normalized_project_id
            )
        )
        deleted_counts["operational_actions"] = (
            self._delete_rows_by_project_id(
                "operational_actions",
                normalized_project_id,
            )
        )

        for table_name in PROJECT_SCOPED_TABLES:
            deleted_counts[table_name] = self._delete_rows_by_project_id(
                table_name,
                normalized_project_id,
            )

        deleted_counts["illustration_files"] = (
            self._purge_project_illustration_files(
                normalized_org_id,
                normalized_project_id,
            )
        )

        deleted = self.project_repository.delete_project(
            normalized_project_id
        )
        if not deleted:
            raise NotFoundError(
                message="Project not found",
                resource_type="project",
                resource_id=normalized_project_id,
            )

        deleted_counts["projects"] = 1

        logger.info(
            "Project permanently deleted",
            extra={
                "event": "audit.project_delete",
                "organization_id": normalized_org_id,
                "project_id": normalized_project_id,
                "project_name": expected_name,
                "actor_user_id": actor_user_id,
            },
        )

        return {
            "status": "deleted",
            "project_id": normalized_project_id,
            "project_name": expected_name,
            "deleted_counts": deleted_counts,
        }

    def _list_issue_ids_for_project(
        self,
        organization_id: str,
        project_id: str,
    ) -> list[str]:
        try:
            response = (
                self.client
                .table("quality_issues")
                .select("id")
                .eq("organization_id", organization_id)
                .eq("project_id", project_id)
                .execute()
            )
        except APIError as error:
            if is_missing_table_error(error, "quality_issues"):
                return []
            raise

        return [
            str(row.get("id"))
            for row in response.data or []
            if row.get("id")
        ]

    def _list_field_visit_report_ids(
        self,
        organization_id: str,
        project_id: str,
    ) -> list[str]:
        reports = (
            self.field_visit_report_repository
            .list_by_organization(
                organization_id,
                project_id=project_id,
                include_hidden=True,
            )
        )
        return [
            str(report.get("id"))
            for report in reports
            if report.get("id")
        ]

    def _delete_quality_issue_events(
        self,
        issue_ids: list[str],
    ) -> int:
        if not issue_ids or not self.issue_event_repository.is_storage_available():
            return 0

        deleted = 0
        for issue_id in issue_ids:
            deleted += self.issue_event_repository.delete_by_issue_id(
                issue_id
            )
        return deleted

    def _purge_quality_issue_photo_files(
        self,
        organization_id: str,
        project_id: str,
        issue_ids: list[str],
    ) -> int:
        removed = 0

        if self.issue_photo_repository.is_storage_available():
            for issue_id in issue_ids:
                for photo in self.issue_photo_repository.list_by_issue(
                    issue_id
                ):
                    storage_path = str(photo.get("storage_path") or "").strip()
                    if storage_path:
                        removed += self._delete_file_at_path(
                            self.quality_photo_service.resolve_absolute_path(
                                storage_path
                            )
                        )

            return removed

        try:
            response = (
                self.client
                .table("quality_issue_photos")
                .select("storage_path")
                .eq("organization_id", organization_id)
                .eq("project_id", project_id)
                .execute()
            )
        except APIError as error:
            if is_missing_table_error(error, "quality_issue_photos"):
                return 0
            raise

        for row in response.data or []:
            storage_path = str(row.get("storage_path") or "").strip()
            if storage_path:
                removed += self._delete_file_at_path(
                    self.quality_photo_service.resolve_absolute_path(
                        storage_path
                    )
                )

        return removed

    def _purge_field_report_line_photos(
        self,
        report_ids: list[str],
    ) -> int:
        if not report_ids:
            return 0

        removed = 0

        if self.line_photo_repository.is_storage_available():
            for report_id in report_ids:
                if not self.line_repository.is_storage_available():
                    continue

                for line in self.line_repository.list_by_report(report_id):
                    line_id = str(line.get("id") or "")
                    if not line_id:
                        continue

                    for photo in self.line_photo_repository.list_by_line(
                        line_id
                    ):
                        storage_path = str(
                            photo.get("storage_path") or ""
                        ).strip()
                        if storage_path:
                            self.field_photo_service.delete_photo(
                                storage_path
                            )
                            removed += 1

            return removed

        return removed

    def _purge_field_report_pdf_files(
        self,
        organization_id: str,
        project_id: str,
    ) -> int:
        removed = 0

        try:
            response = (
                self.client
                .table("field_visit_reports")
                .select("pdf_storage_path")
                .eq("organization_id", organization_id)
                .eq("project_id", project_id)
                .execute()
            )
        except APIError as error:
            if is_missing_table_error(error, "field_visit_reports"):
                return 0
            if is_missing_column_error(error, "pdf_storage_path"):
                return 0
            raise

        for row in response.data or []:
            storage_path = str(row.get("pdf_storage_path") or "").strip()
            if not storage_path:
                continue

            try:
                self.field_pdf_service.delete_pdf(storage_path)
                removed += 1
            except Exception as error:
                logger.warning(
                    "Failed deleting field report PDF file",
                    extra={
                        "organization_id": organization_id,
                        "project_id": project_id,
                        "storage_path": storage_path,
                        "error": str(error),
                    },
                )

        project_pdf_dir = (
            self.field_pdf_service.pdfs_root
            / organization_id
            / project_id
        )
        if project_pdf_dir.is_dir():
            shutil.rmtree(project_pdf_dir, ignore_errors=True)

        project_photo_dir = (
            self.field_photo_service.photos_root
            / organization_id
            / project_id
        )
        if project_photo_dir.is_dir():
            shutil.rmtree(project_photo_dir, ignore_errors=True)

        return removed

    def _purge_project_illustration_files(
        self,
        organization_id: str,
        project_id: str,
    ) -> int:
        removed = 0

        for extension in ("jpeg", "jpg", "png", "webp"):
            storage_path = self.illustration_service.build_storage_path(
                organization_id=organization_id,
                project_id=project_id,
                extension=extension,
            )
            removed += self._delete_file_at_path(
                self.illustration_service.resolve_absolute_path(
                    storage_path
                )
            )

        return removed

    def _delete_action_comments_for_project(
        self,
        project_id: str,
    ) -> int:
        try:
            actions_response = (
                self.client
                .table("operational_actions")
                .select("id")
                .eq("project_id", project_id)
                .execute()
            )
        except APIError as error:
            if is_missing_table_error(error, "operational_actions"):
                return 0
            if is_missing_column_error(error, "project_id"):
                return 0
            raise

        action_ids = [
            str(row.get("id"))
            for row in actions_response.data or []
            if row.get("id")
        ]

        if not action_ids:
            return 0

        deleted = 0
        for chunk in self._chunked(action_ids):
            try:
                response = (
                    self.client
                    .table("action_comments")
                    .delete()
                    .in_("action_id", chunk)
                    .execute()
                )
            except APIError as error:
                if is_missing_table_error(error, "action_comments"):
                    return deleted
                raise

            deleted += len(response.data or [])

        return deleted

    def _delete_rows_by_project_id(
        self,
        table_name: str,
        project_id: str,
    ) -> int:
        try:
            response = (
                self.client
                .table(table_name)
                .delete()
                .eq("project_id", project_id)
                .execute()
            )
        except APIError as error:
            if is_missing_table_error(error, table_name):
                return 0
            if is_missing_column_error(error, "project_id"):
                return 0
            raise

        return len(response.data or [])

    def _delete_rows_by_report_ids(
        self,
        table_name: str,
        report_ids: list[str],
    ) -> int:
        if not report_ids:
            return 0

        deleted = 0

        for chunk in self._chunked(report_ids):
            try:
                response = (
                    self.client
                    .table(table_name)
                    .delete()
                    .in_("report_id", chunk)
                    .execute()
                )
            except APIError as error:
                if is_missing_table_error(error, table_name):
                    return deleted
                if is_missing_column_error(error, "report_id"):
                    return deleted
                raise

            deleted += len(response.data or [])

        return deleted

    @staticmethod
    def _delete_file_at_path(path: Path) -> int:
        if path.is_file():
            path.unlink(missing_ok=True)
            return 1
        return 0

    @staticmethod
    def _chunked(values: list[str]) -> list[list[str]]:
        return [
            values[index : index + PROJECT_ID_CHUNK_SIZE]
            for index in range(0, len(values), PROJECT_ID_CHUNK_SIZE)
        ]
