import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  clearSyncQueueForOrganization,
  countSyncQueueForUser,
  enqueueSyncQueueRecord,
  getSyncQueueRecord,
  listActiveSyncQueueForOrganization,
  listSyncQueueForUser,
  removeSyncQueueRecord,
  updateSyncQueueRecord,
} from "@/lib/field-reports/repositories/sync-queue-repository";

const ORG_ID = "org-sync-queue";
const USER_A = "user-a";
const USER_B = "user-b";
const REPORT_A = "a1111111-1111-4111-8111-111111111111";
const REPORT_B = "b2222222-2222-4222-8222-222222222222";

describe("sync-queue-repository (FR-024)", () => {
  beforeEach(async () => {
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
  });

  it("enqueues and lists records per organization and user", async () => {
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_A,
      organization_id: ORG_ID,
      user_id: USER_A,
    });
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_B,
      organization_id: ORG_ID,
      user_id: USER_B,
    });

    expect(await countSyncQueueForUser(ORG_ID, USER_A)).toBe(1);
    expect(await listSyncQueueForUser(ORG_ID, USER_A)).toHaveLength(1);
    expect(await listSyncQueueForUser(ORG_ID, USER_B)).toHaveLength(1);
  });

  it("updates phase, error, and server_report_id", async () => {
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_A,
      organization_id: ORG_ID,
      user_id: USER_A,
    });

    const updated = await updateSyncQueueRecord(REPORT_A, {
      sync_phase: "photos",
      last_error: "retry",
      server_report_id: "server-report-1",
    });

    expect(updated?.sync_phase).toBe("photos");
    expect(updated?.last_error).toBe("retry");
    expect(updated?.server_report_id).toBe("server-report-1");
  });

  it("preserves idempotency key on re-enqueue", async () => {
    const first = await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_A,
      organization_id: ORG_ID,
      idempotency_key: "idem-fixed",
    });

    const second = await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_A,
      organization_id: ORG_ID,
      sync_phase: "queued",
      last_error: null,
    });

    expect(second.idempotency_key).toBe(first.idempotency_key);
    expect(second.idempotency_key).toBe("idem-fixed");
  });

  it("excludes done records from active list", async () => {
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_A,
      organization_id: ORG_ID,
      sync_status: "done",
    });
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_B,
      organization_id: ORG_ID,
      sync_status: "pending",
    });

    const active = await listActiveSyncQueueForOrganization(ORG_ID);
    expect(active).toHaveLength(1);
    expect(active[0].client_report_uuid).toBe(REPORT_B);
  });

  it("removes record from queue", async () => {
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_A,
      organization_id: ORG_ID,
      user_id: USER_A,
    });

    await removeSyncQueueRecord(REPORT_A);
    expect(await getSyncQueueRecord(REPORT_A)).toBeNull();
    expect(await countSyncQueueForUser(ORG_ID, USER_A)).toBe(0);
  });

  it("clears all records for an organization", async () => {
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_A,
      organization_id: ORG_ID,
    });
    await enqueueSyncQueueRecord({
      client_report_uuid: REPORT_B,
      organization_id: "org-other",
    });

    await clearSyncQueueForOrganization(ORG_ID);
    expect(await listActiveSyncQueueForOrganization(ORG_ID)).toHaveLength(0);
    expect(
      await listActiveSyncQueueForOrganization("org-other")
    ).toHaveLength(1);
  });
});
