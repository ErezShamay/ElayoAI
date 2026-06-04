import { describe, expect, it } from "vitest";

import config from "../../../capacitor.config";

describe("capacitor.config (FR-029 / FR-030)", () => {
  it("defines ElayoAI app id and webDir out", () => {
    expect(config.appId).toBe("com.elayoai.app");
    expect(config.appName).toBe("ElayoAI");
    expect(config.webDir).toBe("out");
  });
});
