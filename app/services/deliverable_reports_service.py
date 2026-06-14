from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from app.exceptions.exceptions import ForbiddenError, ValidationError
from app.repositories.field_visit_report_repository import (
    FieldVisitReportRepository,
)
from app.repositories.profile_repository import ProfileRepository
from app.repositories.project_repository import ProjectRepository
from app.repositories.weekly_report_repository import WeeklyReportRepository
from app.services.supervisor_project_scope import (
    filter_supervised_projects,
    resolve_supervisor_email,
)
from app.schemas.deliverable_reports import (
    DeliverableReportItem,
    DeliverableReportTypeSummary,
    DeliverableReportsDashboardResponse,
    WeeklyComplianceCell,
    WeeklyComplianceSummary,
    WeeklyComplianceWeek,
)
from app.schemas.qc_permissions import has_qc_permission
from app.services.deliverable_report_classification import (
    DELIVERABLE_REPORT_TYPE_LABELS_HE,
    DeliverableReportType,
    classify_deliverable_report,
    deliverable_report_type_label_he,
)

HEBREW_MONTH_LABELS: dict[int, str] = {
    1: "ינואר",
    2: "פברואר",
    3: "מרץ",
    4: "אפריל",
    5: "מאי",
    6: "יוני",
    7: "יולי",
    8: "אוגוסט",
    9: "ספטמבר",
    10: "אוקטובר",
    11: "נובמבר",
    12: "דצמבר",
}

ACTIVE_PROJECT_STATUSES = frozenset({"ACTIVE", "active"})


def _parse_date(value: str | date | None) -> date | None:
    if value is None:
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _iso_week_bounds(iso_year: int, iso_week: int) -> tuple[date, date]:
    week_start = date.fromisocalendar(iso_year, iso_week, 1)
    week_end = date.fromisocalendar(iso_year, iso_week, 7)
    return week_start, week_end


def _format_week_label_he(iso_year: int, iso_week: int) -> str:
    week_start, week_end = _iso_week_bounds(iso_year, iso_week)
    if week_start.month == week_end.month:
        month_label = HEBREW_MONTH_LABELS.get(week_start.month, str(week_start.month))
        return (
            f"שבוע {iso_week}/{iso_year} "
            f"({week_start.day}-{week_end.day} {month_label})"
        )

    start_month = HEBREW_MONTH_LABELS.get(week_start.month, str(week_start.month))
    end_month = HEBREW_MONTH_LABELS.get(week_end.month, str(week_end.month))
    return (
        f"שבוע {iso_week}/{iso_year} "
        f"({week_start.day} {start_month} - {week_end.day} {end_month})"
    )


def _iter_iso_weeks(period_start: date, period_end: date) -> list[tuple[int, int]]:
    weeks: list[tuple[int, int]] = []
    seen: set[tuple[int, int]] = set()
    cursor = period_start

    while cursor <= period_end:
        iso = cursor.isocalendar()
        key = (iso.year, iso.week)
        if key not in seen:
            seen.add(key)
            weeks.append(key)
        cursor += timedelta(days=1)

    return weeks


def _report_sent_date(
    *,
    locked_at: str | None,
    closed_at: str | None = None,
    visit_date: str | None,
    reported_at: str | None,
    created_at: str | None,
) -> date | None:
    for candidate in (locked_at, closed_at, reported_at, visit_date, created_at):
        parsed = _parse_date(candidate)
        if parsed is not None:
            return parsed
    return None


def _in_period(value: date | None, period_start: date, period_end: date) -> bool:
    if value is None:
        return False
    return period_start <= value <= period_end


