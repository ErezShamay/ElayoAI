import { apiFetch } from "@/lib/api/client";
import {
  buildPdfFilename,
  generateVisitReportPdf,
} from "@/lib/field-reports/pdf/generate-visit-report-pdf";
import { loadVisitReportPdfLocally } from "@/lib/field-reports/pdf/visit-report-pdf-store";
import type { VisitReportView } from "@/lib/field-reports/visit-report-view";

export type FinalizeStartResponse = {
  report_id: string;
  finalize_run_id: string;
  status: "FINALIZING";
  message: string;
};

export type FinalizeRunStatus = {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PARTIAL";
  steps_completed: string[];
  steps_failed: string[];
  email_status?: string | null;
  email_sent_at?: string | null;
  materialization?: {
    created_count?: number;
    linked_count?: number;
  } | null;
};

export type FinalizeStatusResponse = {
  report_id: string;
  status: string;
  finalize_run?: FinalizeRunStatus | null;
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

export async function finalizeVisitReport(
  reportId: string,
  pdf: { blob: Blob; filename: string },
  options?: {
    idempotencyKey?: string;
    clientReportUuid?: string;
  }
): Promise<FinalizeStartResponse> {
  const formData = new FormData();
  formData.set("file", pdf.blob, pdf.filename || `${reportId}.pdf`);
  if (options?.clientReportUuid) {
    formData.set("client_report_uuid", options.clientReportUuid);
  }

  const headers: Record<string, string> = {};
  if (options?.idempotencyKey) {
    headers["X-Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await apiFetch(
    `/field-reports/visits/${reportId}/finalize`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      buildApiErrorMessage(payload, "הפעלת עיבוד הדוח נכשלה")
    );
  }

  return response.json();
}

export async function fetchFinalizeStatus(
  reportId: string
): Promise<FinalizeStatusResponse> {
  const response = await apiFetch(
    `/field-reports/visits/${reportId}/finalize-status`
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      buildApiErrorMessage(payload, "טעינת סטטוס עיבוד נכשלה")
    );
  }

  return response.json();
}

export async function resolveFinalizePdfBlob(
  report: VisitReportView,
  inspector?: { full_name?: string | null }
): Promise<{ blob: Blob; filename: string }> {
  const storageKey = report.client_report_uuid || report.id;
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

const FINALIZE_POLL_MS = 800;
const FINALIZE_POLL_MAX_ATTEMPTS = 30;

export async function waitForFinalizeReportStatus(
  reportId: string,
  options?: {
    onPoll?: (status: FinalizeStatusResponse) => void;
  }
): Promise<FinalizeStatusResponse> {
  for (let attempt = 0; attempt < FINALIZE_POLL_MAX_ATTEMPTS; attempt += 1) {
    const status = await fetchFinalizeStatus(reportId);
    options?.onPoll?.(status);

    if (
      status.status === "FINALIZED"
      || status.status === "FINALIZE_FAILED"
    ) {
      return status;
    }

    if (status.finalize_run?.status === "FAILED") {
      return status;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, FINALIZE_POLL_MS);
    });
  }

  throw new Error("תם הזמן המוקצב לעיבוד הדוח — נסה לרענן את העמוד");
}
