"use client";

import Button from "@/components/ui/Button";
import { PUBLISH_REPORT_CTA_LABEL } from "@/lib/field-reports/publish-access";
import type { PublishPreview } from "@/lib/field-reports/publish-api";

type PublishReportDialogProps = {
  open: boolean;
  loading: boolean;
  preview: PublishPreview | null;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function PublishReportDialog({
  open,
  loading,
  preview,
  error,
  onCancel,
  onConfirm,
}: PublishReportDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="publish-report-title" className="text-lg font-semibold">
          {PUBLISH_REPORT_CTA_LABEL}
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          הדוח יפורסם לפורטל הרוכש, ייווצר רישום ליקויים, וה-PDF יישמר
          בארכיון המסירות.
        </p>

        {preview ? (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">שורות בדוח</dt>
              <dd>{preview.line_count}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">שורות שייכנסו לרישום הליקויים</dt>
              <dd>{preview.materializable_line_count}</dd>
            </div>
            {preview.already_published ? (
              <p className="text-amber-700 dark:text-amber-300">
                הדוח כבר פורסם — פרסום חוזר יעדכן את רישום הליקויים בלבד.
              </p>
            ) : null}
            {preview.warnings.length ? (
              <ul className="list-disc space-y-1 pr-5 text-amber-800 dark:text-amber-200">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">טוען תצוגה מקדימה...</p>
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            ביטול
          </Button>
          <Button onClick={onConfirm} disabled={loading || !preview}>
            {loading ? "מפרסם..." : PUBLISH_REPORT_CTA_LABEL}
          </Button>
        </div>
      </div>
    </div>
  );
}
