"use client";

import Button from "@/components/ui/Button";

type DeleteReportDialogProps = {
  open: boolean;
  reportTitle: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteReportDialog({
  open,
  reportTitle,
  deleting,
  onCancel,
  onConfirm,
}: DeleteReportDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={deleting ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="delete-report-title"
          className="text-lg font-semibold text-red-800 dark:text-red-300"
        >
          מחיקת דוח
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          האם למחוק את הדוח «<strong>{reportTitle}</strong>»?
          פעולה זו בלתי הפיכה. ניתן למחוק רק דוח שלא הופק ממנו PDF ולא עבר
          עיבוד במערכת.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={deleting}
          >
            ביטול
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "מוחק..." : "מחק דוח"}
          </Button>
        </div>
      </div>
    </div>
  );
}
