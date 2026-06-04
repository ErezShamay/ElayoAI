import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearFieldReportSyncErrorLog,
  clearFieldReportSyncErrorsForOrganization,
  clearFieldReportSyncErrorsForReport,
  FIELD_REPORT_SYNC_ERROR_LOG_MAX,
  getFieldReportSentryConfig,
  listFieldReportSyncErrorLog,
  recordFieldReportSyncError,
  resetFieldReportSyncErrorMonitorForTests,
} from "@/lib/field-reports/sync/sync-error-monitor";

const ORG_ID = "org-sync-monitor";
const REPORT_UUID = "a1111111-1111-4111-8111-111111111111";

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("sync-error-monitor (FR-037)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    resetFieldReportSyncErrorMonitorForTests();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    resetFieldReportSyncErrorMonitorForTests();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("getFieldReportSentryConfig reads NEXT_PUBLIC_SENTRY_DSN", () => {
    expect(
      getFieldReportSentryConfig({
        NEXT_PUBLIC_SENTRY_DSN: "https://key@o1.ingest.sentry.io/2",
        NEXT_PUBLIC_SENTRY_ENVIRONMENT: "staging",
      })
    ).toEqual({
      dsn: "https://key@o1.ingest.sentry.io/2",
      environment: "staging",
      enabled: true,
    });

    expect(getFieldReportSentryConfig({}).enabled).toBe(false);
  });

  it("recordFieldReportSyncError appends to localStorage ring buffer", () => {
    recordFieldReportSyncError({
      organizationId: ORG_ID,
      clientReportUuid: REPORT_UUID,
      phase: "photos",
      message: "העלאת תמונה נכשלה",
    });

    const log = listFieldReportSyncErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      organizationId: ORG_ID,
      clientReportUuid: REPORT_UUID,
      phase: "photos",
      message: "העלאת תמונה נכשלה",
    });
    expect(log[0].occurredAt).toBeTruthy();
  });

  it("caps local log at FIELD_REPORT_SYNC_ERROR_LOG_MAX entries", () => {
    for (let index = 0; index < FIELD_REPORT_SYNC_ERROR_LOG_MAX + 3; index += 1) {
      recordFieldReportSyncError({
        organizationId: ORG_ID,
        clientReportUuid: `report-${index}`,
        phase: "queued",
        message: `error-${index}`,
      });
    }

    expect(listFieldReportSyncErrorLog()).toHaveLength(
      FIELD_REPORT_SYNC_ERROR_LOG_MAX
    );
    expect(listFieldReportSyncErrorLog()[0].message).toBe(
      `error-${FIELD_REPORT_SYNC_ERROR_LOG_MAX + 2}`
    );
  });

  it("clearFieldReportSyncErrorsForReport removes only matching report", () => {
    recordFieldReportSyncError({
      organizationId: ORG_ID,
      clientReportUuid: REPORT_UUID,
      phase: "upsert",
      message: "שגיאה א",
    });
    recordFieldReportSyncError({
      organizationId: ORG_ID,
      clientReportUuid: "b2222222-2222-4222-8222-222222222222",
      phase: "upsert",
      message: "שגיאה ב",
    });

    clearFieldReportSyncErrorsForReport(ORG_ID, REPORT_UUID);

    const remaining = listFieldReportSyncErrorLog();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].clientReportUuid).toBe(
      "b2222222-2222-4222-8222-222222222222"
    );
  });

  it("clearFieldReportSyncErrorsForOrganization removes org entries", () => {
    recordFieldReportSyncError({
      organizationId: ORG_ID,
      clientReportUuid: REPORT_UUID,
      phase: "request_send",
      message: "שגיאה",
    });
    recordFieldReportSyncError({
      organizationId: "org-other",
      clientReportUuid: REPORT_UUID,
      phase: "request_send",
      message: "שגיאה אחרת",
    });

    clearFieldReportSyncErrorsForOrganization(ORG_ID);

    const remaining = listFieldReportSyncErrorLog();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].organizationId).toBe("org-other");
  });

  it("uses window.Sentry.captureMessage when SDK is present", () => {
    const captureMessage = vi.fn();
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      Sentry: { captureMessage },
    });

    recordFieldReportSyncError({
      organizationId: ORG_ID,
      clientReportUuid: REPORT_UUID,
      phase: "close",
      message: "סגירה נכשלה",
    });

    expect(captureMessage).toHaveBeenCalledWith(
      "סגירה נכשלה",
      expect.objectContaining({
        level: "error",
        tags: expect.objectContaining({
          module: "field-reports",
          sync_phase: "close",
        }),
      })
    );
    expect(listFieldReportSyncErrorLog()).toHaveLength(1);
  });

  it("clearFieldReportSyncErrorLog removes storage key", () => {
    recordFieldReportSyncError({
      organizationId: ORG_ID,
      clientReportUuid: REPORT_UUID,
      phase: "queued",
      message: "x",
    });

    clearFieldReportSyncErrorLog();
    expect(listFieldReportSyncErrorLog()).toHaveLength(0);
  });
});
