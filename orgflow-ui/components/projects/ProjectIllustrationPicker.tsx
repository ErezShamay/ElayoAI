"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import { showToast } from "@/lib/ui/toast";

export const DEFAULT_ILLUSTRATION_SOURCE_HE =
  "התמונה נלקחה מאתר מדלן";

type ProjectIllustrationPickerProps = {
  file: File | null;
  sourceHe: string;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
  onSourceHeChange: (value: string) => void;
};

export default function ProjectIllustrationPicker({
  file,
  sourceHe,
  disabled = false,
  onFileChange,
  onSourceHeChange,
}: ProjectIllustrationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  function handleFileSelected(selected: File | null) {
    if (!selected) {
      onFileChange(null);
      return;
    }

    if (!selected.type.startsWith("image/")) {
      showToast("יש להעלות קובץ תמונה בלבד", "error");
      return;
    }

    onFileChange(selected);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 dark:border-zinc-700/80 dark:bg-zinc-900/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">הדמיית הפרויקט</h3>
          <p className="mt-1 text-sm text-zinc-500">
            שדה אופציונלי — תמונה אחת לפרויקט, מופיעה בדוח השטח בעמוד ההדמיה.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(event) =>
            handleFileSelected(event.target.files?.[0] ?? null)
          }
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {file ? "החלף תמונה" : "בחר תמונה"}
          </Button>
          {file ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
            >
              הסר תמונה
            </Button>
          ) : null}
        </div>
      </div>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="תצוגה מקדימה של הדמיית הפרויקט"
          className="max-h-80 w-full rounded-xl border border-zinc-200 bg-white object-contain dark:border-zinc-700 dark:bg-zinc-900"
        />
      ) : (
        <p className="text-sm text-zinc-500">
          ניתן להעלות תמונת הדמיה עכשיו או להוסיף אותה מאוחר יותר בהגדרות הפרויקט.
        </p>
      )}

      <label className="block space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          כיתוב מקור התמונה (מופיע בדוח PDF)
        </span>
        <input
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900/50"
          value={sourceHe}
          onChange={(event) => onSourceHeChange(event.target.value)}
          placeholder={DEFAULT_ILLUSTRATION_SOURCE_HE}
          disabled={disabled}
        />
      </label>
    </section>
  );
}
