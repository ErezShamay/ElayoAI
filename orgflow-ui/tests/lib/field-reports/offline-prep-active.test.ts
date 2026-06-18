import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOfflinePrepActive,
  readOfflinePrepActive,
  setOfflinePrepActive,
} from "@/lib/field-reports/offline-prep-active";

describe("offline-prep-active", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("readOfflinePrepActive returns false when not set", () => {
    expect(readOfflinePrepActive("org-1")).toBe(false);
  });

  it("setOfflinePrepActive persists active flag per org", () => {
    setOfflinePrepActive("org-1", true);
    expect(readOfflinePrepActive("org-1")).toBe(true);
    expect(readOfflinePrepActive("org-2")).toBe(false);

    clearOfflinePrepActive("org-1");
    expect(readOfflinePrepActive("org-1")).toBe(false);
  });
});
