import type { VisitReportView } from "@/lib/field-reports/visit-report-view";

export function isFieldReportPendingPublish(
  report: Pick<
    VisitReportView,
    "status" | "pending_publish" | "can_publish" | "is_published"
  >
): boolean {
  if (typeof report.pending_publish === "boolean") {
    return report.pending_publish;
  }
  if (typeof report.can_publish === "boolean") {
    return report.can_publish;
  }
  return report.status === "CLOSED" && report.is_published !== true;
}

export function fieldReportListStatusLabel(
  report: Pick<
    VisitReportView,
    "status" | "status_label_he" | "pending_publish" | "is_published"
  >
): string {
  if (report.pending_publish) {
    return "ממתין לפרסום";
  }
  if (report.is_published) {
    return "פורסם לפורטל";
  }
  return report.status_label_he;
}
