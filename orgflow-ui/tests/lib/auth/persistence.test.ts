import { describe, expect, it, vi } from "vitest";

import {
  clearLegacySupabaseAuthFromLocalStorage,
  clearSupabaseAuthTokensFromStorage,
  isSupabaseAuthStorageKey,
} from "@/lib/auth/persistence";

function createStorageMock(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  } satisfies Storage;
}

describe("auth persistence", () => {
  it("isSupabaseAuthStorageKey matches sb-*-auth-token keys", () => {
    expect(isSupabaseAuthStorageKey("sb-abc-auth-token")).toBe(true);
    expect(isSupabaseAuthStorageKey("elayoai-theme")).toBe(false);
  });

  it("clearSupabaseAuthTokensFromStorage removes only Supabase auth keys", () => {
    const storage = createStorageMock({
      "sb-project-auth-token": '{"access_token":"x"}',
      "elayoai-theme": "dark",
    });

    clearSupabaseAuthTokensFromStorage(storage);

    expect(storage.getItem("sb-project-auth-token")).toBeNull();
    expect(storage.getItem("elayoai-theme")).toBe("dark");
  });

  it("clearLegacySupabaseAuthFromLocalStorage clears localStorage sb keys", () => {
    const localStorage = createStorageMock({
      "sb-legacy-auth-token": '{"access_token":"old"}',
    });

    vi.stubGlobal("window", { localStorage });

    clearLegacySupabaseAuthFromLocalStorage();

    expect(localStorage.getItem("sb-legacy-auth-token")).toBeNull();
  });
});
