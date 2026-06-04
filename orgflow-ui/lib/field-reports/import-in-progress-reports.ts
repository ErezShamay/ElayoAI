import { apiFetch } from "@/lib/api/client";
import { createClientLineUuid, createClientReportUuid } from "@/lib/field-reports/ids";
import type { LocalVisitReportLine } from "@/lib/field-reports/repositories/reports-repository";
import {
  getLocalReportByServerId,
  saveLocalReport,
  type LocalVisitReportRecord,
  type SaveLocalReportInput,
} from "@/lib/field-reports/repositories/reports-repository";

export type OfflinePrepReportSummary = {
  id: string;
  status?: string;
};

export type ServerVisitReportLine = {
  id: string;
  sort_order?: number;
  location?: string | null;
  trade?: string | null;
  status?: string | null;
  description?: string | null;
  notes?: string | null;
  severity?: string | null;
  standard_ref?: string | null;
  issue_id?: string | null;
  has_photo?: boolean;
  photo_ids?: string[];
  group_key?: string | null;
  group_label_he?: string | null;
  block_id?: string | null;
};

export type ServerVisitReportPayload = {
  id: string;
  status?: string;
  organization_id?: string;
  project_id: string;
  project_name?: string | null;
  visit_type: string;
  visit_type_label_he?: string | null;
  visit_date: string;
  header_fields?: Record<string, unknown>;
  catalog_version?: string | null;
  organization_profile_snapshot?: Record<string, unknown> | null;
  lines?: ServerVisitReportLine[];
};

export type ImportInProgressReportsResult = {
  imported: number;
  updated: number;
  skipped: number;
  failed: string[];
};

export function filterInProgressPrepReports(
  prepReports: unknown[]
): OfflinePrepReportSummary[] {
  return (prepReports as Array<Record<string, unknown>>)
    .map((report) => ({
      id: String(report.id ?? ""),
      status: report.status ? String(report.status) : undefined,
    }))
    .filter(
      (report) =>
        Boolean(report.id) && report.status === "IN_PROGRESS"
    );
}

function mapServerLineToLocal(
  serverLine: ServerVisitReportLine,
  existingLine?: LocalVisitReportLine
): LocalVisitReportLine {
  const serverLineId = String(serverLine.id);

  return {
    id: serverLineId,
    client_line_uuid:
      existingLine?.client_line_uuid ?? createClientLineUuid(),
    server_line_id: serverLineId,
    sort_order: serverLine.sort_order ?? existingLine?.sort_order ?? 0,
    location: serverLine.location ?? null,
    trade: serverLine.trade ?? null,
    status: serverLine.status ?? null,
    description: serverLine.description ?? null,
    notes: serverLine.notes ?? null,
    severity: serverLine.severity ?? null,
    standard_ref: serverLine.standard_ref ?? null,
    issue_id: serverLine.issue_id ?? null,
    group_key: serverLine.group_key ?? null,
    group_label_he: serverLine.group_label_he ?? null,
    block_id: serverLine.block_id ?? null,
    has_photo: serverLine.has_photo ?? existingLine?.has_photo,
    photo_ids: serverLine.photo_ids ?? existingLine?.photo_ids,
  };
}

export function mapServerVisitReportToLocalInput(
  serverReport: ServerVisitReportPayload,
  organizationId: string,
  userId: string | null | undefined,
  existing: LocalVisitReportRecord | null
): SaveLocalReportInput {
  const serverReportId = String(serverReport.id);
  const serverLines = serverReport.lines ?? [];
  const existingByServerLineId = new Map(
    (existing?.lines ?? [])
      .filter((line) => line.server_line_id)
      .map((line) => [String(line.server_line_id), line] as const)
  );

  const lines = serverLines.map((line) =>
    mapServerLineToLocal(
      line,
      existingByServerLineId.get(String(line.id))
        ?? existing?.lines.find(
          (entry) =>
            entry.server_line_id === String(line.id)
            || entry.id === String(line.id)
        )
    )
  );

  return {
    client_report_uuid:
      existing?.client_report_uuid ?? createClientReportUuid(),
    server_report_id: serverReportId,
    organization_id: organizationId,
    user_id: userId ?? existing?.user_id ?? null,
    project_id: String(serverReport.project_id),
    project_name: serverReport.project_name ?? existing?.project_name ?? null,
    visit_type: serverReport.visit_type,
    visit_type_label_he:
      serverReport.visit_type_label_he ?? existing?.visit_type_label_he ?? null,
    visit_date: serverReport.visit_date,
    header_fields: serverReport.header_fields ?? {},
    lines,
    local_status: "LOCAL_IN_PROGRESS",
    sync_status: "done",
    catalog_version:
      serverReport.catalog_version ?? existing?.catalog_version ?? null,
    organization_profile_snapshot:
      serverReport.organization_profile_snapshot
      ?? existing?.organization_profile_snapshot
      ?? null,
    closed_at: null,
  };
}

export type FetchVisitReportForImport = (
  serverReportId: string
) => Promise<ServerVisitReportPayload | null>;

async function defaultFetchVisitReportForImport(
  serverReportId: string
): Promise<ServerVisitReportPayload | null> {
  const response = await apiFetch(
    `/field-reports/visits/${serverReportId}`
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as ServerVisitReportPayload;
}

/**
 * מוריד דוחות IN_PROGRESS מהשרת ל-`reports` store (§6 ב.7, FR-017).
 * נקרא אחרי שמירת חבילת offline-prep.
 */
export async function importInProgressReportsFromOfflinePrep(options: {
  organizationId: string;
  userId?: string | null;
  prepReports: unknown[];
  fetchVisitReport?: FetchVisitReportForImport;
}): Promise<ImportInProgressReportsResult> {
  const {
    organizationId,
    userId,
    prepReports,
    fetchVisitReport = defaultFetchVisitReportForImport,
  } = options;

  const result: ImportInProgressReportsResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: [],
  };

  if (!organizationId) {
    return result;
  }

  const summaries = filterInProgressPrepReports(prepReports);

  for (const summary of summaries) {
    const serverReportId = summary.id;

    try {
      const existing = await getLocalReportByServerId(serverReportId);
      const fullReport = await fetchVisitReport(serverReportId);

      if (!fullReport) {
        result.failed.push(serverReportId);
        continue;
      }

      if (fullReport.status && fullReport.status !== "IN_PROGRESS") {
        result.skipped += 1;
        continue;
      }

      await saveLocalReport(
        mapServerVisitReportToLocalInput(
          fullReport,
          organizationId,
          userId,
          existing
        )
      );

      if (existing) {
        result.updated += 1;
      } else {
        result.imported += 1;
      }
    } catch {
      result.failed.push(serverReportId);
    }
  }

  return result;
}
