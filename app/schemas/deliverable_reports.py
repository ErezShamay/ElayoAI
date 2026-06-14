from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

DeliverableReportType = Literal[
    "weekly",
    "handover_protocol",
    "annual_bedek",
    "home_bedek",
]

DeliverableReportOrigin = Literal["field_visit", "legacy_upload"]


class DeliverableReportItem(BaseModel):
    id: str
    project_id: str
    project_name: str | None = None
    report_type: DeliverableReportType
    report_type_label_he: str
    title: str
    sent_date: date
    origin: DeliverableReportOrigin
    visit_type: str | None = None


class DeliverableReportTypeSummary(BaseModel):
    report_type: DeliverableReportType
    label_he: str
    count: int


class WeeklyComplianceWeek(BaseModel):
    iso_year: int
    iso_week: int
    week_label_he: str
    week_start: date
    week_end: date


class WeeklyComplianceCell(BaseModel):
    project_id: str
    project_name: str | None = None
    iso_year: int
    iso_week: int
    submitted: bool
    report_count: int = 0


class WeeklyComplianceSummary(BaseModel):
    total_expected: int
    total_submitted: int
    total_missing: int
    compliance_rate: float = Field(
        description="Share of project-weeks with at least one weekly report",
    )


class DeliverableReportsDashboardResponse(BaseModel):
    organization_id: str
    period_start: date
    period_end: date
    active_project_count: int
    total_deliverables: int
    by_type: list[DeliverableReportTypeSummary]
    reports: list[DeliverableReportItem]
    weekly_compliance: WeeklyComplianceSummary
    weeks: list[WeeklyComplianceWeek]
    compliance_matrix: list[WeeklyComplianceCell]
    missing_weekly_reports: list[WeeklyComplianceCell]
