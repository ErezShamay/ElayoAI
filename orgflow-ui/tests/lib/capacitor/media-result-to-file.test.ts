import { afterEach, describe, expect, it, vi } from "vitest";

import { linePhotoMediaResultToFile } from "@/lib/capacitor/media-result-to-file";

describe("linePhotoMediaResultToFile (FR-031)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts webPath fetch to File with jpeg extension", async () => {
    const blob = new Blob(["pixels"], { type: "image/jpeg" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(blob, { status: 200 }))
    );

    const file = await linePhotoMediaResultToFile(
      { webPath: "capacitor://localhost/photo.jpg", metadata: { format: "jpeg" } },
      { defaultBaseName: "line-photo-1" }
    );

    expect(file.name).toBe("line-photo-1.jpg");
    expect(file.type).toBe("image/jpeg");
    expect(file.size).toBe(blob.size);
  });

  it("throws when webPath is missing", async () => {
    await expect(linePhotoMediaResultToFile({})).rejects.toThrow(
      "לא התקבלה תמונה"
    );
  });
});
