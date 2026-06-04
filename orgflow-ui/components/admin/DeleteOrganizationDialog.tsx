"use client";

import Button from "@/components/ui/Button";

type DeleteOrganizationDialogProps = {
  open: boolean;
  organizationLabel: string;
  confirmName: string;
  confirmValue: string;
  deleting: boolean;
  onConfirmValueChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteOrganizationDialog({
  open,
  organizationLabel,
  confirmName,
  confirmValue,
  deleting,
  onConfirmValueChange,
  onCancel,
  onConfirm,
}: DeleteOrganizationDialogProps) {
  if (!open) {
    return null;
  }

  const normalizedExpected = confirmName.trim();
  const normalizedTyped = confirmValue.trim();
  const nameMatches =
    normalizedExpected.length > 0
    && normalizedTyped === normalizedExpected;

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
        aria-labelledby="delete-organization-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="delete-organization-title"
          className="text-lg font-semibold text-red-800 dark:text-red-300"
        >
          מחיקת לקוח לצמיתות
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          פעולה זו בלתי הפיכה. כל המשתמשים, הפרויקטים, הדוחות והנתונים
          של הלקוח <strong>{organizationLabel}</strong> יימחקו מהמערכת.
        </p>

        <div>
          <label
            htmlFor="delete-organization-confirm"
            className="mb-2 block text-sm font-medium"
          >
            הקלד את שם הלקוח לאישור:
            <span className="mx-1 font-semibold text-zinc-900 dark:text-zinc-100">
              {confirmName}
            </span>
          </label>
          <input
            id="delete-organization-confirm"
            type="text"
            value={confirmValue}
            onChange={(event) =>
              onConfirmValueChange(event.target.value)
            }
            autoComplete="off"
            disabled={deleting}
            className="of-input of-focus-ring w-full text-sm"
            placeholder={confirmName}
          />
          {confirmValue.trim() && !nameMatches ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              השם שהוקלד אינו תואם לשם הלקוח.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            disabled={deleting}
            onClick={onCancel}
          >
            ביטול
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={deleting || !nameMatches}
            onClick={onConfirm}
          >
            {deleting ? "מוחק..." : "מחק לקוח לצמיתות"}
          </Button>
        </div>
      </div>
    </div>
  );
}
