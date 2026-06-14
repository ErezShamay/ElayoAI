import { apiFetch } from "@/lib/api/client";
import { readApiErrorMessage } from "@/lib/api/read-error-message";

import {
  buildDeliverableReportsQuery,
  defaultDeliverableReportRange,
} from "./date-range";
import type { DeliverableReportsDashboard } from "./types";

export async function downloadFieldVisitReportPdf(
  reportId: string,
  filename?: string | null
): Promise<void> {
  const response = await apiFetch(`/field-reports/visits/${reportId}/pdf`);

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "הורדת ה-PDF נכשלה")
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename?.trim() || `דוח-ביקור-${reportId}.pdf`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function getDeliverableReportsDashboard(options?: {
  startDate?: string;
  endDate?: string;
  projectId?: string | null;
}): Promise<DeliverableReportsDashboard> {
  const defaults = defaultDeliverableReportRange();
  const startDate = options?.startDate ?? defaults.startDate;
  const endDate = options?.endDate ?? defaults.endDate;

  const response = await apiFetch(
    buildDeliverableReportsQuery(startDate, endDate, options?.projectId)
  );

  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "שגיאה בטעינת דוחות שנשלחו")
    );
  }

  return (await response.json()) as DeliverableReportsDashboard;
}
