import {
  buildPdfFilename,
  buildVisitReportDocDefinition,
} from "./build-doc-definition";
import { createPdfPrinter } from "./font-loader";
import { resolveLinePhotos, resolveLogoDataUrl } from "./resolve-assets";
import type { VisitReportPdfInput } from "./types";
import {
  loadVisitReportPdfLocally,
  saveVisitReportPdfLocally,
} from "./visit-report-pdf-store";

export type VisitReportPdfDownloadSource = "cache" | "generated";

export async function generateVisitReportPdf(
  input: VisitReportPdfInput
): Promise<Blob> {
  const pdfMake = await createPdfPrinter();
  const logoDataUrl = await resolveLogoDataUrl(
    input.logoDataUrl
      ?? input.report.organization_profile_snapshot?.logo_url
  );
  const linePhotos =
    input.linePhotos
    ?? (await resolveLinePhotos(input.report.id, input.report.lines));

  const docDefinition = buildVisitReportDocDefinition({
    ...input,
    logoDataUrl,
    linePhotos,
  });

  return new Promise((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(docDefinition);
      pdf.getBlob((blob: Blob) => {
        resolve(blob);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function triggerVisitReportPdfDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function downloadVisitReportPdf(
  input: VisitReportPdfInput,
  options?: { forceRegenerate?: boolean }
): Promise<VisitReportPdfDownloadSource> {
  const filename = buildPdfFilename(input.report);

  if (!options?.forceRegenerate) {
    const cached = await loadVisitReportPdfLocally(input.report.id);
    if (cached?.blob) {
      triggerVisitReportPdfDownload(
        cached.blob,
        cached.filename || filename
      );
      return "cache";
    }
  }

  const blob = await generateVisitReportPdf(input);
  await saveVisitReportPdfLocally(
    input.report.id,
    blob,
    filename,
    input.generatedAt ?? new Date()
  );
  triggerVisitReportPdfDownload(blob, filename);
  return "generated";
}

export { buildPdfFilename, buildVisitReportDocDefinition };
