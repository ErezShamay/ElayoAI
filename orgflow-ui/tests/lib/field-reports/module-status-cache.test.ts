import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearCachedFieldReportModuleStatus,
  readCachedFieldReportModuleStatus,
  writeCachedFieldReportModuleStatus,
} from "@/lib/field-reports/module-status-cache";

const ORG_ID = "org-offline-test";

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

describe("module-status-cache", () => {
  afterEach(() => {
    clearCachedFieldReportModuleStatus(ORG_ID);
  });

  it("round-trips enabled module status", () => {
    vi.stubGlobal("localStorage", createLocalStorageMock());

    writeCachedFieldReportModuleStatus({
      organization_id: ORG_ID,
      is_enabled: true,
      storage_available: true,
    });

    const cached = readCachedFieldReportModuleStatus(ORG_ID);
    expect(cached?.organization_id).toBe(ORG_ID);
    expect(cached?.is_enabled).toBe(true);
    expect(cached?.storage_available).toBe(true);
    expect(cached?.cached_at).toBeTruthy();
  });

  it("clear removes cached entry", () => {
    vi.stubGlobal("localStorage", createLocalStorageMock());

    writeCachedFieldReportModuleStatus({
      organization_id: ORG_ID,
      is_enabled: true,
    });

    clearCachedFieldReportModuleStatus(ORG_ID);
    expect(readCachedFieldReportModuleStatus(ORG_ID)).toBeNull();
  });
});
