import { describe, expect, it } from "vitest";

import {
  base64ToPdfBlob,
  blobToBase64,
} from "@/lib/capacitor/blob-encoding";

describe("blob-encoding (FR-032)", () => {
  it("round-trips PDF bytes through base64", async () => {
    const original = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    const base64 = await blobToBase64(original);
    const restored = base64ToPdfBlob(base64);

    expect(await restored.text()).toBe("%PDF-1.4 test");
    expect(restored.type).toBe("application/pdf");
  });
});
