"use client";

import { FR_TOUCH_LIST_BUTTON } from "@/lib/field-reports/touch-input-class";
import {
  DOCUMENT_WIZARD_DESCRIPTIONS,
  DOCUMENT_WIZARD_KINDS,
  DOCUMENT_WIZARD_LABELS,
  type DocumentWizardKind,
  documentWizardKindEnabled,
} from "@/lib/field-reports/document-wizard";

type DocumentKindPickerProps = {
  value: DocumentWizardKind | null;
  onChange: (value: DocumentWizardKind) => void;
};

export default function DocumentKindPicker({
  value,
  onChange,
}: DocumentKindPickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">סוג מסמך</legend>
      <div className="space-y-2">
        {DOCUMENT_WIZARD_KINDS.map((kind) => {
          const selected = value === kind;
          const enabled = documentWizardKindEnabled(kind);

          return (
            <button
              key={kind}
              type="button"
              disabled={!enabled}
              className={`${FR_TOUCH_LIST_BUTTON} ${
                !enabled
                  ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 opacity-80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
                  : selected
                    ? "border-brand bg-brand/5 text-brand dark:border-brand-light dark:text-brand-light"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              }`}
              aria-pressed={selected}
              aria-disabled={!enabled}
              onClick={() => {
                if (enabled) {
                  onChange(kind);
                }
              }}
            >
              <span className="block font-medium">
                {DOCUMENT_WIZARD_LABELS[kind]}
                {!enabled ? " (בקרוב)" : ""}
              </span>
              <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                {DOCUMENT_WIZARD_DESCRIPTIONS[kind]}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
