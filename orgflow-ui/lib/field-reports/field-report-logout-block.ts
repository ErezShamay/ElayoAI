import { countSyncQueueForUser } from "@/lib/field-reports/repositories/sync-queue-repository";
import {
  listLocalReportsForOrganization,
  type LocalVisitReportRecord,
} from "@/lib/field-reports/repositories/reports-repository";

export type FieldReportLogoutBlockSummary = {
  syncQueueCount: number;
  pendingSendCount: number;
  pendingLocalReportCount: number;
  total: number;
};

export type FieldReportLogoutBlock = {
  message: string;
  summary: FieldReportLogoutBlockSummary;
};

function matchesReportUser(
  report: LocalVisitReportRecord,
  userId: string
): boolean {
  return !report.user_id || report.user_id === userId;
}

function isPendingLocalReport(report: LocalVisitReportRecord): boolean {
  return (
    report.sync_status === "pending"
    || report.sync_status === "failed"
    || report.sync_status === "syncing"
  );
}

export async function summarizeFieldReportLogoutBlock(
  organizationId: string,
  userId: string
): Promise<FieldReportLogoutBlockSummary> {
  const syncQueueCount = await countSyncQueueForUser(
    organizationId,
    userId
  );
  /** תור שליחה לליבה מאוחד ל-`sync_queue` (FR-024). */
  const pendingSendCount = 0;

  const localReports = await listLocalReportsForOrganization(organizationId);
  const pendingLocalReportCount = localReports.filter(
    (report) =>
      matchesReportUser(report, userId) && isPendingLocalReport(report)
  ).length;

  const total =
    syncQueueCount + pendingSendCount + pendingLocalReportCount;

  return {
    syncQueueCount,
    pendingSendCount,
    pendingLocalReportCount,
    total,
  };
}

export async function getFieldReportLogoutBlock(
  organizationId: string | null | undefined,
  userId: string | null | undefined
): Promise<FieldReportLogoutBlock | null> {
  if (!organizationId || !userId) {
    return null;
  }

  const summary = await summarizeFieldReportLogoutBlock(
    organizationId,
    userId
  );

  if (summary.total === 0) {
    return null;
  }

  const parts: string[] = [];

  if (summary.syncQueueCount > 0) {
    parts.push(
      `${summary.syncQueueCount} דוחות ממתינים בתור סנכרון`
    );
  }

  if (summary.pendingSendCount > 0) {
    parts.push(
      `${summary.pendingSendCount} דוחות ממתינים לשליחה לליבה`
    );
  }

  if (summary.pendingLocalReportCount > 0) {
    parts.push(
      `${summary.pendingLocalReportCount} דוחות מקומיים שלא הועלו`
    );
  }

  return {
    message: `לא ניתן להתנתק — ${parts.join(" · ")}. סנכרן או שלח לליבה לפני יציאה.`,
    summary,
  };
}

export class FieldReportLogoutBlockedError extends Error {
  readonly block: FieldReportLogoutBlock;

  constructor(block: FieldReportLogoutBlock) {
    super(block.message);
    this.name = "FieldReportLogoutBlockedError";
    this.block = block;
  }
}

export async function assertFieldReportLogoutAllowed(
  organizationId: string | null | undefined,
  userId: string | null | undefined
): Promise<void> {
  const block = await getFieldReportLogoutBlock(organizationId, userId);
  if (block) {
    throw new FieldReportLogoutBlockedError(block);
  }
}
