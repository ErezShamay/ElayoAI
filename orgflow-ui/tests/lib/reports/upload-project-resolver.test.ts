import { describe, expect, it } from "vitest";

import { buildCreateProjectHref } from "@/lib/reports/upload-project-resolver";

describe("upload-project-resolver", () => {
  it("builds create project href with prefilled name", () => {
    expect(buildCreateProjectHref("שכונת הדקלים")).toBe(
      "/projects?create=1&project_name=%D7%A9%D7%9B%D7%95%D7%A0%D7%AA+%D7%94%D7%93%D7%A7%D7%9C%D7%99%D7%9D"
    );
  });
});
