"use client";

import Button from "@/components/ui/Button";

type CancelReportCreationDialogProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirming?: boolean;
  onStay: () => void;
  onConfirmCancel: () => void;
};

export default function CancelReportCreationDialog({
  open,
  title = "ביטול יצירת דוח",
  message = "האם אתה בטוח שברצונך לבטול? כל הנתונים שמילאת יימחקו.",
  confirming = false,
  onStay,
  onConfirmCancel,
}: CancelReportCreationDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onStay}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-report-creation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cancel-report-creation-title" className="text-lg font-semibold">
          {title}
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {message}
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onStay} disabled={confirming}>
            לא, המשך עריכה
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirmCancel}
            disabled={confirming}
          >
            {confirming ? "מבטל..." : "כן, בטל"}
          </Button>
        </div>
      </div>
    </div>
  );
}
