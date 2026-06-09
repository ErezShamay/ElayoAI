from __future__ import annotations

import io
import json
import re
import zipfile
from datetime import UTC, datetime

from app.exceptions.exceptions import NotFoundError
from app.repositories.field_visit_report_repository import (
    FieldVisitReportRepository,
)
from app.repositories.organization_repository import (
    OrganizationRepository,
)
from app.repositories.project_repository import (
    ProjectRepository,
)
from app.services.field_visit_report_pdf_service import (
    FieldVisitReportPdfService,
)


class FieldVisitReportExportService:
    def __init__(
        self,
        *,
        report_repository: FieldVisitReportRepository | None = None,
        project_repository: ProjectRepository | None = None,
        organization_repository: OrganizationRepository | None = None,
        pdf_service: FieldVisitReportPdfService | None = None,
    ) -> None:
        self.report_repository = (
            report_repository or FieldVisitReportRepository()
        )
        self.project_repository = (
            project_repository or ProjectRepository()
        )
        self.organization_repository = (
            organization_repository or OrganizationRepository()
        )
        self.pdf_service = pdf_service or FieldVisitReportPdfService()

    def export_organization_pdfs_zip(
        self,
        organization_id: str,
    ) -> tuple[bytes, str]:
        organization = self.organization_repository.get_by_id(
            organization_id
        )
        if not organization:
            raise NotFoundError(
                message="Organization not found",
                resource_type="organization",
                resource_id=organization_id,
            )

        records = self.report_repository.list_archived_by_organization(
            organization_id=organization_id,
        )
        if not records:
            raise NotFoundError(
                message="לא נמצאו דוחות עם PDF עבור ארגון זה",
                resource_type="field_visit_report_export",
                resource_id=organization_id,
            )

        project_names = self._project_name_map(organization_id)
        organization_label = self._organization_label(organization)
        included: list[dict] = []
        skipped: list[dict] = []
        used_arcnames: set[str] = set()

        buffer = io.BytesIO()
        with zipfile.ZipFile(
            buffer,
            mode="w",
            compression=zipfile.ZIP_DEFLATED,
        ) as archive:
            for record in records:
                report_id = str(record.get("id") or "")
                project_id = str(record.get("project_id") or "")
                storage_path = str(
                    record.get("pdf_storage_path") or ""
                ).strip()
                if not storage_path:
                    skipped.append(
                        {
                            "report_id": report_id,
                            "reason": "missing_pdf_storage_path",
                        }
                    )
                    continue

                try:
                    content, _content_type = self.pdf_service.read_pdf(
                        storage_path
                    )
                except FileNotFoundError:
                    skipped.append(
                        {
                            "report_id": report_id,
                            "reason": "pdf_file_missing",
                            "pdf_storage_path": storage_path,
                        }
                    )
                    continue

                filename = self._report_filename(record)
                project_folder = self._sanitize_folder_name(
                    project_names.get(project_id)
                    or f"project_{project_id}"
                )
                arcname = self._unique_arcname(
                    f"{project_folder}/{filename}",
                    report_id=report_id,
                    used_arcnames=used_arcnames,
                )
                archive.writestr(arcname, content)
                used_arcnames.add(arcname)
                included.append(
                    {
                        "report_id": report_id,
                        "project_id": project_id,
                        "project_name": project_names.get(project_id),
                        "visit_date": record.get("visit_date"),
                        "visit_type": record.get("visit_type"),
                        "zip_path": arcname,
                        "pdf_filename": filename,
                    }
                )

            if not included:
                raise NotFoundError(
                    message="לא נמצאו קבצי PDF זמינים לייצוא",
                    resource_type="field_visit_report_export",
                    resource_id=organization_id,
                )

            manifest = {
                "organization_id": organization_id,
                "organization_name": organization_label,
                "exported_at": datetime.now(UTC).isoformat(),
                "total_included": len(included),
                "total_skipped": len(skipped),
                "files": included,
                "skipped": skipped,
            }
            archive.writestr(
                "manifest.json",
                json.dumps(manifest, ensure_ascii=False, indent=2),
            )

        download_name = (
            f"field-reports_{self._sanitize_folder_name(organization_label)}"
            f"_{datetime.now(UTC).strftime('%Y%m%d')}.zip"
        )
        return buffer.getvalue(), download_name

    def _project_name_map(self, organization_id: str) -> dict[str, str]:
        projects = self.project_repository.get_projects_by_organization(
            organization_id
        )
        return {
            str(project.get("id") or ""): str(
                project.get("project_name") or ""
            ).strip()
            for project in projects
            if project.get("id")
        }

    @staticmethod
    def _organization_label(organization: dict) -> str:
        return str(
            organization.get("organization_name")
            or organization.get("name")
            or organization.get("id")
            or "organization"
        ).strip()

    @staticmethod
    def _report_filename(record: dict) -> str:
        filename = str(record.get("pdf_filename") or "").strip()
        if filename:
            return FieldVisitReportPdfService.sanitize_filename(filename)

        visit_date = str(record.get("visit_date") or "")[:10]
        report_id = str(record.get("id") or "report")
        suffix = visit_date or report_id
        return FieldVisitReportPdfService.sanitize_filename(
            f"field-visit-{suffix}.pdf"
        )

    @staticmethod
    def _sanitize_folder_name(value: str) -> str:
        trimmed = (value or "folder").strip()
        safe = re.sub(r"[^\w.\-א-ת\s]", "_", trimmed)
        safe = re.sub(r"\s+", "_", safe).strip("._")
        return safe or "folder"

    @staticmethod
    def _unique_arcname(
        arcname: str,
        *,
        report_id: str,
        used_arcnames: set[str],
    ) -> str:
        if arcname not in used_arcnames:
            return arcname

        prefix = report_id or "report"
        if "/" in arcname:
            folder, filename = arcname.rsplit("/", 1)
            return f"{folder}/{prefix}_{filename}"

        return f"{prefix}_{arcname}"
