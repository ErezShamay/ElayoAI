"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import CatalogIssuePicker, {
  type CatalogCategory,
  type CatalogFamily,
  type CatalogIssue,
} from "@/components/field-reports/CatalogIssuePicker";
import ReportBlocksManager from "@/components/field-reports/ReportBlocksManager";
import ReportFixedBlocksSection from "@/components/field-reports/ReportFixedBlocksSection";
import ReportProjectMetadataSection from "@/components/field-reports/ReportProjectMetadataSection";
import ReportStakeholdersSection from "@/components/field-reports/ReportStakeholdersSection";
import ReportLineEditor from "@/components/field-reports/ReportLineEditor";
import LineGroupSelector from "@/components/field-reports/LineGroupSelector";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useFieldReportModule } from "@/hooks/useFieldReportModule";
import { apiFetch } from "@/lib/api/client";
import { loadOfflineCatalogForVisitType } from "@/lib/field-reports/catalog-offline";
import {
  normalizeHeaderFields,
  patchHeaderFieldsBlocks,
  patchHeaderFieldsStakeholders,
  serializeHeaderFieldsForApi,
} from "@/lib/field-reports/header-fields";
import { saveReportMetadataDraft } from "@/lib/field-reports/report-metadata-draft";
import {
  defaultLineGroupSelection,
  lineGroupFieldsFromSelection,
  type LineGroupSelection,
} from "@/lib/field-reports/line-grouping";
import {
  FR_TOUCH_BUTTON,
  FR_TOUCH_INPUT,
  FR_TOUCH_NOTES,
  FR_TOUCH_TEXTAREA,
} from "@/lib/field-reports/touch-input-class";
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
  has_photo?: boolean;
  photo_url?: string | null;
  photo_ids?: string[];
  photos?: Array<{ id: string; url: string }>;
  catalog_warning?: string | null;
  group_key?: string | null;
  group_label_he?: string | null;
  block_id?: string | null;
};

