import { describe, expect, it } from "vitest";

import {
  capacitorStaticExportParams,
  getCapacitorBuildMode,
  getCapacitorServerUrl,
  isCapacitorStaticExportBuild,
  parseCapacitorBuildMode,
} from "@/lib/capacitor/build-mode";
import { resolveCapacitorConfig } from "@/lib/capacitor/resolve-capacitor-config";

describe("capacitor build-mode (FR-030)", () => {
  it("defaults to static (Build B)", () => {
    expect(parseCapacitorBuildMode(undefined)).toBe("static");
    expect(getCapacitorBuildMode({})).toBe("static");
    expect(isCapacitorStaticExportBuild({})).toBe(true);
  });

  it("parses url / A aliases", () => {
    expect(parseCapacitorBuildMode("url")).toBe("url");
    expect(parseCapacitorBuildMode("A")).toBe("url");
    expect(parseCapacitorBuildMode("webview")).toBe("url");
    expect(isCapacitorStaticExportBuild({
      ORGFLOW_CAPACITOR_BUILD_MODE: "url",
    })).toBe(false);
  });

  it("capacitorStaticExportParams returns placeholder id", () => {
    expect(capacitorStaticExportParams()).toEqual([{ id: "_" }]);
  });

  it("resolveCapacitorConfig static has no server.url", () => {
    const config = resolveCapacitorConfig({
      ORGFLOW_CAPACITOR_BUILD_MODE: "static",
    });
    expect(config.webDir).toBe("out");
    expect(config.server?.url).toBeUndefined();
  });

  it("resolveCapacitorConfig url sets server.url", () => {
    const config = resolveCapacitorConfig({
      ORGFLOW_CAPACITOR_BUILD_MODE: "url",
      ORGFLOW_CAPACITOR_SERVER_URL: "https://staging.example.com",
    });
    expect(config.server?.url).toBe("https://staging.example.com");
    expect(getCapacitorServerUrl({
      ORGFLOW_CAPACITOR_SERVER_URL: "https://staging.example.com",
    })).toBe("https://staging.example.com");
  });
});
