import { describe, expect, it } from "vitest";

import {
  capacitorUsesHttpApi,
  resolveCapacitorConfig,
} from "@/lib/capacitor/resolve-capacitor-config";

describe("resolveCapacitorConfig", () => {
  it("enables cleartext WebView when API URL is http", () => {
    const config = resolveCapacitorConfig({
      NEXT_PUBLIC_API_URL: "http://192.168.1.10:8000",
    });

    expect(config.android?.allowMixedContent).toBe(true);
    expect(config.server?.androidScheme).toBe("http");
  });

  it("keeps https scheme when API URL is https", () => {
    const config = resolveCapacitorConfig({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
    });

    expect(config.android?.allowMixedContent).toBe(false);
    expect(config.server?.androidScheme).toBe("https");
  });

  it("respects ORGFLOW_CAPACITOR_ALLOW_CLEARTEXT", () => {
    expect(
      capacitorUsesHttpApi({
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        ORGFLOW_CAPACITOR_ALLOW_CLEARTEXT: "1",
      })
    ).toBe(true);
  });
});