type VisitReport = {
  id: string;
  project_id?: string;
  project_name?: string;
  visit_type: string;
  visit_type_label_he: string;
  status_label_he: string;
  status: string;
  visit_date: string;
  header_fields: Record<string, unknown>;
  catalog_version?: string | null;
  current_catalog_version?: string | null;
  catalog_sync?: {
    is_current?: boolean;
    message?: string | null;
  };
  lines: ReportLine[];
  line_count?: number;
  is_editable: boolean;
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
  const { status: moduleStatus } = useFieldReportModule();
  const organizationId = moduleStatus?.organization_id || "";
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "offline"
  >("idle");
  const [lineSaving, setLineSaving] = useState(false);
  const [error, setError] = useState("");
  const [headerFields, setHeaderFields] = useState(() =>
    normalizeHeaderFields(report.header_fields, report.visit_type, {
      lines: report.lines,
      visitDate: report.visit_date,
    })
  );
  const headerInitialized = useRef(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogFamilies, setCatalogFamilies] = useState<CatalogFamily[]>(
    []
  );
  const [catalogCategories, setCatalogCategories] = useState<
    CatalogCategory[]
  >([]);
  const [catalogIssues, setCatalogIssues] = useState<CatalogIssue[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [newLine, setNewLine] = useState({
    location: "",
    trade: "",
    status: "",
    description: "",
    notes: "",
  });
  const [pendingLineGroup, setPendingLineGroup] = useState<LineGroupSelection>(
    defaultLineGroupSelection()
  );

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
          body: JSON.stringify({
            header_fields: serializeHeaderFieldsForApi(headerFields),
          }),
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
      setSaveState("saved");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "שמירת פרטי הדוח נכשלה"
      );
      setSaveState("idle");
    } finally {
      setSaving(false);
    }
  }

  const debouncedSaveHeader = useDebouncedCallback(() => {
    if (!report.is_editable) {
      return;
    }

    if (!isOnline) {
      if (organizationId) {
        saveReportMetadataDraft(
          organizationId,
          report.id,
          serializeHeaderFieldsForApi(headerFields)
        );
      }
      setSaveState("offline");
      return;
    }

    void saveHeaderFields();
  }, 900);

  useEffect(() => {
    if (!report.is_editable) {
      return;
    }

    if (!headerInitialized.current) {
      headerInitialized.current = true;
      return;
    }

    setSaveState("saving");
    debouncedSaveHeader();
  }, [headerFields, report.is_editable, debouncedSaveHeader, isOnline]);

  function updateLinePhotosState(
    lineId: string,
    payload: {
      has_photo: boolean;
      photo_ids: string[];
      photos: Array<{ id: string; url: string }>;
      photo_url: string | null;
    }
  ) {
    onReportChange({
      ...report,
      lines: report.lines.map((line) =>
        line.id === lineId
          ? {
              ...line,
              has_photo: payload.has_photo,
              photo_ids: payload.photo_ids,
              photos: payload.photos,
              photo_url: payload.photo_url,
            }
          : line
      ),
    });
  }

  async function loadCatalog() {
    try {
      setCatalogLoading(true);

      if (!isOnline && organizationId) {
        const offlineCatalog = loadOfflineCatalogForVisitType(
          organizationId,
          report.visit_type
        );
        if (!offlineCatalog?.issues?.length) {
          throw new Error(
            "אין מפרט מקומי — הרץ «הכנה לא מקוון» כשיש רשת"
          );
        }
        applyCatalogPayload(offlineCatalog);
        setCatalogOpen(true);
        return;
      }

      const response = await apiFetch(
        `/field-reports/catalog?visit_type=${encodeURIComponent(report.visit_type)}`
      );

      if (!response.ok) {
        throw new Error("טעינת המפרט נכשלה");
      }

      applyCatalogPayload(await response.json());
      setCatalogOpen(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "טעינת המפרט נכשלה"
      );
    } finally {
      setCatalogLoading(false);
    }
  }

  function applyCatalogPayload(payload: {
    families?: CatalogFamily[];
    categories?: CatalogCategory[];
    issues?: CatalogIssue[];
  }) {
    setCatalogFamilies(payload.families || []);
    setCatalogCategories(payload.categories || []);
    setCatalogIssues(payload.issues || []);
  }

  const catalogLineWarnings = useMemo(
    () =>
      report.lines.filter((line) => Boolean(line.catalog_warning)).length,
    [report.lines]
  );

  const hasExplicitBlocks = useMemo(() => {
    const raw = report.header_fields?.blocks;
    return Array.isArray(raw) && raw.length > 0;
  }, [report.header_fields]);

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
            ...lineGroupFieldsFromSelection(pendingLineGroup),
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
      setPendingLineGroup(defaultLineGroupSelection());
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
          body: JSON.stringify({
            issue_id: issue.issue_id,
            ...lineGroupFieldsFromSelection(pendingLineGroup),
          }),
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

  async function saveLine(
    lineId: string,
    payload: Record<string, unknown>
  ) {
    if (!report.is_editable) {
      return;
    }

    try {
      setLineSaving(true);
      setError("");

      const response = await apiFetch(
        `/field-reports/visits/${report.id}/lines/${lineId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error?.message || body.message || "עדכון שורה נכשל"
        );
      }

      const updatedLine = await response.json();
      onReportChange({
        ...report,
        lines: report.lines.map((line) =>
          line.id === lineId ? { ...line, ...updatedLine } : line
        ),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "עדכון שורה נכשל");
    } finally {
      setLineSaving(false);
    }
  }

  async function convertLineToFreeText(lineId: string) {
    await saveLine(lineId, { issue_id: null });
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
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center gap-2.5 text-sm text-zinc-600">
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
        {saveState === "saving" ? (
          <span className="text-zinc-500">שומר פרטי כותרת...</span>
        ) : null}
        {saveState === "saved" ? (
          <span className="text-emerald-700">נשמר</span>
        ) : null}
        {saveState === "offline" ? (
          <span className="text-amber-800">נשמר במכשיר — יסונכרן ברשת</span>
        ) : null}
      </div>

      {report.catalog_sync?.is_current === false &&
      report.catalog_sync.message ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {report.catalog_sync.message}
        </p>
      ) : null}

      {catalogLineWarnings > 0 ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {catalogLineWarnings} שורות עם אזהרת מפרט — בדוק לפני סגירת הדוח.
        </p>
      ) : null}

      <ReportProjectMetadataSection
        metadata={headerFields.project_metadata}
        disabled={!report.is_editable}
        onChange={(project_metadata) =>
          setHeaderFields((current) => ({
            ...current,
            project_metadata,
          }))
        }
      />

      <ReportStakeholdersSection
        stakeholders={headerFields.stakeholders}
        mainSuppliers={headerFields.main_suppliers}
        disabled={!report.is_editable}
        projectId={report.project_id}
        onChange={({ stakeholders, main_suppliers }) =>
          setHeaderFields((current) =>
            patchHeaderFieldsStakeholders(
              current,
              { stakeholders, main_suppliers },
              report.visit_type
            )
          )
        }
      />

      <section className="space-y-4 rounded-xl border border-zinc-200 p-4 md:p-5">
        <h2 className="text-lg font-semibold">פרטי כותרת הדוח</h2>
        <div className="grid gap-3 md:grid-cols-2">
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
        </div>
        {report.is_editable ? (
          <Button
            variant="secondary"
            size="lg"
            className={FR_TOUCH_BUTTON}
            disabled={saving || !isOnline}
            onClick={() => void saveHeaderFields()}
          >
            {saving ? "שומר..." : "שמור עכשיו"}
          </Button>
        ) : null}
      </section>

      <ReportBlocksManager
        blocks={headerFields.blocks}
        visitType={report.visit_type}
        disabled={!report.is_editable}
        hasExplicitBlocks={hasExplicitBlocks}
        onChange={(blocks) =>
          setHeaderFields((current) =>
            patchHeaderFieldsBlocks(current, blocks, report.visit_type)
          )
        }
      />

      <ReportFixedBlocksSection
        fields={headerFields}
        visitType={report.visit_type}
        visitDate={report.visit_date}
        disabled={!report.is_editable}
        onChange={setHeaderFields}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            שורות ממצאים ({report.lines.length})
          </h2>
          {report.is_editable ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="lg"
                className={`w-full sm:w-auto ${FR_TOUCH_BUTTON}`}
                disabled={catalogLoading || lineSaving}
                onClick={() => void loadCatalog()}
              >
                {catalogLoading ? "טוען מפרט..." : "בחר ממצא מהמפרט"}
              </Button>
            </div>
          ) : null}
        </div>

        {report.is_editable ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              קיבוץ לשורות חדשות
            </p>
            <LineGroupSelector
              value={pendingLineGroup}
              disabled={lineSaving}
              onChange={setPendingLineGroup}
            />
          </div>
        ) : null}

        {catalogOpen ? (
          <CatalogIssuePicker
            families={catalogFamilies}
            categories={catalogCategories}
            issues={catalogIssues}
            disabled={lineSaving}
            onClose={() => setCatalogOpen(false)}
            onConfirm={(issue) => void addCatalogLine(issue)}
          />
        ) : null}

        {report.lines.length === 0 ? (
          <p className="text-sm text-zinc-500">אין שורות עדיין.</p>
        ) : (
          <ul className="space-y-3">
            {report.lines.map((line) => (
              <ReportLineEditor
                key={line.id}
                reportId={report.id}
                line={line}
                editable={report.is_editable}
                saving={lineSaving}
                onSave={saveLine}
                onConvertToFreeText={convertLineToFreeText}
                onDelete={deleteLine}
                onPhotosChange={updateLinePhotosState}
              />
            ))}
          </ul>
        )}

        {report.is_editable ? (
          <form
            onSubmit={(event) => void addFreeLine(event)}
            className="space-y-3 rounded-xl border border-dashed border-zinc-300 p-4 md:space-y-4 md:p-5"
          >
            <h3 className="font-medium">שורה חופשית</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>מיקום</span>
                <input
                  className={FR_TOUCH_INPUT}
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
                  className={FR_TOUCH_INPUT}
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
                  className={FR_TOUCH_INPUT}
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
                className={FR_TOUCH_TEXTAREA}
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
                className={FR_TOUCH_NOTES}
                value={newLine.notes}
                onChange={(event) =>
                  setNewLine((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <Button
              type="submit"
              size="lg"
              className={`w-full sm:w-auto ${FR_TOUCH_BUTTON}`}
              disabled={lineSaving}
            >
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
        className={FR_TOUCH_INPUT}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

