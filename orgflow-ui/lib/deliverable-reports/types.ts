export type DeliverableReportType =
  | "weekly"
  | "handover_protocol"
  | "annual_bedek"
  | "home_bedek";

export type DeliverableReportOrigin = "field_visit" | "legacy_upload";

export type DeliverableReportItem = {
  id: string;
  project_id: string;
  project_name?: string | null;
  report_type: DeliverableReportType;
  report_type_label_he: string;
  title: string;
  sent_date: string;
  origin: DeliverableReportOrigin;
  visit_type?: string | null;
};

export type DeliverableReportTypeSummary = {
  report_type: DeliverableReportType;
  label_he: string;
  count: number;
};

export type WeeklyComplianceWeek = {
  iso_year: number;
  iso_week: number;
  week_label_he: string;
  week_start: string;
  week_end: string;
};

export type WeeklyComplianceCell = {
  project_id: string;
  project_name?: string | null;
  iso_year: number;
  iso_week: number;
  submitted: boolean;
  report_count: number;
};

export type WeeklyComplianceSummary = {
  total_expected: number;
  total_submitted: number;
  total_missing: number;
  compliance_rate: number;
};

export type DeliverableReportsDashboard = {
  organization_id: string;
  period_start: string;
  period_end: string;
  active_project_count: number;
  total_deliverables: number;
  by_type: DeliverableReportTypeSummary[];
  reports: DeliverableReportItem[];
  weekly_compliance: WeeklyComplianceSummary;
  weeks: WeeklyComplianceWeek[];
  compliance_matrix: WeeklyComplianceCell[];
  missing_weekly_reports: WeeklyComplianceCell[];
};

export function formatDeliverablePeriod(dashboard: DeliverableReportsDashboard): string {
  const start = new Date(dashboard.period_start).toLocaleDateString("he-IL");
  const end = new Date(dashboard.period_end).toLocaleDateString("he-IL");
  return `${start} - ${end}`;
}

export function formatComplianceRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
