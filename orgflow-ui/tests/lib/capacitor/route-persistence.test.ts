import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearCapacitorPersistedRoute,
  readCapacitorPersistedRoute,
  shouldRestoreCapacitorRoute,
  writeCapacitorPersistedRoute,
} from "@/lib/capacitor/route-persistence";

vi.mock("@/lib/capacitor/platform", () => ({
  isCapacitorNativePlatform: vi.fn(() => true),
}));

function createSessionStorageMock() {
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

describe("capacitor route persistence", () => {
  afterEach(() => {
    clearCapacitorPersistedRoute();
  });

  it("writes and reads field report path with query", () => {
    vi.stubGlobal("sessionStorage", createSessionStorageMock());

    writeCapacitorPersistedRoute(
      "/field-reports/_/?report=a1111111-1111-4111-8111-111111111111"
    );

    expect(readCapacitorPersistedRoute()).toBe(
      "/field-reports/_/?report=a1111111-1111-4111-8111-111111111111"
    );
  });

  it("shouldRestoreCapacitorRoute when on home with saved field report path", () => {
    vi.stubGlobal("sessionStorage", createSessionStorageMock());

    writeCapacitorPersistedRoute("/field-reports/_/?report=abc");

    expect(shouldRestoreCapacitorRoute("/")).toBe(true);
    expect(shouldRestoreCapacitorRoute("/field-reports/new")).toBe(false);
  });
});
