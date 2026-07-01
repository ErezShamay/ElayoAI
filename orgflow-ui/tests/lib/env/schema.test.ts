import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __resetPublicEnvCacheForTests, getPublicEnv } from "@/lib/env/schema";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_API_URL_ANDROID",
  "NEXT_PUBLIC_FORCE_LOGIN",
] as const;

function clearEnv() {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe("getPublicEnv", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      original[key] = process.env[key];
    }
    clearEnv();
    __resetPublicEnvCacheForTests();
  });

  afterEach(() => {
    clearEnv();
    for (const key of ENV_KEYS) {
      if (original[key] !== undefined) {
        process.env[key] = original[key];
      }
    }
    __resetPublicEnvCacheForTests();
  });

  it("defaults every field to an empty string when nothing is set", () => {
    const env = getPublicEnv();
    for (const key of ENV_KEYS) {
      expect(env[key]).toBe("");
    }
  });

  it("trims whitespace around configured values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "  https://example.supabase.co  ";
    __resetPublicEnvCacheForTests();

    expect(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://example.supabase.co"
    );
  });

  it("caches the parsed result until explicitly reset", () => {
    const first = getPublicEnv();
    process.env.NEXT_PUBLIC_API_URL = "https://changed.example.com";
    const second = getPublicEnv();

    expect(second).toBe(first);
    expect(second.NEXT_PUBLIC_API_URL).toBe("");

    __resetPublicEnvCacheForTests();
    expect(getPublicEnv().NEXT_PUBLIC_API_URL).toBe(
      "https://changed.example.com"
    );
  });
});
