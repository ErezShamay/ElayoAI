from __future__ import annotations

from datetime import datetime
from typing import Literal

from app.schemas.project_apartment import (
    ResidentPortalGanttMilestone,
    ResidentPortalGanttRow,
    ResidentPortalProgressItem,
    ResidentPortalReportLine,
)

MilestoneKind = Literal["progress", "inspection", "completion"]

INSPECTIONS_TASK_KEY = "__inspections__"
INSPECTIONS_TASK_LABEL = "בדיקות מפקח בדירה"


def _parse_date(value: str | None) -> datetime | None:
    if not value or not str(value).strip():
        return None

    raw = str(value).strip()
    if raw.endswith("Z"):
        raw = f"{raw[:-1]}+00:00"

    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw[:10], fmt)
        except ValueError:
            continue

    return None


def _date_key(value: str | None) -> str | None:
    parsed = _parse_date(value)
    if parsed is None:
        return None
    return parsed.date().isoformat()


def _status_rank(status: str) -> int:
    normalized = status.strip().casefold()
    if normalized in {"בוצע", "סיום ביצוע", "done", "completed"}:
        return 3
    if normalized in {"בתהליך", "חלקית", "in progress", "partial"}:
        return 2
    if normalized in {"לא בוצע", "not done", "pending"}:
        return 1
    return 0


class _MutableGanttRow:
    def __init__(self, *, task_key: str, label: str) -> None:
        self.task_key = task_key
        self.label = label
        self.status = ""
        self.start_date: str | None = None
        self.end_date: str | None = None
        self.milestones: list[ResidentPortalGanttMilestone] = []

    def add_milestone(
        self,
        *,
        date: str | None,
        label: str,
        kind: MilestoneKind,
        status: str = "",
    ) -> None:
        if not date:
            return

        self.milestones.append(
            ResidentPortalGanttMilestone(
                date=date,
                label=label,
                kind=kind,
                status=status or None,
            )
        )

        if self.start_date is None or date < self.start_date:
            self.start_date = date
        if self.end_date is None or date > self.end_date:
            self.end_date = date

        if status and _status_rank(status) >= _status_rank(self.status):
            self.status = status

    def to_schema(self) -> ResidentPortalGanttRow:
        unique_milestones: list[ResidentPortalGanttMilestone] = []
        seen: set[tuple[str, str, str]] = set()
        for milestone in sorted(self.milestones, key=lambda item: item.date):
            key = (milestone.date, milestone.label, milestone.kind)
            if key in seen:
                continue
            seen.add(key)
            unique_milestones.append(milestone)

        return ResidentPortalGanttRow(
            task_key=self.task_key,
            label=self.label,
            status=self.status,
            start_date=self.start_date,
            end_date=self.end_date,
            milestones=unique_milestones,
        )


def build_gantt_rows(
    *,
    progress_timeline: list[ResidentPortalProgressItem],
    report_lines: list[ResidentPortalReportLine],
) -> list[ResidentPortalGanttRow]:
    rows: dict[str, _MutableGanttRow] = {}

    for item in progress_timeline:
        label = item.description.strip()
        if not label:
            continue

        task_key = label.casefold()
        row = rows.get(task_key)
        if row is None:
            row = _MutableGanttRow(task_key=task_key, label=label)
            rows[task_key] = row

        event_date = (
            _date_key(item.completion_date)
            or _date_key(item.visit_date)
        )
        kind: MilestoneKind = (
            "completion"
            if item.status.strip() in {"בוצע", "סיום ביצוע"}
            else "progress"
        )
        row.add_milestone(
            date=event_date,
            label=item.report_title or label,
            kind=kind,
            status=item.status,
        )

    inspection_row = _MutableGanttRow(
        task_key=INSPECTIONS_TASK_KEY,
        label=INSPECTIONS_TASK_LABEL,
    )

    for line in report_lines:
        event_date = _date_key(line.visit_date)
        inspection_row.add_milestone(
            date=event_date,
            label=line.description or line.report_title or "בדיקה",
            kind="inspection",
            status=line.status or "",
        )

    if inspection_row.milestones:
        rows[INSPECTIONS_TASK_KEY] = inspection_row

    ordered = sorted(
        rows.values(),
        key=lambda row: row.start_date or "9999-12-31",
    )
    return [row.to_schema() for row in ordered]
