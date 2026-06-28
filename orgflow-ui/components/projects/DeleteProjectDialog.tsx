"use client";

import Button from "@/components/ui/Button";

type DeleteProjectDialogProps = {
  open: boolean;
  projectName: string;
  confirmValue: string;
  deleting: boolean;
  onConfirmValueChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteProjectDialog({
  open,
  projectName,
  confirmValue,
  deleting,
  onConfirmValueChange,
  onCancel,
  onConfirm,
}: DeleteProjectDialogProps) {
  if (!open) {
    return null;
  }

  const normalizedExpected = projectName.trim();
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
        aria-labelledby="delete-project-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="delete-project-title"
          className="text-lg font-semibold text-red-800 dark:text-red-300"
        >
          האם אתה בטוח שברצונך למחוק את הפרויקט?
        </h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          פעולה זו בלתי הפיכה. המחיקה כוללת מחיקה של כל הנתונים הקשורים
          לפרויקט — ליקויים, דוחות שטח, דוחות שבועיים, מסמכים, פעולות
          תפעוליות וכל שאר המידע השמור בפרויקט.
        </p>

        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          שם הפרויקט במערכת:
          <span className="mx-1 font-semibold text-zinc-900 dark:text-zinc-100">
            {projectName}
          </span>
        </p>

        <div>
          <label
            htmlFor="delete-project-confirm"
            className="mb-2 block text-sm font-medium"
          >
            הקלד את שם הפרויקט לאישור:
          </label>
          <input
            id="delete-project-confirm"
            type="text"
            value={confirmValue}
            onChange={(event) =>
              onConfirmValueChange(event.target.value)
            }
            autoComplete="off"
            disabled={deleting}
            className="of-input of-focus-ring w-full text-sm"
            placeholder={projectName}
          />
          {confirmValue.trim() && !nameMatches ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              השם שהוקלד אינו תואם לשם הפרויקט במערכת.
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
            לא
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={deleting || !nameMatches}
            onClick={onConfirm}
          >
            {deleting ? "מוחק..." : "כן, מחק לצמיתות"}
          </Button>
        </div>
      </div>
    </div>
  );
}
