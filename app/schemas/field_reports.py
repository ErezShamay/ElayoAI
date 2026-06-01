from datetime import date, datetime

from pydantic import BaseModel, Field


class FieldReportModuleStatus(BaseModel):
    organization_id: str
    is_enabled: bool
    enabled_at: datetime | None = None
    disabled_at: datetime | None = None
    enabled_by_profile_id: str | None = None
    storage_available: bool = True


class FieldReportModuleToggleRequest(BaseModel):
    is_enabled: bool


class FieldReportOrganizationProfile(BaseModel):
    organization_id: str
    organization_name: str
    contact_email: str | None = None
    report_phone: str | None = None
    report_address_line: str | None = None
    report_city: str | None = None
    report_tagline: str | None = None
    logo_storage_path: str | None = None
    logo_url: str | None = None


class FieldVisitReportCreateRequest(BaseModel):
    project_id: str
    visit_type: str = Field(
        description="STRUCTURE_SITE or FINISHING_APARTMENTS"
    )
    visit_date: date
    header_fields: dict = Field(default_factory=dict)
    catalog_version: str | None = None


class FieldVisitReportUpdateRequest(BaseModel):
    visit_date: date | None = None
    header_fields: dict | None = None
    catalog_version: str | None = None


class FieldVisitReportLineCreateRequest(BaseModel):
    location: str | None = None
    trade: str | None = None
    status: str | None = None
    description: str | None = None
    notes: str | None = None
    severity: str | None = None
    standard_ref: str | None = None
    engineering_impact: str | None = None
    issue_id: str | None = None
    catalog_version: str | None = None
    top_family: str | None = None
    category_id: str | None = None
    category_name_he: str | None = None
    target_elements: str | None = None
    sort_order: int | None = None


class FieldVisitReportLineUpdateRequest(BaseModel):
    location: str | None = None
    trade: str | None = None
    status: str | None = None
    description: str | None = None
    notes: str | None = None
    severity: str | None = None
    standard_ref: str | None = None
    engineering_impact: str | None = None
    issue_id: str | None = None
    catalog_version: str | None = None
    top_family: str | None = None
    category_id: str | None = None
    category_name_he: str | None = None
    sort_order: int | None = None


class FieldVisitReportSummary(BaseModel):
    id: str
    organization_id: str
    project_id: str
    project_name: str | None = None
    created_by_profile_id: str
    visit_type: str
    visit_type_label_he: str
    status: str
    status_label_he: str
    visit_date: date | str
    header_fields: dict = Field(default_factory=dict)
    catalog_version: str | None = None
    closed_at: datetime | None = None
    locked_at: datetime | None = None
    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None
    lines: list[dict] = Field(default_factory=list)
    line_count: int = 0
    is_editable: bool = True


class FieldVisitReportLineSummary(BaseModel):
    id: str
    report_id: str
    sort_order: int
    location: str | None = None
    trade: str | None = None
    status: str | None = None
    description: str | None = None
    notes: str | None = None
    severity: str | None = None
    standard_ref: str | None = None
    engineering_impact: str | None = None
    issue_id: str | None = None
    catalog_version: str | None = None
    top_family: str | None = None
    category_id: str | None = None
    category_name_he: str | None = None
    photo_storage_path: str | None = None
    has_catalog_issue: bool = False
    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None
