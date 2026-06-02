"use client";

import { FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
import LinePhotoCapture from "@/components/field-reports/LinePhotoCapture";

export type EditableReportLine = {
  id: string;
  location?: string | null;
  trade?: string | null;
  status?: string | null;
  description?: string | null;
  notes?: string | null;
  severity?: string | null;
  standard_ref?: string | null;
  issue_id?: string | null;
  has_catalog_issue?: boolean;
  has_photo?: boolean;
  photo_url?: string | null;
  catalog_warning?: string | null;
};

const LINE_STATUS_OPTIONS = [
  { value: "", label: "—" },
  { value: "IN_PROGRESS", label: "בתהליך" },
  { value: "DONE", label: "בוצע" },
  { value: "NEEDS_ACTION", label: "יש להשלים" },
];

type ReportLineEditorProps = {
  reportId: string;
  line: EditableReportLine;
  editable: boolean;
  saving: boolean;
  onSave: (lineId: string, payload: Record<string, unknown>) => Promise<void>;
  onConvertToFreeText: (lineId: string) => Promise<void>;
  onDelete: (lineId: string) => Promise<void>;
  onPhotoChange: (lineId: string, hasPhoto: boolean) => void;
};

export default function ReportLineEditor({
  reportId,
  line,
  editable,
  saving,
  onSave,
  onConvertToFreeText,
  onDelete,
  onPhotoChange,
}: ReportLineEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(() => lineToDraft(line));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.description.trim()) {
      return;
    }

    await onSave(line.id, {
      location: draft.location || null,
      trade: draft.trade || null,
      status: draft.status || null,
      description: draft.description,
      notes: draft.notes || null,
      severity: line.has_catalog_issue ? undefined : draft.severity || null,
    });
    setExpanded(false);
  }

  return (
    <li className="rounded-xl border border-zinc-200 p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {line.trade || "ללא מלאכה"}
            {line.location ? ` · ${line.location}` : ""}
          </p>
          {line.issue_id ? (
            <p className="text-xs text-zinc-500">
              {line.issue_id}
              {line.standard_ref ? ` · תקן: ${line.standard_ref}` : ""}
              {line.severity ? ` · חומרה: ${line.severity}` : ""}
            </p>
          ) : (
            <p className="text-xs text-zinc-500">תיאור חופשי</p>
          )}
          {line.catalog_warning ? (
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
              {line.catalog_warning}
            </p>
          ) : null}
        </div>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => {
                setDraft(lineToDraft(line));
                setExpanded((current) => !current);
              }}
            >
              {expanded ? "סגור" : "ערוך"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => void onDelete(line.id)}
            >
              מחק
            </Button>
          </div>
        ) : null}
      </div>

      {!expanded ? (
        <>
          <p className="mt-2 whitespace-pre-wrap">
            {line.description || "—"}
          </p>
          {line.notes ? (
            <p className="mt-1 text-zinc-600">הערות: {line.notes}</p>
          ) : null}
        </>
      ) : (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-3 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="מיקום"
              value={draft.location}
              onChange={(value) =>
                setDraft((current) => ({ ...current, location: value }))
              }
            />
            <Field
              label="מלאכה"
              value={draft.trade}
              onChange={(value) =>
                setDraft((current) => ({ ...current, trade: value }))
              }
            />
            <label className="block space-y-1 text-sm">
              <span>סטטוס</span>
              <select
                className="of-input w-full"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                {LINE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {!line.has_catalog_issue ? (
              <Field
                label="חומרה"
                value={draft.severity}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    severity: value,
                  }))
                }
              />
            ) : null}
          </div>
          <label className="block space-y-1 text-sm">
            <span>תיאור *</span>
            <textarea
              className="of-input min-h-24 w-full"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>הערות / פעולת תיקון</span>
            <textarea
              className="of-input min-h-20 w-full"
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          {line.has_catalog_issue ? (
            <Button
              variant="secondary"
              type="button"
              disabled={saving}
              onClick={() => void onConvertToFreeText(line.id)}
            >
              המר לתיאור חופשי (בלי ממצא במפרט)
            </Button>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? "שומר..." : "שמור שורה"}
          </Button>
        </form>
      )}

      <LinePhotoCapture
        reportId={reportId}
        lineId={line.id}
        hasServerPhoto={Boolean(line.has_photo)}
        photoUrl={line.photo_url}
        disabled={!editable}
        onPhotoChange={(hasPhoto) => onPhotoChange(line.id, hasPhoto)}
      />
    </li>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      <input
        className="of-input w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function lineToDraft(line: EditableReportLine) {
  return {
    location: line.location || "",
    trade: line.trade || "",
    status: line.status || "",
    description: line.description || "",
    notes: line.notes || "",
    severity: line.severity || "",
  };
}
