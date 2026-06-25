import { apiFetch } from "@/lib/api/client";

export type ReportDeleteEligibility = {
  deletable: boolean;
  reason_code?: string | null;
  reason_he?: string | null;
  blocking_issue_count?: number;
};

type ApiErrorPayload = {
  error?: {
    message?: string;
    details?: {
      error_code?: string;
      reason_he?: string;
    };
  };
  message?: string;
  detail?: string;
};

function parseApiErrorMessage(
  payload: ApiErrorPayload,
  fallback: string
): string {
  return (
    payload.error?.details?.reason_he
    || payload.error?.message
    || payload.message
    || payload.detail
    || fallback
  );
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchFieldVisitReportDeleteEligibility(
  reportId: string
): Promise<ReportDeleteEligibility> {
  const response = await apiFetch(
    `/field-reports/visits/${encodeURIComponent(reportId)}/delete-eligibility`
  );

  if (!response.ok) {
    const payload = await readJson<ApiErrorPayload>(response);
    throw new Error(
      parseApiErrorMessage(payload, "לא ניתן לבדוק אם ניתן למחוק את הדוח")
    );
  }

  return readJson<ReportDeleteEligibility>(response);
}

export async function deleteFieldVisitReport(reportId: string): Promise<void> {
  const response = await apiFetch(
    `/field-reports/visits/${encodeURIComponent(reportId)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const payload = await readJson<ApiErrorPayload>(response);
    throw new Error(parseApiErrorMessage(payload, "מחיקת הדוח נכשלה"));
  }
}

export async function fetchWeeklyReportDeleteEligibility(
  projectId: string,
  reportId: string
): Promise<ReportDeleteEligibility> {
  const response = await apiFetch(
    `/projects/${encodeURIComponent(projectId)}/reports/${encodeURIComponent(reportId)}/delete-eligibility`
  );

  if (!response.ok) {
    const payload = await readJson<ApiErrorPayload>(response);
    throw new Error(
      parseApiErrorMessage(payload, "לא ניתן לבדוק אם ניתן למחוק את הדוח")
    );
  }

  return readJson<ReportDeleteEligibility>(response);
}

export async function deleteWeeklyReport(
  projectId: string,
  reportId: string
): Promise<void> {
  const response = await apiFetch(
    `/projects/${encodeURIComponent(projectId)}/reports/${encodeURIComponent(reportId)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const payload = await readJson<ApiErrorPayload>(response);
    throw new Error(parseApiErrorMessage(payload, "מחיקת הדוח נכשלה"));
  }
}
