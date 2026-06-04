import { getLocalReport } from "@/lib/field-reports/repositories/reports-repository";
import type { PendingSendRequest } from "@/lib/field-reports/send-queue";

export type SyncPanelQueueEntry = PendingSendRequest & {
  displayLabel: string;
};

function shortReportLabel(reportId: string): string {
  const trimmed = reportId.trim();
  if (!trimmed) {
    return "דוח";
  }

  if (trimmed.length <= 16) {
    return trimmed;
  }

  return `דוח ${trimmed.slice(0, 8)}…`;
}

export async function enrichSyncPanelQueueEntries(
  entries: PendingSendRequest[]
): Promise<SyncPanelQueueEntry[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const local = await getLocalReport(entry.clientReportUuid);
      const displayLabel =
        local?.project_name?.trim()
        || local?.visit_type_label_he?.trim()
        || shortReportLabel(entry.reportId);

      return {
        ...entry,
        displayLabel,
      };
    })
  );
}
