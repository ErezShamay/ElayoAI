import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearOfflinePrepUiDismiss,
  isOfflinePrepUiDismissed,
  readOfflinePrepUiDismiss,
  saveOfflinePrepUiDismiss,
} from "@/lib/field-reports/offline-prep-ui-dismiss";

const ORG_ID = "org-dismiss-test";

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

describe("offline-prep-ui-dismiss", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remembers guide dismiss for the same prep fingerprint", () => {
    const fingerprint = {
      expiresAt: "2026-06-10T15:59:03.000Z",
      catalogVersion: "1.1.0",
    };

    saveOfflinePrepUiDismiss(ORG_ID, "guide", fingerprint);

    expect(
      isOfflinePrepUiDismissed(ORG_ID, "guide", fingerprint)
    ).toBe(true);
    expect(readOfflinePrepUiDismiss(ORG_ID, "guide")).toEqual(fingerprint);
  });

  it("shows guide again after a new offline prep", () => {
    const oldFingerprint = {
      expiresAt: "2026-06-10T15:59:03.000Z",
      catalogVersion: "1.1.0",
    };
    const newFingerprint = {
      expiresAt: "2026-06-17T15:59:03.000Z",
      catalogVersion: "1.2.0",
    };

    saveOfflinePrepUiDismiss(ORG_ID, "guide", oldFingerprint);

    expect(
      isOfflinePrepUiDismissed(ORG_ID, "guide", newFingerprint)
    ).toBe(false);
  });

  it("clearOfflinePrepUiDismiss resets guide dismiss", () => {
    const fingerprint = {
      expiresAt: "2026-06-10T15:59:03.000Z",
      catalogVersion: "1.1.0",
    };

    saveOfflinePrepUiDismiss(ORG_ID, "guide", fingerprint);
    clearOfflinePrepUiDismiss(ORG_ID);

    expect(
      isOfflinePrepUiDismissed(ORG_ID, "guide", fingerprint)
    ).toBe(false);
  });
});
