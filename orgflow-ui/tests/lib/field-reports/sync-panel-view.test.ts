import { describe, expect, it } from "vitest";

import {
  buildSyncProgressLabel,
  buildSyncRunSummary,
  isSyncPanelUploadEnabled,
  pendingSendReadyBannerText,
  queueEntriesWithErrors,
  shouldShowSyncPanel,
  syncPanelUploadDisabledReason,
} from "@/lib/field-reports/sync-panel-view";

describe("sync-panel-view (FR-027)", () => {
  it("pendingSendReadyBannerText pluralizes in Hebrew", () => {
    expect(pendingSendReadyBannerText(0)).toBeNull();
    expect(pendingSendReadyBannerText(1)).toContain("דוח אחד");
    expect(pendingSendReadyBannerText(3)).toContain("3");
  });

  it("syncPanelUploadDisabledReason blocks when !canSync or empty queue", () => {
    expect(
      syncPanelUploadDisabledReason({
        canSync: false,
        pendingCount: 2,
        syncing: false,
      })
    ).toContain("שרת");

    expect(
      syncPanelUploadDisabledReason({
        canSync: true,
        pendingCount: 0,
        syncing: false,
      })
    ).toContain("אין דוחות");

    expect(
      syncPanelUploadDisabledReason({
        canSync: true,
        pendingCount: 2,
        syncing: false,
      })
    ).toBeNull();
  });

  it("isSyncPanelUploadEnabled mirrors disabled reason", () => {
    expect(
      isSyncPanelUploadEnabled({
        canSync: true,
        pendingCount: 1,
        syncing: false,
      })
    ).toBe(true);

    expect(
      isSyncPanelUploadEnabled({
        canSync: false,
        pendingCount: 1,
        syncing: false,
      })
    ).toBe(false);
  });

  it("buildSyncProgressLabel includes index, total, and phase", () => {
    const label = buildSyncProgressLabel(2, 5, "photos");
    expect(label).toContain("2");
    expect(label).toContain("5");
    expect(label).toContain("תמונות");
  });

  it("buildSyncRunSummary summarizes successes and failures", () => {
    expect(
      buildSyncRunSummary([
        { clientReportUuid: "a", reportId: "a", success: true },
        { clientReportUuid: "b", reportId: "b", success: false, error: "x" },
      ])
    ).toMatchObject({ successCount: 1, failedCount: 1 });
  });

  it("queueEntriesWithErrors filters entries with lastError", () => {
    expect(
      queueEntriesWithErrors([
        { lastError: "fail" },
        { lastError: "" },
        {},
      ])
    ).toHaveLength(1);
  });

  it("shouldShowSyncPanel when pending, syncing, errors, or summary", () => {
    expect(
      shouldShowSyncPanel({
        pendingCount: 0,
        syncing: false,
        hasQueueErrors: false,
        lastRunSummary: null,
      })
    ).toBe(false);

    expect(
      shouldShowSyncPanel({
        pendingCount: 1,
        syncing: false,
        hasQueueErrors: false,
        lastRunSummary: null,
      })
    ).toBe(true);

    expect(
      shouldShowSyncPanel({
        pendingCount: 0,
        syncing: false,
        hasQueueErrors: false,
        lastRunSummary: {
          successCount: 2,
          failedCount: 0,
          total: 2,
          messageHe: "ok",
        },
      })
    ).toBe(true);
  });
});
