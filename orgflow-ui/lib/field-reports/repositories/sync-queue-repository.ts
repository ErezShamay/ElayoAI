import {
  FIELD_REPORT_STORES,
  type LocalSyncStatus,
  type SyncQueueRecord,
} from "@/lib/field-reports/db/schema";
import { getFieldReportDatabase } from "@/lib/field-reports/db/field-report-db";
import type { PendingSendSyncPhase } from "@/lib/field-reports/send-queue";

export type { SyncQueueRecord };

export type EnqueueSyncQueueInput = {
  client_report_uuid: string;
  organization_id: string;
  user_id?: string | null;
  server_report_id?: string | null;
  idempotency_key?: string | null;
  sync_phase?: PendingSendSyncPhase;
  sync_status?: LocalSyncStatus;
  last_error?: string | null;
};

export type UpdateSyncQueueRecordInput = Partial<
  Pick<
    SyncQueueRecord,
    | "server_report_id"
    | "sync_phase"
    | "sync_status"
    | "last_error"
    | "idempotency_key"
  >
>;

function nowIso() {
  return new Date().toISOString();
}

function createIdempotencyKey(clientReportUuid: string): string {
  if (
    typeof globalThis.crypto !== "undefined"
    && typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `field-report-sync:${clientReportUuid}:${globalThis.crypto.randomUUID()}`;
  }

  return `field-report-sync:${clientReportUuid}:${Date.now()}`;
}

function matchesUser(
  record: Pick<SyncQueueRecord, "user_id">,
  userId: string
): boolean {
  return !record.user_id || record.user_id === userId;
}

export async function enqueueSyncQueueRecord(
  input: EnqueueSyncQueueInput
): Promise<SyncQueueRecord> {
  const database = await getFieldReportDatabase();
  const existing = await database.get(
    FIELD_REPORT_STORES.sync_queue,
    input.client_report_uuid
  );

  const record: SyncQueueRecord = {
    client_report_uuid: input.client_report_uuid,
    organization_id: input.organization_id,
    user_id: input.user_id ?? existing?.user_id ?? null,
    server_report_id:
      input.server_report_id !== undefined
        ? input.server_report_id
        : existing?.server_report_id ?? null,
    requested_at: existing?.requested_at ?? nowIso(),
    idempotency_key:
      input.idempotency_key
      ?? existing?.idempotency_key
      ?? createIdempotencyKey(input.client_report_uuid),
    sync_phase: input.sync_phase ?? existing?.sync_phase ?? "queued",
    sync_status: input.sync_status ?? existing?.sync_status ?? "pending",
    last_error:
      input.last_error !== undefined
        ? input.last_error
        : existing?.last_error ?? null,
  };

  await database.put(FIELD_REPORT_STORES.sync_queue, record);
  return record;
}

export async function getSyncQueueRecord(
  clientReportUuid: string
): Promise<SyncQueueRecord | null> {
  const database = await getFieldReportDatabase();
  const record = await database.get(
    FIELD_REPORT_STORES.sync_queue,
    clientReportUuid
  );
  return record ?? null;
}

export async function listSyncQueueForOrganization(
  organizationId: string
): Promise<SyncQueueRecord[]> {
  if (!organizationId) {
    return [];
  }

  const database = await getFieldReportDatabase();
  return database.getAllFromIndex(
    FIELD_REPORT_STORES.sync_queue,
    "by-organization",
    organizationId
  );
}

export async function listSyncQueueForUser(
  organizationId: string,
  userId: string
): Promise<SyncQueueRecord[]> {
  const records = await listSyncQueueForOrganization(organizationId);
  return records.filter((record) => matchesUser(record, userId));
}

export async function countSyncQueueForUser(
  organizationId: string,
  userId: string
): Promise<number> {
  const records = await listActiveSyncQueueForUser(
    organizationId,
    userId
  );
  return records.length;
}

export async function listActiveSyncQueueForOrganization(
  organizationId: string
): Promise<SyncQueueRecord[]> {
  const records = await listSyncQueueForOrganization(organizationId);
  return records.filter((record) => record.sync_status !== "done");
}

export async function listActiveSyncQueueForUser(
  organizationId: string,
  userId: string
): Promise<SyncQueueRecord[]> {
  const records = await listActiveSyncQueueForOrganization(
    organizationId
  );
  return records.filter((record) => matchesUser(record, userId));
}

export async function updateSyncQueueRecord(
  clientReportUuid: string,
  patch: UpdateSyncQueueRecordInput
): Promise<SyncQueueRecord | null> {
  const existing = await getSyncQueueRecord(clientReportUuid);
  if (!existing) {
    return null;
  }

  const record: SyncQueueRecord = { ...existing, ...patch };

  const database = await getFieldReportDatabase();
  await database.put(FIELD_REPORT_STORES.sync_queue, record);
  return record;
}

export async function clearSyncQueueForOrganization(
  organizationId: string
): Promise<void> {
  const records = await listSyncQueueForOrganization(organizationId);
  const database = await getFieldReportDatabase();
  await Promise.all(
    records.map((record) =>
      database.delete(
        FIELD_REPORT_STORES.sync_queue,
        record.client_report_uuid
      )
    )
  );
}

export async function removeSyncQueueRecord(
  clientReportUuid: string
): Promise<void> {
  const database = await getFieldReportDatabase();
  await database.delete(
    FIELD_REPORT_STORES.sync_queue,
    clientReportUuid
  );
}
