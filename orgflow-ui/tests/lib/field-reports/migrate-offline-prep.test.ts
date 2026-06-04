import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  closeFieldReportDatabase,
  deleteFieldReportDatabase,
} from "@/lib/field-reports/db/field-report-db";
import {
  clearLegacyOfflinePrepBundle,
  readLegacyOfflinePrepBundle,
  writeLegacyOfflinePrepBundle,
} from "@/lib/field-reports/offline-prep-local-storage";
import {
  hydrateOfflinePrepBundle,
  loadOfflinePrepBundle,
  saveOfflinePrepBundle,
} from "@/lib/field-reports/offline-store";
import {
  loadCatalogBundle,
  migrateOfflinePrepFromLocalStorage,
} from "@/lib/field-reports/repositories/catalog-repository";

const ORG_ID = "org-migrate-1";

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

function legacyBundle() {
  return {
    organization_id: ORG_ID,
    offline_max_days: 7,
    prepared_at: "2026-06-01T10:00:00.000Z",
    expires_at: "2026-06-08T10:00:00.000Z",
    catalog_version: "legacy-v1",
    catalog: { families: [{ top_family: "SAFETY" }] },
    visit_types: [],
    organization_profile: {},
    projects: [{ id: "p-legacy" }],
    reports: [],
  };
}

describe("offline prep migration (FR-006)", () => {
  beforeEach(async () => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
    await deleteFieldReportDatabase();
  });

  afterEach(async () => {
    await closeFieldReportDatabase();
    await deleteFieldReportDatabase();
    vi.unstubAllGlobals();
  });

  it("migrates legacy localStorage bundle into IndexedDB catalog", async () => {
    writeLegacyOfflinePrepBundle(ORG_ID, legacyBundle());

    const migrated = await migrateOfflinePrepFromLocalStorage(ORG_ID);

    expect(migrated?.catalog_version).toBe("legacy-v1");
    expect(readLegacyOfflinePrepBundle(ORG_ID)).toBeNull();

    const fromDb = await loadCatalogBundle(ORG_ID);
    expect(fromDb?.projects).toHaveLength(1);
    expect(fromDb?.prepared_at).toBe("2026-06-01T10:00:00.000Z");
  });

  it("hydrateOfflinePrepBundle fills sync cache for UI reads", async () => {
    writeLegacyOfflinePrepBundle(ORG_ID, legacyBundle());

    const hydrated = await hydrateOfflinePrepBundle(ORG_ID);
    expect(hydrated?.catalog_version).toBe("legacy-v1");
    expect(loadOfflinePrepBundle(ORG_ID)?.catalog_version).toBe("legacy-v1");
  });

  it("saveOfflinePrepBundle writes to IndexedDB and clears legacy", async () => {
    writeLegacyOfflinePrepBundle(ORG_ID, legacyBundle());

    const saved = await saveOfflinePrepBundle(ORG_ID, {
      organization_id: ORG_ID,
      offline_max_days: 7,
      catalog_version: "fresh-v2",
      catalog: { families: [] },
      visit_types: [],
      organization_profile: {},
      projects: [],
      reports: [],
    });

    expect(saved.catalog_version).toBe("fresh-v2");
    expect(readLegacyOfflinePrepBundle(ORG_ID)).toBeNull();
    clearLegacyOfflinePrepBundle(ORG_ID);

    const fromDb = await loadCatalogBundle(ORG_ID);
    expect(fromDb?.catalog_version).toBe("fresh-v2");
  });
});
