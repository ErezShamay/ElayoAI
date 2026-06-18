import type { VisitReportView } from "@/lib/field-reports/visit-report-view";

export function visitReportPipelineStatusLabel(
  report: Pick<VisitReportView, "status" | "status_label_he" | "is_published">
): string {
  switch (report.status) {
    case "FINALIZING":
      return "מעבד...";
    case "FINALIZED":
      return "נשלח בהצלחה";
    case "FINALIZE_FAILED":
      return "שגיאה בעיבוד";
    case "LOCKED":
    case "PUBLISHED":
      return report.is_published ? "נשלח בהצלחה" : "ננעל";
    default:
      return report.status_label_he;
  }
}

export function isVisitReportFinalizeComplete(
  status: string | undefined | null
): boolean {
  return status === "FINALIZED" || status === "LOCKED";
}

export function isVisitReportFinalizeFailed(
  status: string | undefined | null
): boolean {
  return status === "FINALIZE_FAILED";
}

export function isVisitReportFinalizing(
  status: string | undefined | null
): boolean {
  return status === "FINALIZING";
}
