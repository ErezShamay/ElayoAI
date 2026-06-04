import { isClientUuid } from "@/lib/field-reports/ids";
import {
  getLocalReport,
  getLocalReportByServerId,
} from "@/lib/field-reports/repositories/reports-repository";

export type ReportQueueIdentity = {
  clientReportUuid: string;
  serverReportId: string | null;
};

/**
 * ממפה מזהה דוח מה-URL/API (`server id` או `client_report_uuid`) לרשומת תור.
 */
export async function resolveReportQueueIdentity(
  reportKey: string
): Promise<ReportQueueIdentity> {
  const trimmed = reportKey.trim();
  if (!trimmed) {
    throw new Error("מזהה דוח נדרש לתור סנכרון");
  }

  if (isClientUuid(trimmed)) {
    const local = await getLocalReport(trimmed);
    return {
      clientReportUuid: trimmed,
      serverReportId: local?.server_report_id ?? null,
    };
  }

  const byServer = await getLocalReportByServerId(trimmed);
  if (byServer) {
    return {
      clientReportUuid: byServer.client_report_uuid,
      serverReportId: trimmed,
    };
  }

  return {
    clientReportUuid: trimmed,
    serverReportId: trimmed,
  };
}
