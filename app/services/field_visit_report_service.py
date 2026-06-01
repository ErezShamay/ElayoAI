from __future__ import annotations

from app.config.field_report_visit_types import (
    allowed_top_families,
    is_valid_visit_type,
    list_visit_types,
)
from app.exceptions.exceptions import (
    ConflictError,
    NotFoundError,
    ValidationError,
)
from app.repositories.field_visit_report_line_repository import (
    FieldVisitReportLineRepository,
)
from app.repositories.field_visit_report_repository import (
    FieldVisitReportRepository,
)
from app.repositories.project_repository import (
    ProjectRepository,
)
from app.services.field_report_catalog_service import (
    FieldReportCatalogService,
)
from app.services.field_report_organization_profile_service import (
    FieldReportOrganizationProfileService,
)

VISIT_STATUS_LABELS_HE: dict[str, str] = {
    "IN_PROGRESS": "בעבודה",
    "CLOSED": "סגור",
    "PENDING_UPLOAD": "ממתין לשליחה",
    "LOCKED": "נעול",
}

EDITABLE_STATUSES = frozenset({"IN_PROGRESS"})
OFFLINE_MAX_DAYS = 7


class FieldVisitReportService:
    def __init__(
        self,
        report_repository:
            FieldVisitReportRepository | None = None,
        line_repository:
            FieldVisitReportLineRepository | None = None,
        project_repository:
            ProjectRepository | None = None,
        organization_profile_service:
            FieldReportOrganizationProfileService | None = None,
        catalog_service:
            FieldReportCatalogService | None = None,
    ) -> None:
        self.report_repository = (
            report_repository or FieldVisitReportRepository()
        )
        self.line_repository = (
            line_repository or FieldVisitReportLineRepository()
        )
        self.project_repository = (
            project_repository or ProjectRepository()
        )
        self.organization_profile_service = (
            organization_profile_service
            or FieldReportOrganizationProfileService()
        )
        self.catalog_service = (
            catalog_service or FieldReportCatalogService()
        )

    def is_storage_available(self) -> bool:
        return self.report_repository.is_storage_available()

    def are_lines_available(self) -> bool:
        return self.line_repository.is_storage_available()

    def get_visit_types(self) -> dict:
        catalog = self.catalog_service.get_catalog_summary()
        return {
            "visit_types": list_visit_types(),
            "storage_available": self.is_storage_available(),
            "lines_storage_available": self.are_lines_available(),
            "catalog_version": catalog.get("catalog_version"),
            "catalog_issue_count": catalog.get("issue_count"),
            "catalog_errors": catalog.get("errors"),
        }

    def get_catalog(
        self,
        *,
        visit_type: str | None = None,
    ) -> dict:
        if visit_type:
            if not is_valid_visit_type(visit_type):
                raise ValidationError(
                    message="סוג ביקור לא תקין",
                    details={"visit_type": visit_type},
                )
            return self.catalog_service.get_catalog_for_visit_type(
                visit_type
            )
        return self.catalog_service.get_full_catalog()

    def build_offline_prep_bundle(
        self,
        organization_id: str,
    ) -> dict:
        if not self.is_storage_available():
            raise ValidationError(
                message=(
                    "טבלת דוחות ביקור אינה מוגדרת במסד הנתונים. "
                    "יש להריץ את המיגרציה "
                    "db/migrations/2026060102_field_visit_reports.sql"
                ),
            )

        projects = self.project_repository.get_projects_by_organization(
            organization_id
        )
        organization_profile = (
            self.organization_profile_service.get_profile(
                organization_id,
                require_module=False,
            )
        )
        catalog = self.catalog_service.get_full_catalog()

        return {
            "organization_id": organization_id,
            "offline_max_days": OFFLINE_MAX_DAYS,
            "catalog_version": catalog.get("catalog_version"),
            "catalog": catalog,
            "visit_types": list_visit_types(),
            "organization_profile": organization_profile,
            "projects": [
                {
                    "id": str(project["id"]),
                    "project_name": project.get("project_name"),
                    "city": project.get("city"),
                    "developer_name": project.get("developer_name"),
                    "contractor_name": project.get("contractor_name"),
                    "lawyer_name": project.get("lawyer_name"),
                    "project_type": project.get("project_type"),
                }
                for project in projects
            ],
            "reports": self.list_reports(organization_id)["reports"],
            "lines_storage_available": self.are_lines_available(),
        }

    def list_reports(
        self,
        organization_id: str,
        *,
        status: str | None = None,
        project_names: dict[str, str] | None = None,
    ) -> dict:
        if not self.is_storage_available():
            raise ValidationError(
                message=(
                    "טבלת דוחות ביקור אינה מוגדרת במסד הנתונים. "
                    "יש להריץ את המיגרציה "
                    "db/migrations/2026060102_field_visit_reports.sql"
                ),
            )

        records = self.report_repository.list_by_organization(
            organization_id,
            status=status,
        )

        return {
            "reports": [
                self._serialize_report(
                    record,
                    project_name=(
                        (project_names or {}).get(
                            str(record["project_id"])
                        )
                    ),
                    include_lines=False,
                )
                for record in records
            ],
            "total": len(records),
        }

    def get_report(
        self,
        *,
        organization_id: str,
        report_id: str,
        project_name: str | None = None,
        include_lines: bool = True,
    ) -> dict:
        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )

        if project_name is None:
            project = self.project_repository.get_project_by_id(
                str(record["project_id"])
            )
            if project:
                project_name = project.get("project_name")

        return self._serialize_report(
            record,
            project_name=project_name,
            include_lines=include_lines,
        )

    def create_report(
        self,
        *,
        organization_id: str,
        actor_profile_id: str,
        project_id: str,
        visit_type: str,
        visit_date: str,
        header_fields: dict | None = None,
        catalog_version: str | None = None,
        snapshot_organization_profile: bool = True,
    ) -> dict:
        if not self.is_storage_available():
            raise ValidationError(
                message=(
                    "טבלת דוחות ביקור אינה מוגדרת במסד הנתונים. "
                    "יש להריץ את המיגרציה "
                    "db/migrations/2026060102_field_visit_reports.sql"
                ),
            )

        if not is_valid_visit_type(visit_type):
            raise ValidationError(
                message="סוג ביקור לא תקין",
                details={"visit_type": visit_type},
            )

        project = self.project_repository.get_project_by_id(
            project_id
        )

        if not project:
            raise NotFoundError(
                message="Project not found",
                resource_type="project",
                resource_id=project_id,
            )

        if str(project.get("organization_id")) != organization_id:
            raise NotFoundError(
                message="Project not found",
                resource_type="project",
                resource_id=project_id,
            )

        existing = self.report_repository.get_open_for_project(
            organization_id=organization_id,
            project_id=project_id,
        )

        if existing:
            raise ConflictError(
                message=(
                    "כבר קיים דוח בעבודה לפרויקט זה. "
                    "יש להמשיך את הדוח הקיים או לסגור אותו."
                ),
                details={
                    "existing_report_id": str(existing["id"]),
                    "project_id": project_id,
                },
            )

        profile_snapshot = None

        if snapshot_organization_profile:
            profile_snapshot = (
                self.organization_profile_service.get_profile(
                    organization_id,
                    require_module=False,
                )
            )

        merged_header_fields = _merge_header_fields(
            project,
            header_fields,
        )
        resolved_catalog_version = (
            catalog_version
            or self.catalog_service.get_catalog_summary().get(
                "catalog_version"
            )
        )

        record = self.report_repository.create(
            organization_id=organization_id,
            project_id=project_id,
            created_by_profile_id=actor_profile_id,
            visit_type=visit_type,
            visit_date=visit_date,
            header_fields=merged_header_fields,
            catalog_version=resolved_catalog_version,
            organization_profile_snapshot=profile_snapshot,
        )

        return self._serialize_report(
            record,
            project_name=project.get("project_name"),
        )

    def update_report(
        self,
        *,
        organization_id: str,
        report_id: str,
        visit_date: str | None = None,
        header_fields: dict | None = None,
        catalog_version: str | None = None,
    ) -> dict:
        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        self._ensure_editable(record)

        payload: dict = {}

        if visit_date is not None:
            payload["visit_date"] = visit_date

        if header_fields is not None:
            payload["header_fields"] = {
                **(record.get("header_fields") or {}),
                **header_fields,
            }

        if catalog_version is not None:
            payload["catalog_version"] = catalog_version

        if not payload:
            return self.get_report(
                organization_id=organization_id,
                report_id=report_id,
            )

        updated = self.report_repository.update(report_id, payload)
        if not updated:
            raise NotFoundError(
                message="Field visit report not found",
                resource_type="field_visit_report",
                resource_id=report_id,
            )

        return self.get_report(
            organization_id=organization_id,
            report_id=report_id,
        )

    def list_lines(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> dict:
        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        lines = self._load_lines(str(record["id"]))
        return {
            "lines": lines,
            "total": len(lines),
        }

    def create_line(
        self,
        *,
        organization_id: str,
        report_id: str,
        payload: dict,
    ) -> dict:
        if not self.are_lines_available():
            raise ValidationError(
                message=(
                    "טבלת שורות דוח אינה מוגדרת במסד הנתונים. "
                    "יש להריץ את המיגרציה "
                    "db/migrations/2026060103_field_visit_report_lines.sql"
                ),
            )

        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        self._ensure_editable(record)

        line_payload = self._build_line_payload(
            record=record,
            incoming=payload,
            for_create=True,
        )

        created = self.line_repository.create(line_payload)
        return self._serialize_line(created)

    def update_line(
        self,
        *,
        organization_id: str,
        report_id: str,
        line_id: str,
        payload: dict,
    ) -> dict:
        if not self.are_lines_available():
            raise ValidationError(
                message=(
                    "טבלת שורות דוח אינה מוגדרת במסד הנתונים. "
                    "יש להריץ את המיגרציה "
                    "db/migrations/2026060103_field_visit_report_lines.sql"
                ),
            )

        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        self._ensure_editable(record)

        existing = self.line_repository.get_by_id(line_id)
        if (
            not existing
            or str(existing.get("report_id")) != report_id
            or str(existing.get("organization_id")) != organization_id
        ):
            raise NotFoundError(
                message="Field visit report line not found",
                resource_type="field_visit_report_line",
                resource_id=line_id,
            )

        update_payload = self._build_line_update_payload(
            record=record,
            existing=existing,
            incoming=payload,
        )

        if not update_payload:
            return self._serialize_line(existing)

        updated = self.line_repository.update(line_id, update_payload)
        if not updated:
            raise NotFoundError(
                message="Field visit report line not found",
                resource_type="field_visit_report_line",
                resource_id=line_id,
            )

        return self._serialize_line(updated)

    def delete_line(
        self,
        *,
        organization_id: str,
        report_id: str,
        line_id: str,
    ) -> dict:
        if not self.are_lines_available():
            raise ValidationError(
                message=(
                    "טבלת שורות דוח אינה מוגדרת במסד הנתונים. "
                    "יש להריץ את המיגרציה "
                    "db/migrations/2026060103_field_visit_report_lines.sql"
                ),
            )

        record = self._get_org_report(
            organization_id=organization_id,
            report_id=report_id,
        )
        self._ensure_editable(record)

        existing = self.line_repository.get_by_id(line_id)
        if (
            not existing
            or str(existing.get("report_id")) != report_id
            or str(existing.get("organization_id")) != organization_id
        ):
            raise NotFoundError(
                message="Field visit report line not found",
                resource_type="field_visit_report_line",
                resource_id=line_id,
            )

        self.line_repository.delete(line_id)
        return {"deleted": True, "id": line_id}

    def _build_line_payload(
        self,
        *,
        record: dict,
        incoming: dict,
        for_create: bool,
    ) -> dict:
        visit_type = str(record.get("visit_type") or "")
        report_id = str(record["id"])
        organization_id = str(record["organization_id"])

        normalized = dict(incoming)
        issue_id = normalized.get("issue_id")
        if issue_id:
            issue_id = str(issue_id).strip().upper()
            normalized["issue_id"] = issue_id
            catalog_issue = self.catalog_service.find_issue(issue_id)
            if not catalog_issue:
                raise ValidationError(
                    message="ממצא לא נמצא בקטלוג",
                    details={"issue_id": issue_id},
                )
            allowed = set(allowed_top_families(visit_type))
            if catalog_issue["top_family"] not in allowed:
                raise ValidationError(
                    message=(
                        "ממצא זה אינו זמין לסוג הביקור שנבחר"
                    ),
                    details={
                        "issue_id": issue_id,
                        "visit_type": visit_type,
                    },
                )
            normalized = _apply_catalog_issue_defaults(
                normalized,
                catalog_issue,
                catalog_version=record.get("catalog_version"),
            )
        else:
            normalized["issue_id"] = None
            normalized["standard_ref"] = None
            normalized["top_family"] = None
            normalized["category_id"] = None
            normalized["category_name_he"] = None

        sort_order = normalized.pop("sort_order", None)
        if sort_order is None and for_create:
            sort_order = self.line_repository.next_sort_order(
                report_id
            )

        return {
            "report_id": report_id,
            "organization_id": organization_id,
            "sort_order": sort_order or 0,
            "location": normalized.get("location"),
            "trade": normalized.get("trade"),
            "status": normalized.get("status"),
            "description": normalized.get("description"),
            "notes": normalized.get("notes"),
            "severity": normalized.get("severity"),
            "standard_ref": normalized.get("standard_ref"),
            "engineering_impact": normalized.get(
                "engineering_impact"
            ),
            "issue_id": normalized.get("issue_id"),
            "catalog_version": normalized.get("catalog_version"),
            "top_family": normalized.get("top_family"),
            "category_id": normalized.get("category_id"),
            "category_name_he": normalized.get("category_name_he"),
        }

    def _build_line_update_payload(
        self,
        *,
        record: dict,
        existing: dict,
        incoming: dict,
    ) -> dict:
        if "issue_id" in incoming and incoming["issue_id"] is None:
            merged = {
                **existing,
                **incoming,
                "issue_id": None,
                "standard_ref": None,
                "top_family": None,
                "category_id": None,
                "category_name_he": None,
            }
            return {
                key: merged.get(key)
                for key in (
                    "location",
                    "trade",
                    "status",
                    "description",
                    "notes",
                    "severity",
                    "standard_ref",
                    "engineering_impact",
                    "issue_id",
                    "catalog_version",
                    "top_family",
                    "category_id",
                    "category_name_he",
                    "sort_order",
                )
                if key in incoming
            }

        if incoming.get("issue_id"):
            return self._build_line_payload(
                record=record,
                incoming={
                    **existing,
                    **incoming,
                },
                for_create=False,
            )

        update_payload = {}
        for key in (
            "location",
            "trade",
            "status",
            "description",
            "notes",
            "severity",
            "engineering_impact",
            "sort_order",
        ):
            if key in incoming:
                update_payload[key] = incoming[key]

        if existing.get("issue_id"):
            if "standard_ref" in incoming:
                raise ValidationError(
                    message=(
                        "לא ניתן לערוך תקן כשהשורה מקושרת לממצא במפרט"
                    ),
                )

        return update_payload

    def _load_lines(self, report_id: str) -> list[dict]:
        if not self.are_lines_available():
            return []

        return [
            self._serialize_line(line)
            for line in self.line_repository.list_by_report(
                report_id
            )
        ]

    def _get_org_report(
        self,
        *,
        organization_id: str,
        report_id: str,
    ) -> dict:
        record = self.report_repository.get_by_id(report_id)

        if not record or str(record.get("organization_id")) != organization_id:
            raise NotFoundError(
                message="Field visit report not found",
                resource_type="field_visit_report",
                resource_id=report_id,
            )

        return record

    @staticmethod
    def _ensure_editable(record: dict) -> None:
        status = str(record.get("status") or "")
        if status not in EDITABLE_STATUSES:
            raise ConflictError(
                message="הדוח אינו במצב עריכה",
                details={"status": status},
            )

    def _serialize_report(
        self,
        record: dict,
        *,
        project_name: str | None = None,
        include_lines: bool = True,
    ) -> dict:
        status = str(record.get("status") or "IN_PROGRESS")
        visit_type = str(record.get("visit_type") or "")
        report_id = str(record["id"])
        lines = (
            self._load_lines(report_id) if include_lines else []
        )

        return {
            "id": report_id,
            "organization_id": str(record["organization_id"]),
            "project_id": str(record["project_id"]),
            "project_name": project_name,
            "created_by_profile_id": str(
                record["created_by_profile_id"]
            ),
            "visit_type": visit_type,
            "visit_type_label_he": _visit_type_label(visit_type),
            "status": status,
            "status_label_he": VISIT_STATUS_LABELS_HE.get(
                status,
                status,
            ),
            "visit_date": record.get("visit_date"),
            "header_fields": record.get("header_fields") or {},
            "catalog_version": record.get("catalog_version"),
            "closed_at": record.get("closed_at"),
            "locked_at": record.get("locked_at"),
            "created_at": record.get("created_at"),
            "updated_at": record.get("updated_at"),
            "lines": lines,
            "line_count": len(lines),
            "is_editable": status in EDITABLE_STATUSES,
        }

    @staticmethod
    def _serialize_line(record: dict) -> dict:
        issue_id = record.get("issue_id")
        return {
            "id": str(record["id"]),
            "report_id": str(record["report_id"]),
            "sort_order": int(record.get("sort_order") or 0),
            "location": record.get("location"),
            "trade": record.get("trade"),
            "status": record.get("status"),
            "description": record.get("description"),
            "notes": record.get("notes"),
            "severity": record.get("severity"),
            "standard_ref": record.get("standard_ref"),
            "engineering_impact": record.get("engineering_impact"),
            "issue_id": issue_id,
            "catalog_version": record.get("catalog_version"),
            "top_family": record.get("top_family"),
            "category_id": record.get("category_id"),
            "category_name_he": record.get("category_name_he"),
            "photo_storage_path": record.get("photo_storage_path"),
            "has_catalog_issue": bool(issue_id),
            "created_at": record.get("created_at"),
            "updated_at": record.get("updated_at"),
        }


def _merge_header_fields(
    project: dict,
    header_fields: dict | None,
) -> dict:
    defaults = {
        "developer_name": project.get("developer_name"),
        "contractor_name": project.get("contractor_name"),
        "lawyer_name": project.get("lawyer_name"),
        "site_address": project.get("city"),
        "project_updates": [],
    }
    merged = {**defaults, **(header_fields or {})}
    return merged


def _apply_catalog_issue_defaults(
    payload: dict,
    catalog_issue: dict,
    *,
    catalog_version: str | None,
) -> dict:
    standard_ref = (
        catalog_issue.get("standard_ref")
        or catalog_issue.get("category_standard_id")
    )
    return {
        **payload,
        "trade": payload.get("trade") or catalog_issue.get(
            "issue_name_he"
        ),
        "description": payload.get("description")
        or catalog_issue.get("description"),
        "notes": payload.get("notes")
        or catalog_issue.get("rectification_action"),
        "severity": payload.get("severity")
        or catalog_issue.get("severity"),
        "standard_ref": standard_ref,
        "engineering_impact": payload.get("engineering_impact")
        or catalog_issue.get("engineering_impact"),
        "top_family": catalog_issue.get("top_family"),
        "category_id": catalog_issue.get("category_id"),
        "category_name_he": catalog_issue.get("category_name_he"),
        "catalog_version": payload.get("catalog_version")
        or catalog_version,
        "location": payload.get("location")
        or catalog_issue.get("target_elements"),
    }


def _visit_type_label(visit_type: str) -> str:
    from app.config.field_report_visit_types import (
        VISIT_TYPE_CONFIG,
    )

    config = VISIT_TYPE_CONFIG.get(visit_type)
    if not config:
        return visit_type
    return str(config["label_he"])
