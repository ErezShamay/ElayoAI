import { describe, expect, it } from "vitest";

import { normalizeAuthLogError } from "@/lib/auth/logger";

describe("normalizeAuthLogError", () => {
  it("extracts standard Error fields", () => {
    const error = new Error("Invalid login credentials");

    expect(normalizeAuthLogError(error)).toEqual({
      name: "Error",
      message: "Invalid login credentials",
      stack: error.stack,
    });
  });

  it("extracts Supabase-style auth errors", () => {
    const error = Object.assign(new Error("Invalid login credentials"), {
      name: "AuthApiError",
      status: 400,
      code: "invalid_credentials",
    });

    expect(normalizeAuthLogError(error)).toMatchObject({
      name: "AuthApiError",
      message: "Invalid login credentials",
      status: 400,
      code: "invalid_credentials",
    });
  });

  it("reads message from plain error objects", () => {
    expect(
      normalizeAuthLogError({
        message: "Network request failed",
        status: 0,
      })
    ).toEqual({
      message: "Network request failed",
      status: 0,
    });
  });

  it("falls back for empty objects", () => {
    expect(normalizeAuthLogError({})).toEqual({
      message: "[object Object]",
    });
  });
});
