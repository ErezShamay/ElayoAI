import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearCapacitorPersistedRoute,
  currentDocumentPath,
  readCapacitorPersistedRoute,
  shouldRestoreCapacitorRoute,
  writeCapacitorPersistedRoute,
} from "@/lib/capacitor/route-persistence";

vi.mock("@/lib/capacitor/platform", () => ({
  isCapacitorNativePlatform: vi.fn(() => true),
}));

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

describe("capacitor route persistence", () => {
  afterEach(() => {
    clearCapacitorPersistedRoute();
  });

  it("writes and reads field report path with query in localStorage", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      location: { pathname: "/", search: "" },
    });

    writeCapacitorPersistedRoute(
      "/field-reports/_/?report=a1111111-1111-4111-8111-111111111111"
    );

    expect(readCapacitorPersistedRoute()).toBe(
      "/field-reports/_/?report=a1111111-1111-4111-8111-111111111111"
    );
  });

  it("shouldRestoreCapacitorRoute when on home with saved field report path", () => {
    vi.stubGlobal("window", {
      localStorage: createLocalStorageMock(),
      location: { pathname: "/", search: "" },
    });

    writeCapacitorPersistedRoute("/field-reports/_/?report=abc");

    expect(shouldRestoreCapacitorRoute("/")).toBe(true);
    expect(shouldRestoreCapacitorRoute("/index.html")).toBe(true);
    expect(shouldRestoreCapacitorRoute("/field-reports/new")).toBe(false);
  });

  it("currentDocumentPath includes search params", () => {
    vi.stubGlobal("window", {
      location: {
        pathname: "/field-reports/_/",
        search: "?report=abc",
      },
    });

    expect(currentDocumentPath()).toBe("/field-reports/_/?report=abc");
  });
});