class DeliverableReportsService:
    def __init__(
        self,
        project_repository: ProjectRepository | None = None,
        field_visit_report_repository: FieldVisitReportRepository | None = None,
        weekly_report_repository: WeeklyReportRepository | None = None,
        profile_repository: ProfileRepository | None = None,
    ) -> None:
        self.project_repository = project_repository or ProjectRepository()
        self.field_visit_report_repository = (
            field_visit_report_repository or FieldVisitReportRepository()
        )
        self.weekly_report_repository = (
            weekly_report_repository or WeeklyReportRepository()
        )
        self.profile_repository = profile_repository or ProfileRepository()

    def get_dashboard(
        self,
        *,
        organization_id: str,
        actor_role: str | None,
        period_start: date,
        period_end: date,
        project_id: str | None = None,
        actor_user_id: str | None = None,
    ) -> DeliverableReportsDashboardResponse:
        self._require_portfolio_read_permission(actor_role)

        if period_end < period_start:
            raise ValidationError(
                message="תאריך הסיום חייב להיות אחרי תאריך ההתחלה",
            )

        max_days = 366
        if (period_end - period_start).days > max_days:
            raise ValidationError(
                message=f"טווח התאריכים לא יכול לעבור {max_days} ימים",
            )

        projects = self.project_repository.get_projects_by_organization(
            organization_id
        )
        projects = filter_supervised_projects(
            projects,
            role=actor_role,
            supervisor_email=self._resolve_supervisor_email(actor_user_id),
        )
        if project_id:
            projects = [
                project
                for project in projects
                if str(project.get("id") or "") == project_id
            ]

        project_names = {
            str(project["id"]): project.get("project_name")
            for project in projects
        }
        active_projects = [
            project
            for project in projects
            if str(project.get("status") or "ACTIVE") in ACTIVE_PROJECT_STATUSES
        ]

        deliverables = self._collect_deliverables(
            organization_id=organization_id,
            project_ids=list(project_names.keys()),
            project_names=project_names,
            period_start=period_start,
            period_end=period_end,
        )

        weeks = self._build_weeks(period_start, period_end)
        compliance_matrix, missing_cells = self._build_weekly_compliance(
            active_projects=active_projects,
            deliverables=deliverables,
            weeks=weeks,
        )
        weekly_compliance = self._summarize_weekly_compliance(compliance_matrix)

        by_type = self._summarize_by_type(deliverables)

        return DeliverableReportsDashboardResponse(
            organization_id=organization_id,
            period_start=period_start,
            period_end=period_end,
            active_project_count=len(active_projects),
            total_deliverables=len(deliverables),
            by_type=by_type,
            reports=sorted(
                deliverables,
                key=lambda item: (item.sent_date, item.project_name or ""),
                reverse=True,
            ),
            weekly_compliance=weekly_compliance,
            weeks=weeks,
            compliance_matrix=compliance_matrix,
            missing_weekly_reports=missing_cells,
        )

    def _collect_deliverables(
        self,
        *,
        organization_id: str,
        project_ids: list[str],
        project_names: dict[str, str | None],
        period_start: date,
        period_end: date,
    ) -> list[DeliverableReportItem]:
        items: list[DeliverableReportItem] = []

        if self.field_visit_report_repository.is_storage_available():
            archived_reports = (
                self.field_visit_report_repository.list_pdf_deliverables_by_organization(
                    organization_id=organization_id,
                )
            )
            for record in archived_reports:
                project_id = str(record.get("project_id") or "")
                if project_id not in project_ids:
                    continue

                sent_date = _report_sent_date(
                    locked_at=record.get("locked_at"),
                    closed_at=record.get("closed_at"),
                    visit_date=record.get("visit_date"),
                    reported_at=None,
                    created_at=record.get("created_at"),
                )
                if not _in_period(sent_date, period_start, period_end):
                    continue

                visit_type = str(record.get("visit_type") or "")
                title = (
                    str(record.get("pdf_filename") or "").strip()
                    or f"דוח ביקור {visit_type}"
                )
                report_type = classify_deliverable_report(
                    title=title,
                    filename=record.get("pdf_filename"),
                    visit_type_label=visit_type,
                    default_weekly=True,
                )
                items.append(
                    DeliverableReportItem(
                        id=str(record.get("id") or ""),
                        project_id=project_id,
                        project_name=project_names.get(project_id),
                        report_type=report_type,
                        report_type_label_he=deliverable_report_type_label_he(
                            report_type
                        ),
                        title=title,
                        sent_date=sent_date or period_start,
                        origin="field_visit",
                        visit_type=visit_type or None,
                    )
                )

        legacy_reports = self.weekly_report_repository.list_by_project_ids(
            project_ids
        )
        for record in legacy_reports:
            project_id = str(record.get("project_id") or "")
            sent_date = _report_sent_date(
                locked_at=None,
                visit_date=None,
                reported_at=record.get("reported_at"),
                created_at=record.get("created_at"),
            )
            if not _in_period(sent_date, period_start, period_end):
                continue

            title = str(record.get("email_subject") or "דוח שבועי").strip()
            report_type = classify_deliverable_report(
                title=title,
                default_weekly=True,
            )
            items.append(
                DeliverableReportItem(
                    id=str(record.get("id") or ""),
                    project_id=project_id,
                    project_name=project_names.get(project_id),
                    report_type=report_type,
                    report_type_label_he=deliverable_report_type_label_he(
                        report_type
                    ),
                    title=title,
                    sent_date=sent_date or period_start,
                    origin="legacy_upload",
                    visit_type=None,
                )
            )

        return items

    def _build_weeks(
        self,
        period_start: date,
        period_end: date,
    ) -> list[WeeklyComplianceWeek]:
        weeks: list[WeeklyComplianceWeek] = []
        for iso_year, iso_week in _iter_iso_weeks(period_start, period_end):
            week_start, week_end = _iso_week_bounds(iso_year, iso_week)
            weeks.append(
                WeeklyComplianceWeek(
                    iso_year=iso_year,
                    iso_week=iso_week,
                    week_label_he=_format_week_label_he(iso_year, iso_week),
                    week_start=week_start,
                    week_end=week_end,
                )
            )
        return weeks

    def _build_weekly_compliance(
        self,
        *,
        active_projects: list[dict],
        deliverables: list[DeliverableReportItem],
        weeks: list[WeeklyComplianceWeek],
    ) -> tuple[list[WeeklyComplianceCell], list[WeeklyComplianceCell]]:
        weekly_counts: dict[tuple[str, int, int], int] = defaultdict(int)

        for item in deliverables:
            if item.report_type != "weekly":
                continue
            iso = item.sent_date.isocalendar()
            weekly_counts[(item.project_id, iso.year, iso.week)] += 1

        matrix: list[WeeklyComplianceCell] = []
        missing: list[WeeklyComplianceCell] = []

        for project in active_projects:
            project_id = str(project.get("id") or "")
            project_name = project.get("project_name")
            for week in weeks:
                count = weekly_counts.get(
                    (project_id, week.iso_year, week.iso_week),
                    0,
                )
                cell = WeeklyComplianceCell(
                    project_id=project_id,
                    project_name=project_name,
                    iso_year=week.iso_year,
                    iso_week=week.iso_week,
                    submitted=count > 0,
                    report_count=count,
                )
                matrix.append(cell)
                if not cell.submitted:
                    missing.append(cell)

        return matrix, missing

    def _summarize_weekly_compliance(
        self,
        matrix: list[WeeklyComplianceCell],
    ) -> WeeklyComplianceSummary:
        total_expected = len(matrix)
        total_submitted = sum(1 for cell in matrix if cell.submitted)
        total_missing = total_expected - total_submitted
        compliance_rate = (
            round(total_submitted / total_expected, 4)
            if total_expected
            else 1.0
        )
        return WeeklyComplianceSummary(
            total_expected=total_expected,
            total_submitted=total_submitted,
            total_missing=total_missing,
            compliance_rate=compliance_rate,
        )

    def _summarize_by_type(
        self,
        deliverables: list[DeliverableReportItem],
    ) -> list[DeliverableReportTypeSummary]:
        counts: dict[DeliverableReportType, int] = defaultdict(int)
        for item in deliverables:
            counts[item.report_type] += 1

        ordered_types: tuple[DeliverableReportType, ...] = (
            "weekly",
            "handover_protocol",
            "annual_bedek",
            "home_bedek",
        )
        return [
            DeliverableReportTypeSummary(
                report_type=report_type,
                label_he=DELIVERABLE_REPORT_TYPE_LABELS_HE[report_type],
                count=counts.get(report_type, 0),
            )
            for report_type in ordered_types
        ]

    def _resolve_supervisor_email(
        self,
        actor_user_id: str | None,
    ) -> str | None:
        if not actor_user_id:
            return None
        return resolve_supervisor_email(
            self.profile_repository,
            actor_user_id,
        )

    def _require_portfolio_read_permission(
        self,
        actor_role: str | None,
    ) -> None:
        if not has_qc_permission(actor_role, "quality_portfolio:read"):
            raise ForbiddenError(
                "Missing quality_portfolio:read permission"
            )
