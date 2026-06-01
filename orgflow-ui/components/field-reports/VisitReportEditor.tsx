"use client";

import { FormEvent, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import { useOffline } from "@/providers/OfflineProvider";

type ReportLine = {
  id: string;
  sort_order: number;
  location?: string | null;
  trade?: string | null;
  status?: string | null;
  description?: string | null;
  notes?: string | null;
  severity?: string | null;
  standard_ref?: string | null;
  issue_id?: string | null;
  has_catalog_issue?: boolean;
};

type VisitReport = {
  id: string;
  project_name?: string;
  visit_type: string;
  visit_type_label_he: string;
  status_label_he: string;
  status: string;
  visit_date: string;
  header_fields: Record<string, unknown>;
  catalog_version?: string | null;
  lines: ReportLine[];
  is_editable: boolean;
};

type CatalogIssue = {
  issue_id: string;
  issue_name_he: string;
  standard_ref?: string | null;
  top_family: string;
  category_name_he: string;
};

const LINE_STATUS_OPTIONS = [
  { value: "", label: "—" },
  { value: "IN_PROGRESS", label: "בתהליך" },
  { value: "DONE", label: "בוצע" },
  { value: "NEEDS_ACTION", label: "יש להשלים" },
];

type VisitReportEditorProps = {
  report: VisitReport;
  onReportChange: (report: VisitReport) => void;
};

export default function VisitReportEditor({
  report,
  onReportChange,
}: VisitReportEditorProps) {
  const { isOnline } = useOffline();
  const [saving, setSaving] = useState(false);
  const [lineSaving, setLineSaving] = useState(false);
  const [error, setError] = useState("");
  const [headerFields, setHeaderFields] = useState(
    () => normalizeHeaderFields(report.header_fields)
  );
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogIssues, setCatalogIssues] = useState<CatalogIssue[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [newLine, setNewLine] = useState({
    location: "",
    trade: "",
    status: "",
    description: "",
    notes: "",
  });

  async function saveHeaderFields() {
    if (!report.is_editable) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await apiFetch(
        `/field-reports/visits/${report.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ header_fields: headerFields }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error?.message
            || payload.message
            || "שמירת פרטי הדוח נכשלה"
        );
      }

      onReportChange(await response.json());
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "שמירת פרטי הדוח נכשלה"
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadCatalog() {
    try {
      setCatalogLoading(true);
      const response = await apiFetch(
        `/field-reports/catalog?visit_type=${encodeURIComponent(report.visit_type)}`
      );

      if (!response.ok) {
        throw new Error("טעינת המפרט נכשלה");
      }

      const payload = await response.json();
      setCatalogIssues(payload.issues || []);
      setCatalogOpen(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "טעינת המפרט נכשלה"
      );
    } finally {
      setCatalogLoading(false);
    }
  }

  const filteredCatalogIssues = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    if (!query) {
      return catalogIssues.slice(0, 40);
    }

    return catalogIssues
      .filter((issue) => {
        const haystack = [
          issue.issue_id,
          issue.issue_name_he,
          issue.category_name_he,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 40);
  }, [catalogIssues, catalogSearch]);

  async function addFreeLine(event: FormEvent) {
    event.preventDefault();

    if (!report.is_editable) {
      return;
    }

    if (!newLine.description.trim()) {
      setError("יש למלא תיאור לשורה");
      return;
    }

    try {
      setLineSaving(true);
      setError("");

      const response = await apiFetch(
        `/field-reports/visits/${report.id}/lines`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: newLine.location || null,
            trade: newLine.trade || null,
            status: newLine.status || null,
            description: newLine.description,
            notes: newLine.notes || null,
          }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error?.message
            || payload.message
            || "הוספת שורה נכשלה"
        );
      }

      const createdLine = await response.json();
      onReportChange({
        ...report,
        lines: [...report.lines, createdLine],
        line_count: report.lines.length + 1,
      });
      setNewLine({
        location: "",
        trade: "",
        status: "",
        description: "",
        notes: "",
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "הוספת שורה נכשלה"
      );
    } finally {
      setLineSaving(false);
    }
  }

  async function addCatalogLine(issue: CatalogIssue) {
    if (!report.is_editable) {
      return;
    }

    try {
      setLineSaving(true);
      setError("");

      const response = await apiFetch(
        `/field-reports/visits/${report.id}/lines`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issue_id: issue.issue_id }),
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error?.message
            || payload.message
            || "הוספת ממצא מהמפרט נכשלה"
        );
      }

      const createdLine = await response.json();
      onReportChange({
        ...report,
        lines: [...report.lines, createdLine],
      });
      setCatalogOpen(false);
      setCatalogSearch("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "הוספת ממצא מהמפרט נכשלה"
      );
    } finally {
      setLineSaving(false);
    }
  }

  async function deleteLine(lineId: string) {
    if (!report.is_editable) {
      return;
    }

    try {
      setLineSaving(true);
      setError("");

      const response = await apiFetch(
        `/field-reports/visits/${report.id}/lines/${lineId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload.error?.message
            || payload.message
            || "מחיקת שורה נכשלה"
        );
      }

      onReportChange({
        ...report,
        lines: report.lines.filter((line) => line.id !== lineId),
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "מחיקת שורה נכשלה"
      );
    } finally {
      setLineSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
        <Badge>{report.status_label_he}</Badge>
        {!isOnline ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
            לא מקוון — שינויים יישמרו כשתחזור רשת
          </span>
        ) : (
          <span className="text-zinc-500">מחובר</span>
        )}
        {report.catalog_version ? (
          <span>קטלוג: {report.catalog_version}</span>
        ) : null}
      </div>

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4">
        <h2 className="text-lg font-semibold">פרטי כותרת הדוח</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <HeaderField
            label="כתובת אתר"
            value={headerFields.site_address}
            disabled={!report.is_editable}
            onChange={(value) =>
              setHeaderFields((current) => ({
                ...current,
                site_address: value,
              }))
            }
          />
          <HeaderField
            label="יזם"
            value={headerFields.developer_name}
            disabled={!report.is_editable}
            onChange={(value) =>
              setHeaderFields((current) => ({
                ...current,
                developer_name: value,
              }))
            }
          />
          <HeaderField
            label="מנהל פרויקט מטעם יזם"
            value={headerFields.developer_pm_name}
            disabled={!report.is_editable}
            onChange={(value) =>
              setHeaderFields((current) => ({
                ...current,
                developer_pm_name: value,
              }))
            }
          />
          <HeaderField
            label="עו״ד ב״כ דיירים"
            value={headerFields.lawyer_name}
            disabled={!report.is_editable}
            onChange={(value) =>
              setHeaderFields((current) => ({
                ...current,
                lawyer_name: value,
              }))
            }
          />
          <HeaderField
            label="עו״ד מלווה"
            value={headerFields.accompanying_lawyer}
            disabled={!report.is_editable}
            onChange={(value) =>
              setHeaderFields((current) => ({
                ...current,
                accompanying_lawyer: value,
              }))
            }
          />
        </div>
        {report.is_editable ? (
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => void saveHeaderFields()}
          >
            {saving ? "שומר..." : "שמור פרטי כותרת"}
          </Button>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            שורות ממצאים ({report.lines.length})
          </h2>
          {report.is_editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={catalogLoading || lineSaving}
                onClick={() => void loadCatalog()}
              >
                {catalogLoading ? "טוען מפרט..." : "בחר ממצא מהמפרט"}
              </Button>
            </div>
          ) : null}
        </div>

        {catalogOpen ? (
          <div className="space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">בחירת ממצא מהמפרט</h3>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setCatalogOpen(false)}
              >
                סגור
              </Button>
            </div>
            <input
              className="of-input w-full"
              placeholder="חיפוש לפי מזהה, שם או קטגוריה"
              value={catalogSearch}
              onChange={(event) =>
                setCatalogSearch(event.target.value)
              }
            />
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {filteredCatalogIssues.map((issue) => (
                <li key={issue.issue_id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-right hover:border-brand"
                    onClick={() => void addCatalogLine(issue)}
                    disabled={lineSaving}
                  >
                    <div className="font-medium">
                      {issue.issue_name_he}
                    </div>
                    <div className="text-zinc-500">
                      {issue.issue_id} · {issue.category_name_he}
                      {issue.standard_ref
                        ? ` · ${issue.standard_ref}`
                        : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.lines.length === 0 ? (
          <p className="text-sm text-zinc-500">אין שורות עדיין.</p>
        ) : (
          <ul className="space-y-3">
            {report.lines.map((line) => (
              <li
                key={line.id}
                className="rounded-xl border border-zinc-200 p-4 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {line.trade || "ללא מלאכה"}
                      {line.location ? ` · ${line.location}` : ""}
                    </p>
                    {line.issue_id ? (
                      <p className="text-xs text-zinc-500">
                        {line.issue_id}
                        {line.standard_ref
                          ? ` · תקן: ${line.standard_ref}`
                          : ""}
                        {line.severity
                          ? ` · חומרה: ${line.severity}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  {report.is_editable ? (
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={lineSaving}
                      onClick={() => void deleteLine(line.id)}
                    >
                      מחק
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap">
                  {line.description || "—"}
                </p>
                {line.notes ? (
                  <p className="mt-1 text-zinc-600">
                    הערות: {line.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {report.is_editable ? (
          <form
            onSubmit={(event) => void addFreeLine(event)}
            className="space-y-3 rounded-xl border border-dashed border-zinc-300 p-4"
          >
            <h3 className="font-medium">שורה חופשית</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>מיקום</span>
                <input
                  className="of-input w-full"
                  value={newLine.location}
                  onChange={(event) =>
                    setNewLine((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>מלאכה</span>
                <input
                  className="of-input w-full"
                  value={newLine.trade}
                  onChange={(event) =>
                    setNewLine((current) => ({
                      ...current,
                      trade: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>סטטוס</span>
                <select
                  className="of-input w-full"
                  value={newLine.status}
                  onChange={(event) =>
                    setNewLine((current) => ({
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
            </div>
            <label className="block space-y-1 text-sm">
              <span>תיאור *</span>
              <textarea
                className="of-input min-h-24 w-full"
                value={newLine.description}
                onChange={(event) =>
                  setNewLine((current) => ({
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
                value={newLine.notes}
                onChange={(event) =>
                  setNewLine((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <Button type="submit" disabled={lineSaving}>
              {lineSaving ? "שומר..." : "הוסף שורה חופשית"}
            </Button>
          </form>
        ) : null}
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function HeaderField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="of-input w-full"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function normalizeHeaderFields(
  fields: Record<string, unknown>
) {
  return {
    site_address: stringField(fields.site_address),
    developer_name: stringField(fields.developer_name),
    developer_pm_name: stringField(fields.developer_pm_name),
    lawyer_name: stringField(fields.lawyer_name),
    accompanying_lawyer: stringField(fields.accompanying_lawyer),
    contractor_name: stringField(fields.contractor_name),
  };
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}
