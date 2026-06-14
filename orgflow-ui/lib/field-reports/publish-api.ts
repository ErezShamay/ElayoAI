import { apiFetch } from "@/lib/api/client";
import {
  buildPdfFilename,
  generateVisitReportPdf,
} from "@/lib/field-reports/pdf/generate-visit-report-pdf";
import {
  clientVisitReportUuid,
  type VisitReportView,
} from "@/lib/field-reports/visit-report-view";
import { loadVisitReportPdfLocally } from "@/lib/field-reports/pdf/visit-report-pdf-store";
import type { ClosePreview } from "@/lib/field-reports/close-preview";

export type PublishPreview = {
  line_count: number;
  draft_line_count: number;
  published_line_count: number;
  materializable_line_count: number;
  already_published: boolean;
  warnings: string[];
  close_preview: ClosePreview;
};

export type PublishMaterializationResult = {
  created_count: number;
  linked_count: number;
  skipped_count: number;
};

export type PublishResult = {
  published_line_count: number;
  issue_materialization: PublishMaterializationResult;
  pdf_archived: boolean;
  warnings?: string[];
};

export type PublishedVisitReport = {
  id: string;
  is_published?: boolean;
  can_publish?: boolean;
  pending_publish?: boolean;
  publish_result?: PublishResult;
};

function buildApiErrorMessage(payload: unknown, fallback: string): string {
  const apiPayload = (payload || {}) as {
    error?: { message?: string };
    message?: string;
    detail?: string;
  };
  return (
    apiPayload.error?.message
    || apiPayload.message
    || apiPayload.detail
    || fallback
  );
}

export async function fetchPublishPreview(
  reportId: string
): Promise<PublishPreview> {
  const response = await apiFetch(
    `/field-reports/visits/${reportId}/publish-preview`
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      buildApiErrorMessage(payload, "טעינת תצוגה מקדימה לפרסום נכשלה")
    );
  }

  return response.json();
}

export async function publishVisitReport(
  reportId: string,
  pdf?: { blob: Blob; filename: string }
): Promise<PublishedVisitReport> {
  const formData = new FormData();
  if (pdf) {
    formData.set("file", pdf.blob, pdf.filename || `${reportId}.pdf`);
  }

  const response = await apiFetch(
    `/field-reports/visits/${reportId}/publish`,
    {
      method: "POST",
      body: pdf ? formData : undefined,
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      buildApiErrorMessage(payload, "פרסום הדוח לפורטל נכשל")
    );
  }

  return response.json();
}

export async function resolvePublishPdfBlob(
  report: VisitReportView,
  inspector?: { full_name?: string | null }
): Promise<{ blob: Blob; filename: string }> {
  const storageKey = clientVisitReportUuid(report);
  const cached = await loadVisitReportPdfLocally(storageKey);
  if (cached?.blob) {
    return {
      blob: cached.blob,
      filename: cached.filename || buildPdfFilename(report),
    };
  }

  const blob = await generateVisitReportPdf({
    report,
    inspector,
  });
  return {
    blob,
    filename: buildPdfFilename(report),
  };
}
