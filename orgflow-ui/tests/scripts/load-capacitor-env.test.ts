import { describe, expect, it } from "vitest";

import {
  applyEnvValues,
  parseEnvFile,
} from "../../scripts/load-capacitor-env.mjs";

describe("load-capacitor-env (FR-034)", () => {
  it("parseEnvFile ignores comments and quotes", () => {
    const parsed = parseEnvFile(`
# comment
NEXT_PUBLIC_API_URL="https://api.test"
ORGFLOW_ANDROID_VERSION_CODE=2
`);

    expect(parsed).toEqual({
      NEXT_PUBLIC_API_URL: "https://api.test",
      ORGFLOW_ANDROID_VERSION_CODE: "2",
    });
  });

  it("applyEnvValues does not override by default", () => {
    const previous = process.env.FR034_TEST_KEY;
    process.env.FR034_TEST_KEY = "existing";

    applyEnvValues({ FR034_TEST_KEY: "new" });
    expect(process.env.FR034_TEST_KEY).toBe("existing");

    applyEnvValues({ FR034_TEST_KEY: "new" }, { override: true });
    expect(process.env.FR034_TEST_KEY).toBe("new");

    if (previous === undefined) {
      delete process.env.FR034_TEST_KEY;
    } else {
      process.env.FR034_TEST_KEY = previous;
    }
  });
});
