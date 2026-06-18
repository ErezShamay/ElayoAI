import type { VisitReportView } from "@/lib/field-reports/visit-report-view";
import { visitReportPipelineStatusLabel } from "@/lib/field-reports/finalize-status-labels";

export function isFieldReportPendingPublish(
  report: Pick<
    VisitReportView,
    "status" | "pending_publish" | "can_publish" | "is_published"
  >
): boolean {
  if (report.status === "CLOSED" || report.status === "FINALIZE_FAILED") {
    return report.is_published !== true;
  }
  if (typeof report.pending_publish === "boolean") {
    return report.pending_publish;
  }
  if (typeof report.can_publish === "boolean") {
    return report.can_publish;
  }
  return false;
}

export function fieldReportListStatusLabel(
  report: Pick<
    VisitReportView,
    "status" | "status_label_he" | "pending_publish" | "is_published"
  >
): string {
  const pipelineLabel = visitReportPipelineStatusLabel(report);
  if (
    report.status === "FINALIZING"
    || report.status === "FINALIZED"
    || report.status === "FINALIZE_FAILED"
  ) {
    return pipelineLabel;
  }
  if (report.pending_publish) {
    return "ממתין להפקת PDF";
  }
  if (report.is_published || report.status === "FINALIZED") {
    return "נשלח בהצלחה";
  }
  return report.status_label_he;
}
