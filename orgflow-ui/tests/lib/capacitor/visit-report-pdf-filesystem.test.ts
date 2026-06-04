import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => "web"),
    convertFileSrc: vi.fn((uri: string) => `converted:${uri}`),
  },
}));

const writeFile = vi.fn();
const readFile = vi.fn();
const getUri = vi.fn();
const rmdir = vi.fn();

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Encoding: { UTF8: "utf8" },
  Filesystem: {
    writeFile,
    readFile,
    getUri,
    rmdir,
  },
}));

const REPORT_ID = "a1111111-1111-4111-8111-111111111111";

describe("visit-report-pdf-filesystem (FR-032)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writeFile.mockResolvedValue({ uri: "file:///data/report.pdf" });
    getUri.mockResolvedValue({ uri: "file:///data/report.pdf" });
    vi.stubGlobal("window", {
      open: vi.fn(() => ({}) as Window),
    });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  it("sanitizeVisitReportPdfFilename ensures .pdf suffix", async () => {
    const { sanitizeVisitReportPdfFilename } = await import(
      "@/lib/capacitor/visit-report-pdf-filesystem"
    );

    expect(sanitizeVisitReportPdfFilename("דוח")).toMatch(/\.pdf$/);
    expect(sanitizeVisitReportPdfFilename("visit.pdf")).toBe("visit.pdf");
  });

  it("syncVisitReportPdfToFilesystem writes data and meta on native", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const { syncVisitReportPdfToFilesystem } = await import(
      "@/lib/capacitor/visit-report-pdf-filesystem"
    );

    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    await syncVisitReportPdfToFilesystem(REPORT_ID, blob, "visit.pdf");

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile.mock.calls[0][0]).toMatchObject({
      path: `field-reports/pdfs/${REPORT_ID}/report.pdf`,
      directory: "DATA",
    });
  });

  it("openVisitReportPdfOnNative opens converted file URI", async () => {
    const { Capacitor } = await import("@capacitor/core");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const open = vi.fn(() => ({}));
    vi.stubGlobal("window", { open });

    const { openVisitReportPdfOnNative } = await import(
      "@/lib/capacitor/visit-report-pdf-filesystem"
    );

    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    const opened = await openVisitReportPdfOnNative(
      REPORT_ID,
      blob,
      "visit.pdf"
    );

    expect(opened).toBe(true);
    expect(open).toHaveBeenCalledWith(
      "converted:file:///data/report.pdf",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("loadVisitReportPdfFromFilesystem returns null on web", async () => {
    const { loadVisitReportPdfFromFilesystem } = await import(
      "@/lib/capacitor/visit-report-pdf-filesystem"
    );

    await expect(loadVisitReportPdfFromFilesystem(REPORT_ID)).resolves.toBeNull();
    expect(readFile).not.toHaveBeenCalled();
  });
});
